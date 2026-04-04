/**
 * sync-ebay.ts — fetches real PSA 10, PSA 9, and raw prices from eBay
 * for the top N most valuable cards and updates CardPrice rows.
 *
 * Run: npx tsx prisma/sync-ebay.ts
 *
 * Required env vars:
 *   EBAY_CLIENT_ID
 *   EBAY_CLIENT_SECRET
 *
 * Rate limits: eBay Browse API = 5,000 calls/day (free tier)
 * At ~3 calls per card (PSA 10, PSA 9, raw), this script can handle ~1,600 cards/run.
 * We default to top 200 cards which uses ~600 calls.
 */

import { PrismaClient } from "@prisma/client";
import {
  searchSoldListings,
  buildGradedQuery,
  buildRawQuery,
} from "../src/lib/api/ebay";

const db = new PrismaClient({ log: [] });

const TOP_N = 200;          // how many cards to update
const DELAY_MS = 1200;      // ms between eBay calls to avoid rate limiting
const DRY_RUN = process.argv.includes("--dry-run");

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!process.env.EBAY_CLIENT_ID || !process.env.EBAY_CLIENT_SECRET) {
    console.error("❌ EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set in .env");
    console.error("   Get free credentials at: https://developer.ebay.com");
    process.exit(1);
  }

  console.log(`🛍  sync-ebay.ts — ${DRY_RUN ? "DRY RUN" : "LIVE"}\n`);

  // 1. Fetch top-N cards by current market price
  const topCards = await db.$queryRaw<
    Array<{ id: string; name: string; setName: string; marketPrice: number; variant: string; date: Date }>
  >`
    WITH latest AS (
      SELECT DISTINCT ON ("cardId")
        "cardId", "marketPrice", variant, date
      FROM "CardPrice"
      WHERE "marketPrice" IS NOT NULL
      ORDER BY "cardId", date DESC
    )
    SELECT
      c.id, c.name,
      s.name AS "setName",
      l."marketPrice",
      l.variant,
      l.date
    FROM latest l
    JOIN "Card" c ON c.id = l."cardId"
    JOIN "Set"  s ON s.id = c."setId"
    ORDER BY l."marketPrice" DESC
    LIMIT ${TOP_N}
  `;

  console.log(`   Found ${topCards.length} cards to update\n`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < topCards.length; i++) {
    const card = topCards[i];
    const pct = Math.round(((i + 1) / topCards.length) * 100);
    process.stdout.write(`[${pct}%] ${card.name} — `);

    try {
      // PSA 10 price — no condition filter (graded slabs listed inconsistently by sellers)
      const psa10Query = buildGradedQuery(card.name, card.setName, "PSA", "10");
      const psa10Result = await searchSoldListings(psa10Query, 30);
      await delay(DELAY_MS);

      // PSA 9 price
      const psa9Query = buildGradedQuery(card.name, card.setName, "PSA", "9");
      const psa9Result = await searchSoldListings(psa9Query, 20);
      await delay(DELAY_MS);

      // Raw price
      const rawQuery = buildRawQuery(card.name, card.setName);
      const rawResult = await searchSoldListings(rawQuery, 30);
      await delay(DELAY_MS);

      const psa10Price = psa10Result.medianPrice;
      const psa9Price  = psa9Result.medianPrice;
      const rawPrice   = rawResult.medianPrice;
      const volume     = psa10Result.saleCount + rawResult.saleCount;

      process.stdout.write(
        `PSA10=${psa10Price ? `$${(psa10Price / 100).toFixed(0)}` : "—"}  ` +
        `PSA9=${psa9Price ? `$${(psa9Price / 100).toFixed(0)}` : "—"}  ` +
        `raw=${rawPrice ? `$${(rawPrice / 100).toFixed(0)}` : "—"}  ` +
        `vol=${volume}\n`
      );

      if (!DRY_RUN) {
        // Round date to today to match the unique constraint
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        await db.cardPrice.upsert({
          where: {
            cardId_date_variant: { cardId: card.id, date: today, variant: card.variant },
          },
          update: {
            psa10Price: psa10Price ?? undefined,
            psa9Price:  psa9Price  ?? undefined,
            rawPrice:   rawPrice   ?? undefined,
            volume:     volume > 0 ? volume : undefined,
          },
          create: {
            cardId: card.id,
            date: today,
            variant: card.variant,
            marketPrice: card.marketPrice,
            psa10Price: psa10Price ?? undefined,
            psa9Price:  psa9Price  ?? undefined,
            rawPrice:   rawPrice   ?? undefined,
            volume:     volume > 0 ? volume : undefined,
          },
        });
        updated++;
      }
    } catch (err) {
      console.error(`   ❌ Failed: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\n✅ sync-ebay complete!`);
  console.log(`   Updated : ${updated} cards`);
  console.log(`   Failed  : ${failed}`);
  if (DRY_RUN) console.log("   (dry run — no DB changes made)");
}

main()
  .catch((err) => {
    console.error("❌ sync-ebay failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
