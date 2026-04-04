import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import { z } from "zod";

export const pricesRouter = createTRPCRouter({
  /**
   * Price history for a single card, ready for chart rendering.
   * Returns an array of { date, marketPrice, lowPrice, highPrice, volume, variant }
   * ordered oldest → newest.
   */
  history: publicProcedure
    .input(
      z.object({
        cardId: z.string(),
        /** Number of days of history to return. Defaults to 365 (1 year). */
        days: z.number().int().min(1).max(1825).default(365),
        /** If set, only return prices for this variant. */
        variant: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - input.days);

      const prices = await ctx.db.cardPrice.findMany({
        where: {
          cardId: input.cardId,
          date: { gte: cutoff },
          ...(input.variant && { variant: input.variant }),
        },
        orderBy: [{ date: "asc" }, { variant: "asc" }],
        select: {
          date: true,
          variant: true,
          marketPrice: true,
          lowPrice: true,
          midPrice: true,
          highPrice: true,
          psa10Price: true,
          psa9Price: true,
          rawPrice: true,
          volume: true,
        },
      });

      // Group by variant for multi-line chart support
      const byVariant: Record<string, typeof prices> = {};
      for (const p of prices) {
        if (!byVariant[p.variant]) byVariant[p.variant] = [];
        byVariant[p.variant].push(p);
      }

      return { prices, byVariant };
    }),

  /** Latest price snapshot for multiple cards (for batch lookups). */
  latestBatch: publicProcedure
    .input(z.object({ cardIds: z.array(z.string()).max(100) }))
    .query(async ({ ctx, input }) => {
      // For each card, get the most recent price row
      const results = await Promise.all(
        input.cardIds.map((cardId) =>
          ctx.db.cardPrice.findFirst({
            where: { cardId },
            orderBy: { date: "desc" },
            select: {
              cardId: true,
              date: true,
              variant: true,
              marketPrice: true,
              lowPrice: true,
              highPrice: true,
              psa10Price: true,
              psa9Price: true,
              rawPrice: true,
              volume: true,
            },
          })
        )
      );

      // Return as a map cardId → latest price
      const map: Record<string, (typeof results)[0]> = {};
      for (const r of results) {
        if (r) map[r.cardId] = r;
      }
      return map;
    }),
});
