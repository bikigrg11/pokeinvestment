import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import { z } from "zod";
import { generateSignals, type CardForSignals, type Signal } from "@/server/services/metrics";

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

type SeriesRow = {
  series: string;
  avgMarketPrice: number;
  cardCount: bigint;
};

type StatsRow = {
  totalCards: bigint;
  trackedCards: bigint;
  avgMarketPrice: number | null;
  totalMarketCap: number | null;
};

export const analyticsRouter = createTRPCRouter({
  /** All data needed to render the dashboard in one round-trip. */
  dashboard: publicProcedure.query(async ({ ctx }) => {
    // Latest price per card using DISTINCT ON (PostgreSQL-specific)
    const base = `
      WITH latest AS (
        SELECT DISTINCT ON ("cardId")
          "cardId", "marketPrice", volume, "psa10Price", "rawPrice", variant
        FROM "CardPrice"
        WHERE "marketPrice" IS NOT NULL
        ORDER BY "cardId", date DESC
      )
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
      FROM latest l
      JOIN "Card" c ON c.id = l."cardId"
      JOIN "Set"  s ON s.id = c."setId"
    `;

    const [topByPrice, topByVolume, topGradingVintage, topGradingModern, vintageHolos, seriesPerf, statsRows] =
      await Promise.all([
        // Top 5 by market price
        ctx.db.$queryRawUnsafe<CardRow[]>(
          `${base} ORDER BY l."marketPrice" DESC LIMIT 5`
        ),
        // Top 5 by volume
        ctx.db.$queryRawUnsafe<CardRow[]>(
          `${base} AND l.volume IS NOT NULL ORDER BY l.volume DESC LIMIT 5`
        ),
        // Top 5 vintage grading upside (pre-2003, psa10/raw ratio)
        ctx.db.$queryRawUnsafe<CardRow[]>(
          `${base}
           AND l."psa10Price" IS NOT NULL AND l."rawPrice" > 500
           AND s."releaseDate" < '2003-01-01'
           ORDER BY (l."psa10Price"::float / l."rawPrice") DESC LIMIT 5`
        ),
        // Top 5 modern grading upside (2003+, psa10/raw ratio)
        ctx.db.$queryRawUnsafe<CardRow[]>(
          `${base}
           AND l."psa10Price" IS NOT NULL AND l."rawPrice" > 500
           AND s."releaseDate" >= '2003-01-01'
           ORDER BY (l."psa10Price"::float / l."rawPrice") DESC LIMIT 5`
        ),
        // Top 5 vintage holos (pre-2005, rarity contains "Holo" or "Rare")
        ctx.db.$queryRawUnsafe<CardRow[]>(
          `${base}
           AND s."releaseDate" < '2005-01-01'
           AND (c.rarity ILIKE '%holo%' OR c.rarity ILIKE '%rare%')
           ORDER BY l."marketPrice" DESC LIMIT 5`
        ),
        // Average price by series for bar chart
        ctx.db.$queryRaw<SeriesRow[]>`
          WITH latest AS (
            SELECT DISTINCT ON ("cardId") "cardId", "marketPrice"
            FROM "CardPrice" WHERE "marketPrice" IS NOT NULL
            ORDER BY "cardId", date DESC
          )
          SELECT s.series, AVG(l."marketPrice") AS "avgMarketPrice", COUNT(c.id) AS "cardCount"
          FROM "Set" s
          JOIN "Card" c ON c."setId" = s.id
          JOIN latest l ON l."cardId" = c.id
          GROUP BY s.series
          ORDER BY "avgMarketPrice" DESC
          LIMIT 12
        `,
        // Summary stats
        ctx.db.$queryRaw<StatsRow[]>`
          WITH latest AS (
            SELECT DISTINCT ON ("cardId") "cardId", "marketPrice"
            FROM "CardPrice" WHERE "marketPrice" IS NOT NULL
            ORDER BY "cardId", date DESC
          )
          SELECT
            (SELECT COUNT(*) FROM "Card")          AS "totalCards",
            COUNT(l."cardId")                      AS "trackedCards",
            AVG(l."marketPrice")                   AS "avgMarketPrice",
            SUM(l."marketPrice")                   AS "totalMarketCap"
          FROM latest l
        `,
      ]);

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

    const base = `
      WITH latest AS (
        SELECT DISTINCT ON ("cardId")
          "cardId", "marketPrice", volume, "psa10Price", "rawPrice"
        FROM "CardPrice"
        WHERE "marketPrice" IS NOT NULL
          AND "psa10Price" IS NOT NULL
          AND "rawPrice" > 500
        ORDER BY "cardId", date DESC
      )
      SELECT
        c.id, c.name, c.rarity, c."imageSmall",
        s.name        AS "setName",
        s.series,
        s."releaseDate",
        l."marketPrice",
        l."rawPrice",
        l."psa10Price",
        l.volume
      FROM latest l
      JOIN "Card" c ON c.id = l."cardId"
      JOIN "Set"  s ON s.id = c."setId"
    `;

    const [vintage, modern] = await Promise.all([
      ctx.db.$queryRawUnsafe<GradingRow[]>(
        `${base} AND s."releaseDate" < '2003-01-01'
         ORDER BY (l."psa10Price"::float / l."rawPrice") DESC LIMIT 100`
      ),
      ctx.db.$queryRawUnsafe<GradingRow[]>(
        `${base} AND s."releaseDate" >= '2003-01-01'
         ORDER BY (l."psa10Price"::float / l."rawPrice") DESC LIMIT 100`
      ),
    ]);

    const enrich = (rows: GradingRow[]) =>
      rows.map((r) => ({
        ...r,
        gradingUpside: r.psa10Price != null && r.rawPrice != null && r.rawPrice > 0
          ? +(r.psa10Price / r.rawPrice).toFixed(2)
          : null,
      }));

    return { vintage: enrich(vintage), modern: enrich(modern) };
  }),

  /**
   * Investment screener — returns cards with latest prices + computed signals.
   * Fetches up to 500 cards server-side, computes signals in-memory, filters, returns.
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
        WITH latest AS (
          SELECT DISTINCT ON ("cardId")
            "cardId", "marketPrice", volume, "psa10Price", "rawPrice"
          FROM "CardPrice"
          WHERE "marketPrice" IS NOT NULL
          ORDER BY "cardId", date DESC
        )
        SELECT
          c.id, c.name, c.rarity, c."imageSmall",
          s.name        AS "setName",
          s.series,
          s."releaseDate",
          l."marketPrice",
          l.volume,
          l."psa10Price",
          l."rawPrice"
        FROM latest l
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
