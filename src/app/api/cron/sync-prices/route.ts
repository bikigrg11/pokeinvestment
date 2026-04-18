import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  fetchCards,
  extractPriceVariants,
  dollarsToCents,
} from "@/lib/api/pokemontcg";

const BATCH_SIZE = 250;
const DELAY_MS = 200;
// Sync top cards by default (keeps within rate limits for frequent runs)
const DEFAULT_LIMIT = 2000;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * GET /api/cron/sync-prices
 *
 * Fetches latest prices from pokemontcg.io and updates the database.
 * Protected by CRON_SECRET to prevent unauthorized access.
 *
 * Query params:
 *   ?limit=500   — max cards to sync (default 2000)
 *
 * Designed to be called by:
 *   - Vercel Cron (vercel.json)
 *   - External cron service (cron-job.org, etc.)
 *   - Manual trigger: curl http://localhost:3000/api/cron/sync-prices?secret=YOUR_SECRET
 */
export async function GET(req: Request) {
  // Auth check — require secret in production
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = parseInt(url.searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
  const startTime = Date.now();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  try {
    // Get existing card IDs
    const dbCardIds = new Set(
      (await db.card.findMany({ select: { id: true } })).map((c) => c.id)
    );

    let page = 1;
    let totalUpdated = 0;
    let totalFetched = 0;
    let apiCalls = 0;

    while (totalFetched < limit) {
      const pageSize = Math.min(BATCH_SIZE, limit - totalFetched);
      const result = await fetchCards({ page, pageSize });
      apiCalls++;

      if (result.cards.length === 0) break;
      totalFetched += result.cards.length;

      for (const card of result.cards) {
        if (!dbCardIds.has(card.id)) continue;

        const variants = extractPriceVariants(card);
        for (const { variant, prices } of variants) {
          const marketPrice = dollarsToCents(prices.market);
          const lowPrice = dollarsToCents(prices.low);
          const midPrice = dollarsToCents(prices.mid);
          const highPrice = dollarsToCents(prices.high);

          if (marketPrice == null && midPrice == null) continue;

          await db.cardPrice.upsert({
            where: {
              cardId_date_variant: { cardId: card.id, date: today, variant },
            },
            update: { marketPrice, lowPrice, midPrice, highPrice },
            create: {
              cardId: card.id,
              date: today,
              variant,
              marketPrice,
              lowPrice,
              midPrice,
              highPrice,
            },
          });
          totalUpdated++;
        }
      }

      if (totalFetched >= result.totalCount || result.cards.length < BATCH_SIZE) break;
      page++;
      await delay(DELAY_MS);
    }

    // Refresh materialized view
    try {
      await db.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW CONCURRENTLY "LatestCardPrice"`);
    } catch {
      await db.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW "LatestCardPrice"`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    return NextResponse.json({
      status: "ok",
      pricesUpdated: totalUpdated,
      cardsFetched: totalFetched,
      apiCalls,
      elapsedSeconds: Number(elapsed),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: (err as Error).message },
      { status: 500 }
    );
  }
}
