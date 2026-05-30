import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, adminProcedure } from "@/lib/trpc";
import { voterHash, isSpam } from "@/lib/utils/voter";
import {
  parseChannelInput,
  fetchYouTubeChannels,
  fetchYouTubeByHandle,
  type YTChannelStats,
} from "@/lib/api/youtube";

const CATEGORIES = [
  "YOUTUBER", "SOCIAL_CREATOR", "STREAMER_BREAKER", "INVESTOR_X", "PODCAST",
  "MARKETPLACE", "LGS", "GROUP_BREAK", "GRADING", "AUTHENTICATION",
  "TOOL_SITE", "NEWS_BLOG", "COMMUNITY",
] as const;

const SUBMIT_LIMIT_PER_HOUR = 3;

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

function fingerprint(headers: Headers): string {
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = headers.get("user-agent") ?? "";
  return voterHash(ip, ua, new Date());
}

export const creatorsRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        category: z.enum(CATEGORIES).optional(),
        sort: z.enum(["heat", "votes", "newest"]).default("heat"),
      })
    )
    .query(async ({ ctx, input }) => {
      const orderBy =
        input.sort === "votes"
          ? { voteScore: "desc" as const }
          : input.sort === "newest"
            ? { createdAt: "desc" as const }
            : { heatScore: "desc" as const };

      return ctx.db.entry.findMany({
        where: { status: "live", ...(input.category ? { category: input.category } : {}) },
        orderBy,
        include: { links: true },
        take: 200,
      });
    }),

  byId: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const entry = await ctx.db.entry.findUnique({
        where: { slug: input.slug },
        include: {
          links: true,
          metrics: { orderBy: { date: "asc" }, take: 90 },
          calls: {
            orderBy: { calledAt: "desc" },
            take: 50,
            include: { card: { select: { id: true, name: true, imageSmall: true } } },
          },
        },
      });
      if (!entry || entry.status !== "live") {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return entry;
    }),

  submit: publicProcedure
    .input(
      z.object({
        name: z.string().min(2).max(80),
        category: z.enum(CATEGORIES),
        bio: z.string().max(500).optional(),
        youtubeUrl: z.string().url().optional(),
        links: z
          .array(z.object({ platform: z.string().min(1), url: z.string().url() }))
          .max(8)
          .default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (isSpam(`${input.name} ${input.bio ?? ""}`)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Submission flagged as spam" });
      }

      const submitterHash = fingerprint(ctx.headers);
      const since = new Date(Date.now() - 60 * 60 * 1000); // last hour
      const recent = await ctx.db.entry.count({
        where: { submitterHash, createdAt: { gte: since } },
      });
      if (recent >= SUBMIT_LIMIT_PER_HOUR) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Slow down — try again later" });
      }

      // Resolve a YouTube channel id + avatar when a YouTube URL is provided.
      // Both /channel/UC… (id) and @handle forms are supported so the most
      // common paste format still unlocks Heat tracking. Failure is non-fatal —
      // the entry still saves, just without YouTube signal.
      let youtubeChannelId: string | null = null;
      let avatarUrl: string | null = null;
      let ytSubscribers: number | null = null;
      if (input.youtubeUrl) {
        const parsed = parseChannelInput(input.youtubeUrl);
        let stat: YTChannelStats | null = null;
        if (parsed.kind === "id") {
          stat = (await fetchYouTubeChannels([parsed.value]))[0] ?? null;
        } else if (parsed.kind === "handle") {
          stat = await fetchYouTubeByHandle(parsed.value);
        }
        if (stat) {
          youtubeChannelId = stat.channelId;
          avatarUrl = stat.avatarUrl;
          ytSubscribers = stat.subscribers;
        }
      }

      // Ensure a unique slug.
      let slug = slugify(input.name) || `entry-${Date.now()}`;
      if (await ctx.db.entry.findUnique({ where: { slug } })) {
        slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      }

      const links = [...input.links];
      if (input.youtubeUrl) links.push({ platform: "youtube", url: input.youtubeUrl });

      return ctx.db.entry.create({
        data: {
          slug,
          name: input.name,
          category: input.category,
          bio: input.bio,
          avatarUrl,
          youtubeChannelId,
          ytSubscribers,
          submitterHash,
          links: { create: links },
        },
        include: { links: true },
      });
    }),

  vote: publicProcedure
    .input(z.object({ entryId: z.string(), value: z.union([z.literal(1), z.literal(-1)]) }))
    .mutation(async ({ ctx, input }) => {
      const voter = fingerprint(ctx.headers);

      const existing = await ctx.db.entry.findUnique({
        where: { id: input.entryId },
        select: { status: true },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      // Upsert this voter's vote; recompute the denormalized score from scratch.
      await ctx.db.entryVote.upsert({
        where: { entryId_voterHash: { entryId: input.entryId, voterHash: voter } },
        update: { value: input.value },
        create: { entryId: input.entryId, voterHash: voter, value: input.value },
      });

      const agg = await ctx.db.entryVote.aggregate({
        where: { entryId: input.entryId },
        _sum: { value: true },
      });
      const voteScore = agg._sum.value ?? 0;

      // Downvote-bury: auto-hide entries the community pushes to -3 or below.
      // An admin hide ("admin_hidden") is sticky — votes never resurrect it.
      const status =
        existing.status === "admin_hidden"
          ? "admin_hidden"
          : voteScore <= -3
            ? "hidden"
            : "live";
      await ctx.db.entry.update({
        where: { id: input.entryId },
        data: { voteScore, status },
      });

      return { voteScore, status };
    }),

  logCall: publicProcedure
    .input(
      z.object({
        entryId: z.string(),
        cardId: z.string(),
        direction: z.literal("bullish").default("bullish"),
        sourceUrl: z.string().url().optional(),
        calledAt: z.date().default(() => new Date()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only allow calls against a real, live entry and a real card — avoids
      // banking junk rows (and a raw FK 500) from arbitrary client input.
      const entry = await ctx.db.entry.findUnique({
        where: { id: input.entryId },
        select: { status: true },
      });
      if (!entry || entry.status !== "live") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Entry not found" });
      }
      const card = await ctx.db.card.findUnique({
        where: { id: input.cardId },
        select: { id: true },
      });
      if (!card) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown card" });
      }

      // Bank the price snapshot at call time (Phase 2 grades against forward prices).
      const latest = await ctx.db.cardPrice.findFirst({
        where: { cardId: input.cardId },
        orderBy: { date: "desc" },
        select: { marketPrice: true },
      });

      return ctx.db.creatorCall.create({
        data: {
          entryId: input.entryId,
          cardId: input.cardId,
          direction: input.direction,
          sourceUrl: input.sourceUrl,
          calledAt: input.calledAt,
          priceAtCallC: latest?.marketPrice ?? null,
        },
      });
    }),

  // ── Admin ──────────────────────────────────────────────────────────────────
  adminList: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.entry.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  }),

  adminSetStatus: adminProcedure
    .input(z.object({ entryId: z.string(), status: z.enum(["live", "hidden"]) }))
    .mutation(async ({ ctx, input }) => {
      // Store admin hides as a distinct "admin_hidden" so community votes can't
      // resurrect them (the vote handler treats that status as sticky).
      return ctx.db.entry.update({
        where: { id: input.entryId },
        data: { status: input.status === "hidden" ? "admin_hidden" : "live" },
      });
    }),
});
