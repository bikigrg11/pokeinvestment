import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import { z } from "zod";

export const setsRouter = createTRPCRouter({
  /** All sets with card count, sorted by release date desc. */
  list: publicProcedure
    .input(
      z.object({
        series: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.set.findMany({
        where: input?.series ? { series: input.series } : undefined,
        orderBy: { releaseDate: "desc" },
        include: {
          _count: { select: { cards: true } },
        },
      });
    }),

  /** Single set with its cards and latest price per card. */
  byId: publicProcedure
    .input(
      z.object({
        id: z.string(),
        cardPage: z.number().int().min(1).default(1),
        cardLimit: z.number().int().min(1).max(250).default(100),
        sortBy: z.enum(["name", "number", "marketPrice", "rarity"]).default("number"),
        sortDir: z.enum(["asc", "desc"]).default("asc"),
      })
    )
    .query(async ({ ctx, input }) => {
      const set = await ctx.db.set.findUnique({
        where: { id: input.id },
      });
      if (!set) return null;

      const [cards, total] = await Promise.all([
        ctx.db.card.findMany({
          where: { setId: input.id },
          skip: (input.cardPage - 1) * input.cardLimit,
          take: input.cardLimit,
          include: {
            prices: { orderBy: { date: "desc" }, take: 1 },
          },
          orderBy:
            input.sortBy === "marketPrice"
              ? { name: "asc" } // price sort handled client-side
              : input.sortBy === "rarity"
              ? { rarity: input.sortDir }
              : input.sortBy === "number"
              ? { cardNumber: input.sortDir }
              : { name: input.sortDir },
        }),
        ctx.db.card.count({ where: { setId: input.id } }),
      ]);

      return { set, cards, total, page: input.cardPage, limit: input.cardLimit };
    }),

  /** Top sets by avg market price — used for the bar chart on the Sets page. */
  performance: publicProcedure.query(async ({ ctx }) => {
    type SetPerfRow = {
      id: string;
      name: string;
      series: string;
      logoUrl: string | null;
      releaseDate: Date | null;
      avgMarketPrice: number;
      cardCount: bigint;
    };

    return ctx.db.$queryRaw<SetPerfRow[]>`
      WITH latest AS (
        SELECT DISTINCT ON ("cardId") "cardId", "marketPrice"
        FROM "CardPrice"
        WHERE "marketPrice" IS NOT NULL
        ORDER BY "cardId", date DESC
      )
      SELECT
        s.id,
        s.name,
        s.series,
        s."logoUrl",
        s."releaseDate",
        AVG(l."marketPrice")  AS "avgMarketPrice",
        COUNT(c.id)           AS "cardCount"
      FROM "Set" s
      JOIN "Card" c ON c."setId" = s.id
      JOIN latest  l ON l."cardId" = c.id
      GROUP BY s.id
      ORDER BY "avgMarketPrice" DESC
      LIMIT 20
    `;
  }),

  /** Unique series names (for filter dropdown). */
  series: publicProcedure.query(async ({ ctx }) => {
    const sets = await ctx.db.set.findMany({
      select: { series: true },
      distinct: ["series"],
      orderBy: { series: "asc" },
    });
    return sets.map((s) => s.series);
  }),
});
