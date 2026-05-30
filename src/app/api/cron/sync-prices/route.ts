import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  fetchCards,
  extractPriceVariants,
  dollarsToCents,
} from "@/lib/api/pokemontcg";
import { runCreatorSync } from "@/server/services/creator-sync";

// Allow up to 5 min — the longest Vercel functions can run.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BATCH_SIZE = 250;
const DELAY_MS = 200;
// Sync top cards by default (keeps within rate limits for frequent runs)
const DEFAULT_LIMIT = 2000;
const INDEX_SIZE = 250; // Pokémon 250 Index — top N cards, equal-weighted

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface PriceRow {
  cardId: string;
  variant: string;
  marketPrice: number | null;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
}

/**
 * Bulk upsert a page of price rows in a SINGLE statement.
 *
 * The old implementation awaited one `upsert` per card-variant, each a separate
 * round-trip to serverless Neon (~0.3s each). At 2000 cards that took ~24 min and
 * the Vercel function timed out before finishing — which is why production data
 * went stale. One multi-row INSERT ... ON CONFLICT collapses a page into one trip.
 *
 * `CardPrice.id` is a client-side cuid (no DB default), so raw inserts must
 * supply an id; ON CONFLICT updates never touch it.
 */
async function bulkUpsertPrices(rows: PriceRow[], today: Date): Promise<number> {
  if (rows.length === 0) return 0;

  // Bind the day as a date-only string cast to `timestamp` (not a JS Date).
  // `$executeRaw` binds a JS Date with the connection timezone applied, which
  // shifts it against the `timestamp`-without-tz column (e.g. stored as the
  // previous day at 20:00). The date-only string casts to a clean UTC midnight,
  // matching the historical seed data so day-grouping and the unique
  // (cardId, date, variant) key stay aligned.
  const dateStr = today.toISOString().slice(0, 10); // "YYYY-MM-DD"

  const tuples = rows.map(
    (r) =>
      Prisma.sql`(${randomUUID()}, ${r.cardId}, ${dateStr}::timestamp, ${r.variant}, ${r.marketPrice}, ${r.lowPrice}, ${r.midPrice}, ${r.highPrice})`
  );

  await db.$executeRaw`
    INSERT INTO "CardPrice" ("id", "cardId", "date", "variant", "marketPrice", "lowPrice", "midPrice", "highPrice")
    VALUES ${Prisma.join(tuples)}
    ON CONFLICT ("cardId", "date", "variant")
    DO UPDATE SET
      "marketPrice" = EXCLUDED."marketPrice",
      "lowPrice"    = EXCLUDED."lowPrice",
      "midPrice"    = EXCLUDED."midPrice",
      "highPrice"   = EXCLUDED."highPrice"
  `;

  return rows.length;
}

/**
 * Recompute today's Pokémon 250 Index snapshot from the freshly-refreshed
 * LatestCardPrice view: top-250 cards by market price, equal-weighted average
 * (in cents — matches the existing snapshot scale). Without this the index
 * chart stays frozen even when card prices update.
 */
async function recomputeIndexSnapshot(today: Date): Promise<number | null> {
  const top = await db.$queryRaw<Array<{ cardId: string; marketPrice: number }>>`
    SELECT "cardId", "marketPrice"
    FROM "LatestCardPrice"
    WHERE "marketPrice" IS NOT NULL
    ORDER BY "marketPrice" DESC
    LIMIT ${INDEX_SIZE}
  `;

  if (top.length === 0) return null;

  const totalMarketCap = top.reduce((s, r) => s + Number(r.marketPrice), 0);
  const value = totalMarketCap / INDEX_SIZE; // equal-weighted avg, cents
  const components = top.map((r) => r.cardId);

  await db.indexSnapshot.upsert({
    where: { date: today },
    update: { value, totalMarketCap, components },
    create: { date: today, value, totalMarketCap, components },
  });

  return value;
}

/**
 * GET /api/cron/sync-prices
 *
 * Fetches latest prices from pokemontcg.io, bulk-upserts them, refreshes the
 * LatestCardPrice materialized view, and recomputes the Pokémon 250 Index.
 * Protected by CRON_SECRET to prevent unauthorized access.
 *
 * Query params:
 *   ?limit=500   — max cards to sync (default 2000)
 *
 * Called by Vercel Cron (vercel.json), an external cron service, or manually:
 *   curl "https://pokeinvestment.com/api/cron/sync-prices?secret=YOUR_SECRET"
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret =
    url.searchParams.get("secret") ??
    req.headers.get("authorization")?.replace("Bearer ", "");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = parseInt(
    url.searchParams.get("limit") ?? String(DEFAULT_LIMIT),
    10
  );
  const startTime = Date.now();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let totalUpdated = 0;
  let totalFetched = 0;
  let apiCalls = 0;

  try {
    const dbCardIds = new Set(
      (await db.card.findMany({ select: { id: true } })).map((c) => c.id)
    );

    let page = 1;

    while (totalFetched < limit) {
      const pageSize = Math.min(BATCH_SIZE, limit - totalFetched);
      const result = await fetchCards({ page, pageSize });
      apiCalls++;

      if (result.cards.length === 0) break;
      totalFetched += result.cards.length;

      // Collect this page's rows, then write them all in one statement.
      const rows: PriceRow[] = [];
      for (const card of result.cards) {
        if (!dbCardIds.has(card.id)) continue;

        for (const { variant, prices } of extractPriceVariants(card)) {
          const marketPrice = dollarsToCents(prices.market);
          const midPrice = dollarsToCents(prices.mid);
          if (marketPrice == null && midPrice == null) continue;

          rows.push({
            cardId: card.id,
            variant,
            marketPrice,
            lowPrice: dollarsToCents(prices.low),
            midPrice,
            highPrice: dollarsToCents(prices.high),
          });
        }
      }

      totalUpdated += await bulkUpsertPrices(rows, today);

      if (
        totalFetched >= result.totalCount ||
        result.cards.length < BATCH_SIZE
      )
        break;
      page++;
      await delay(DELAY_MS);
    }

    // Refresh materialized view so list/leaderboard queries see new prices.
    try {
      await db.$executeRawUnsafe(
        `REFRESH MATERIALIZED VIEW CONCURRENTLY "LatestCardPrice"`
      );
    } catch {
      await db.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW "LatestCardPrice"`);
    }

    // Recompute the index off the freshly-refreshed view.
    const indexValue = await recomputeIndexSnapshot(today);

    // Piggyback the creator Heat sync onto the daily cron (Hobby cron-count limit).
    // Failure here must not fail the price sync, so swallow + log.
    let creatorSync: Awaited<ReturnType<typeof runCreatorSync>> | null = null;
    try {
      creatorSync = await runCreatorSync();
    } catch (e) {
      console.error("[cron/sync-prices] creator sync failed", (e as Error).message);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    return NextResponse.json({
      status: "ok",
      pricesUpdated: totalUpdated,
      cardsFetched: totalFetched,
      apiCalls,
      indexValue,
      creatorSync,
      elapsedSeconds: Number(elapsed),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // Log + return partial progress so a failure is visible, not silent.
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error("[cron/sync-prices] failed", {
      error: (err as Error).message,
      pricesUpdated: totalUpdated,
      cardsFetched: totalFetched,
      apiCalls,
      elapsedSeconds: Number(elapsed),
    });
    return NextResponse.json(
      {
        status: "error",
        message: (err as Error).message,
        pricesUpdated: totalUpdated,
        cardsFetched: totalFetched,
        apiCalls,
        elapsedSeconds: Number(elapsed),
      },
      { status: 500 }
    );
  }
}
