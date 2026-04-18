/**
 * Price sync script — fetches latest prices from pokemontcg.io and updates
 * the database. Designed to run on a schedule (every 15–60 min).
 *
 * Run manually:  npx tsx prisma/sync-prices.ts
 * Run top-N:     npx tsx prisma/sync-prices.ts --limit 500
 *
 * Strategy:
 *  1. Fetch cards from pokemontcg.io in batches (250 per page)
 *  2. Upsert current-day price for each card+variant
 *  3. Refresh the LatestCardPrice materialized view
 *
 * Rate limits: 20,000 calls/day with API key.
 * Full 20K-card sync uses ~100 API calls (250 cards per page).
 * Running every 15 min = 96 runs/day × 100 calls = 9,600 calls/day — safely within limit.
 */

import { PrismaClient } from "@prisma/client";
import {
  fetchCards,
  extractPriceVariants,
  dollarsToCents,
} from "../src/lib/api/pokemontcg";

const db = new PrismaClient();

// ─── Config ──────────────────────────────────────────────────────────────────

const BATCH_SIZE = 250;
const DELAY_MS = 200; // delay between API pages to avoid rate limits

// Parse CLI args
const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const CARD_LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Main sync ───────────────────────────────────────────────────────────────

async function syncPrices() {
  const startTime = Date.now();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  console.log(`[sync-prices] Starting at ${new Date().toISOString()}`);
  console.log(`[sync-prices] Limit: ${CARD_LIMIT === Infinity ? "all" : CARD_LIMIT} cards`);

  // Get all card IDs we have in the DB so we only update existing cards
  const dbCardIds = new Set(
    (await db.card.findMany({ select: { id: true } })).map((c) => c.id)
  );
  console.log(`[sync-prices] ${dbCardIds.size} cards in database`);

  let page = 1;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalFetched = 0;
  let apiCalls = 0;

  while (totalFetched < CARD_LIMIT) {
    const pageSize = Math.min(BATCH_SIZE, CARD_LIMIT - totalFetched);

    let result;
    try {
      result = await fetchCards({ page, pageSize });
      apiCalls++;
    } catch (err) {
      console.error(`[sync-prices] API error on page ${page}:`, (err as Error).message);
      break;
    }

    if (result.cards.length === 0) break;

    totalFetched += result.cards.length;

    // Process each card in this batch
    for (const card of result.cards) {
      // Only update cards we have in our DB
      if (!dbCardIds.has(card.id)) {
        totalSkipped++;
        continue;
      }

      const variants = extractPriceVariants(card);
      if (variants.length === 0) {
        totalSkipped++;
        continue;
      }

      for (const { variant, prices } of variants) {
        const marketPrice = dollarsToCents(prices.market);
        const lowPrice = dollarsToCents(prices.low);
        const midPrice = dollarsToCents(prices.mid);
        const highPrice = dollarsToCents(prices.high);

        if (marketPrice == null && midPrice == null) continue;

        try {
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
        } catch (err) {
          // Skip individual card errors (e.g., FK constraint if card was deleted)
          console.warn(`[sync-prices] Failed to upsert ${card.id}/${variant}:`, (err as Error).message);
        }
      }
    }

    console.log(`[sync-prices] Page ${page}: ${result.cards.length} fetched, ${totalUpdated} prices updated so far`);

    // Check if we've reached the end
    if (totalFetched >= result.totalCount || result.cards.length < BATCH_SIZE) break;

    page++;
    await delay(DELAY_MS);
  }

  // Refresh the materialized view so queries use fresh data
  console.log("[sync-prices] Refreshing LatestCardPrice materialized view...");
  try {
    await db.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW CONCURRENTLY "LatestCardPrice"`);
    console.log("[sync-prices] Materialized view refreshed.");
  } catch (err) {
    // View might not exist yet (first run) — create it
    console.warn("[sync-prices] CONCURRENTLY refresh failed, trying full refresh...");
    try {
      await db.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW "LatestCardPrice"`);
      console.log("[sync-prices] Materialized view refreshed (non-concurrent).");
    } catch {
      console.error("[sync-prices] Could not refresh view:", (err as Error).message);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[sync-prices] Done in ${elapsed}s — ${totalUpdated} prices updated, ${totalSkipped} skipped, ${apiCalls} API calls`);
}

// ─── Run ─────────────────────────────────────────────────────────────────────

syncPrices()
  .catch((err) => {
    console.error("[sync-prices] Fatal error:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
