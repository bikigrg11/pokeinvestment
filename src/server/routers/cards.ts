import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import { z } from "zod";

const SortField = z.enum(["name", "marketPrice", "rarity", "set", "change"]);
const SortDir = z.enum(["asc", "desc"]);

export const cardsRouter = createTRPCRouter({
  /** Paginated, filterable, sortable card list. */
  list: publicProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(250).default(50),
        // filters
        q: z.string().optional(),
        setId: z.string().optional(),
        rarity: z.string().optional(),
        supertype: z.string().optional(),
        type: z.string().optional(),
        minPriceCents: z.number().int().optional(),
        maxPriceCents: z.number().int().optional(),
        // sort
        sortBy: SortField.optional().default("marketPrice"),
        sortDir: SortDir.optional().default("desc"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, q, setId, rarity, supertype, type } = input;

      const where = {
        ...(q && {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { pokemon: { contains: q, mode: "insensitive" as const } },
          ],
        }),
        ...(setId && { setId }),
        ...(rarity && { rarity }),
        ...(supertype && { supertype }),
        ...(type && { types: { has: type } }),
        // price filter is applied post-query (latest price may vary by variant)
      };

      const [cards, total] = await Promise.all([
        ctx.db.card.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            set: true,
            prices: {
              orderBy: { date: "desc" },
              take: 2, // latest + one prior for change calc
            },
          },
          orderBy:
            input.sortBy === "name"
              ? { name: input.sortDir }
              : input.sortBy === "set"
              ? { set: { name: input.sortDir } }
              : { name: "asc" }, // price sorting handled client-side via latest price
        }),
        ctx.db.card.count({ where }),
      ]);

      // Apply price range filter and attach latestPrice for sorting
      const enriched = cards
        .map((card) => {
          const latest = card.prices[0];
          const prior = card.prices[1];
          const latestPrice = latest?.marketPrice ?? null;
          const change =
            latest?.marketPrice && prior?.marketPrice
              ? ((latest.marketPrice - prior.marketPrice) / prior.marketPrice) * 100
              : null;
          return { ...card, latestPrice, priceChange: change };
        })
        .filter((card) => {
          if (input.minPriceCents != null && (card.latestPrice ?? 0) < input.minPriceCents)
            return false;
          if (input.maxPriceCents != null && (card.latestPrice ?? 0) > input.maxPriceCents)
            return false;
          return true;
        });

      return { cards: enriched, total, page, limit };
    }),

  /** Full-text search — returns up to `limit` cards for typeahead / search bar. */
  search: publicProcedure
    .input(
      z.object({
        q: z.string().min(1),
        limit: z.number().int().min(1).max(50).default(10),
        setId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.card.findMany({
        where: {
          OR: [
            { name: { contains: input.q, mode: "insensitive" } },
            { pokemon: { contains: input.q, mode: "insensitive" } },
          ],
          ...(input.setId && { setId: input.setId }),
        },
        take: input.limit,
        include: {
          set: { select: { id: true, name: true, series: true } },
          prices: { orderBy: { date: "desc" }, take: 1 },
        },
        orderBy: { name: "asc" },
      });
    }),

  /** Single card with full metadata + last 365 days of price history. */
  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 2); // 2 years matches seed-history depth

      const card = await ctx.db.card.findUnique({
        where: { id: input.id },
        include: {
          set: true,
          prices: {
            where: { date: { gte: cutoff } },
            orderBy: { date: "asc" },
          },
        },
      });

      if (!card) return null;

      // Summarise latest prices by variant
      const variantMap = new Map<string, (typeof card.prices)[0]>();
      // prices are asc by date, so last one per variant wins
      for (const price of card.prices) {
        variantMap.set(price.variant, price);
      }

      return {
        ...card,
        latestByVariant: Object.fromEntries(variantMap),
      };
    }),
});
