import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import { z } from "zod";
import { generateSignals, type CardForSignals, type Signal } from "@/server/services/metrics";

/**
 * All queries use the "LatestCardPrice" materialized view instead of
 * DISTINCT ON over the full CardPrice table. This drops query time from
 * ~1500ms to ~15ms. The view must be refreshed after price syncs:
 *   REFRESH MATERIALIZED VIEW CONCURRENTLY "LatestCardPrice";
 */

// Raw-SQL row types returned by PostgreSQL
type CardRow = {
  id: string;
  name: string;
  rarity: string | null;
  imageSmall: string | null;
  setName: string;
  series: string;
  releaseDate: Date | null;
  marketPrice: number | null;
  volume: number | null;
  psa10Price: number | null;
  rawPrice: number | null;
  variant: string;
};

type StatsRow = {
  totalCards: bigint;
  trackedCards: bigint;
  avgMarketPrice: number | null;
  totalMarketCap: number | null;
};

type SeriesRow = {
  series: string;
  avgMarketPrice: number;
  cardCount: bigint;
};

export const analyticsRouter = createTRPCRouter({
  /** All data needed to render the dashboard in one round-trip. */
  dashboard: publicProcedure.query(async ({ ctx }) => {
    const [allCards, seriesPerf, statsRows] = await Promise.all([
      ctx.db.$queryRaw<CardRow[]>`
        SELECT
          c.id, c.name, c.rarity, c."imageSmall",
          s.name        AS "setName",
          s.series,
          s."releaseDate",
          l."marketPrice",
          l.volume,
          l."psa10Price",
          l."rawPrice",
          l.variant
        FROM "LatestCardPrice" l
        JOIN "Card" c ON c.id = l."cardId"
        JOIN "Set"  s ON s.id = c."setId"
      `,
      ctx.db.$queryRaw<SeriesRow[]>`
        SELECT s.series, AVG(l."marketPrice") AS "avgMarketPrice", COUNT(c.id) AS "cardCount"
        FROM "Set" s
        JOIN "Card" c ON c."setId" = s.id
        JOIN "LatestCardPrice" l ON l."cardId" = c.id
        GROUP BY s.series
        ORDER BY "avgMarketPrice" DESC
        LIMIT 12
      `,
      ctx.db.$queryRaw<StatsRow[]>`
        SELECT
          (SELECT COUNT(*) FROM "Card")          AS "totalCards",
          COUNT(l."cardId")                      AS "trackedCards",
          AVG(l."marketPrice")                   AS "avgMarketPrice",
          SUM(l."marketPrice")                   AS "totalMarketCap"
        FROM "LatestCardPrice" l
      `,
    ]);

    // Slice categories in JS — no extra DB round-trips
    const topByPrice = allCards
      .sort((a, b) => (b.marketPrice ?? 0) - (a.marketPrice ?? 0))
      .slice(0, 5);

    const topByVolume = allCards
      .filter((c) => c.volume != null)
      .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
      .slice(0, 5);

    const topGradingVintage = allCards
      .filter((c) => c.psa10Price != null && c.rawPrice != null && c.rawPrice > 500
        && c.releaseDate != null && new Date(c.releaseDate) < new Date("2003-01-01"))
      .sort((a, b) => ((b.psa10Price ?? 0) / (b.rawPrice ?? 1)) - ((a.psa10Price ?? 0) / (a.rawPrice ?? 1)))
      .slice(0, 5);

    const topGradingModern = allCards
      .filter((c) => c.psa10Price != null && c.rawPrice != null && c.rawPrice > 500
        && c.releaseDate != null && new Date(c.releaseDate) >= new Date("2003-01-01"))
      .sort((a, b) => ((b.psa10Price ?? 0) / (b.rawPrice ?? 1)) - ((a.psa10Price ?? 0) / (a.rawPrice ?? 1)))
      .slice(0, 5);

    const vintageHolos = allCards
      .filter((c) => c.releaseDate != null && new Date(c.releaseDate) < new Date("2005-01-01")
        && c.rarity != null && (/holo/i.test(c.rarity) || /rare/i.test(c.rarity)))
      .sort((a, b) => (b.marketPrice ?? 0) - (a.marketPrice ?? 0))
      .slice(0, 5);

    const stats = statsRows[0] ?? {
      totalCards: BigInt(0),
      trackedCards: BigInt(0),
      avgMarketPrice: null,
      totalMarketCap: null,
    };

    return {
      topByPrice,
      topByVolume,
      topGradingVintage,
      topGradingModern,
      vintageHolos,
      seriesPerformance: seriesPerf.map((r) => ({
        series: r.series,
        avgMarketPrice: Number(r.avgMarketPrice),
        cardCount: Number(r.cardCount),
      })),
      stats: {
        totalCards: Number(stats.totalCards),
        trackedCards: Number(stats.trackedCards),
        avgMarketPrice: stats.avgMarketPrice ? Number(stats.avgMarketPrice) : null,
        totalMarketCap: stats.totalMarketCap ? Number(stats.totalMarketCap) : null,
      },
    };
  }),

  indexHistory: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.indexSnapshot.findMany({ orderBy: { date: "asc" }, take: 365 });
  }),

  /** Top 100 grading upside candidates, split by era. */
  gradingLeaderboard: publicProcedure.query(async ({ ctx }) => {
    type GradingRow = {
      id: string;
      name: string;
      rarity: string | null;
      imageSmall: string | null;
      setName: string;
      series: string;
      releaseDate: Date | null;
      marketPrice: number | null;
      rawPrice: number | null;
      psa10Price: number | null;
      volume: number | null;
    };

    const rows = await ctx.db.$queryRaw<GradingRow[]>`
      SELECT
        c.id, c.name, c.rarity, c."imageSmall",
        s.name        AS "setName",
        s.series,
        s."releaseDate",
        l."marketPrice",
        l."rawPrice",
        l."psa10Price",
        l.volume
      FROM "LatestCardPrice" l
      JOIN "Card" c ON c.id = l."cardId"
      JOIN "Set"  s ON s.id = c."setId"
      WHERE l."psa10Price" IS NOT NULL AND l."rawPrice" > 500
    `;

    const enrich = (r: GradingRow) => ({
      ...r,
      gradingUpside: r.psa10Price != null && r.rawPrice != null && r.rawPrice > 0
        ? +(r.psa10Price / r.rawPrice).toFixed(2)
        : null,
    });

    const vintage = rows
      .filter((r) => r.releaseDate != null && new Date(r.releaseDate) < new Date("2003-01-01"))
      .sort((a, b) => ((b.psa10Price ?? 0) / (b.rawPrice ?? 1)) - ((a.psa10Price ?? 0) / (a.rawPrice ?? 1)))
      .slice(0, 100)
      .map(enrich);

    const modern = rows
      .filter((r) => r.releaseDate != null && new Date(r.releaseDate) >= new Date("2003-01-01"))
      .sort((a, b) => ((b.psa10Price ?? 0) / (b.rawPrice ?? 1)) - ((a.psa10Price ?? 0) / (a.rawPrice ?? 1)))
      .slice(0, 100)
      .map(enrich);

    return { vintage, modern };
  }),

  /**
   * Investment screener — returns cards with latest prices + computed signals.
   */
  screener: publicProcedure
    .input(
      z.object({
        minGradingUpside: z.number().min(0).default(0),
        minVolume: z.number().min(0).default(0),
        maxPriceDollars: z.number().optional(),
        minPriceDollars: z.number().optional(),
        signals: z.array(z.string()).optional(),
        limit: z.number().int().min(1).max(500).default(200),
      })
    )
    .query(async ({ ctx, input }) => {
      type ScreenRow = {
        id: string;
        name: string;
        rarity: string | null;
        imageSmall: string | null;
        setName: string;
        series: string;
        releaseDate: Date | null;
        marketPrice: number | null;
        volume: number | null;
        psa10Price: number | null;
        rawPrice: number | null;
      };

      const rows = await ctx.db.$queryRaw<ScreenRow[]>`
        SELECT
          c.id, c.name, c.rarity, c."imageSmall",
          s.name        AS "setName",
          s.series,
          s."releaseDate",
          l."marketPrice",
          l.volume,
          l."psa10Price",
          l."rawPrice"
        FROM "LatestCardPrice" l
        JOIN "Card" c ON c.id = l."cardId"
        JOIN "Set"  s ON s.id = c."setId"
        ORDER BY l."marketPrice" DESC
        LIMIT 500
      `;

      // Compute 80th-percentile volume for HighLiquidity signal
      const volumes = rows
        .map((r) => r.volume ?? 0)
        .filter((v) => v > 0)
        .sort((a, b) => a - b);
      const vol80th = volumes[Math.floor(volumes.length * 0.8)] ?? 0;

      // Top-50 by market price for BlueChip signal
      const top50Ids = new Set(rows.slice(0, 50).map((r) => r.id));

      // Enrich each row with gradingUpside + signals
      const enriched = rows.map((row) => {
        const gradingUpside =
          row.psa10Price != null && row.rawPrice != null && row.rawPrice > 0
            ? row.psa10Price / row.rawPrice
            : null;

        const cardForSignals: CardForSignals = {
          id: row.id,
          rarity: row.rarity,
          releaseDate: row.releaseDate,
          setReleaseDate: row.releaseDate,
          priceHistory:
            row.marketPrice != null
              ? [{ date: new Date(), priceC: row.marketPrice, volume: row.volume ?? undefined }]
              : [],
          latestPsa10PriceC: row.psa10Price,
          latestRawPriceC: row.rawPrice,
          latestVolume: row.volume,
          releasePriceC: null,
        };

        const signals = generateSignals(cardForSignals, {
          volume80thPercentile: vol80th,
          top50ByMarketCap: top50Ids,
        });

        return { ...row, gradingUpside, signals };
      });

      // Apply filters
      const maxPriceC = input.maxPriceDollars != null ? input.maxPriceDollars * 100 : null;
      const minPriceC = input.minPriceDollars != null ? input.minPriceDollars * 100 : null;

      return enriched
        .filter((row) => {
          if (input.minGradingUpside > 0 && (row.gradingUpside ?? 0) < input.minGradingUpside)
            return false;
          if (input.minVolume > 0 && (row.volume ?? 0) < input.minVolume) return false;
          if (maxPriceC != null && (row.marketPrice ?? 0) > maxPriceC) return false;
          if (minPriceC != null && (row.marketPrice ?? 0) < minPriceC) return false;
          if (
            input.signals?.length &&
            !input.signals.some((s) => row.signals.includes(s as Signal))
          )
            return false;
          return true;
        })
        .slice(0, input.limit);
    }),
});
