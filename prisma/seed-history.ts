/**
 * seed-history.ts — generates 24 months of weekly price history for all cards,
 * synthetic volume data, and IndexSnapshot rows.
 *
 * Run: npx tsx prisma/seed-history.ts
 *
 * Strategy:
 *  1. Fetch all cards that have at least one price snapshot (today's price = anchor)
 *  2. Walk backward 104 weeks, applying realistic price fluctuation per rarity tier
 *  3. Upsert CardPrice rows for each week
 *  4. Derive synthetic volume from rarity + price tier
 *  5. Build IndexSnapshot rows (top-250 by current price, equal-weighted)
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({ log: [] });

// ─── Config ───────────────────────────────────────────────────────────────────

const WEEKS = 52;            // 1 year of weekly snapshots (fits Neon 512 MB free tier)
const BATCH = 200;           // upsert batch size per flush

// Volatility and drift per rarity tier (weekly %)
const TIERS: Record<string, { vol: number; drift: number }> = {
  vintage:  { vol: 0.035, drift:  0.003 },  // pre-2004, high vol, slight upward
  holo:     { vol: 0.025, drift:  0.002 },  // holos
  rare:     { vol: 0.020, drift:  0.001 },  // rare non-holo
  uncommon: { vol: 0.015, drift: -0.001 },  // uncommon / common
  default:  { vol: 0.018, drift:  0.000 },
};

// Volume ranges (weekly sold units) by price tier
function syntheticVolume(marketPriceCents: number, rarity: string | null): number {
  const r = (rarity ?? "").toLowerCase();
  if (marketPriceCents > 10000) return Math.round(5  + Math.random() * 20);   // $100+ — low vol
  if (marketPriceCents > 2000)  return Math.round(15 + Math.random() * 40);   // $20-100
  if (marketPriceCents > 500)   return Math.round(30 + Math.random() * 80);   // $5-20
  if (r.includes("common"))     return Math.round(80 + Math.random() * 200);  // commons — high vol
  return Math.round(20 + Math.random() * 60);
}

// Rarity → tier
function getTier(rarity: string | null, releaseDate: Date | null): keyof typeof TIERS {
  const r = (rarity ?? "").toLowerCase();
  const isVintage = releaseDate && releaseDate < new Date("2004-01-01");
  if (isVintage) return "vintage";
  if (r.includes("holo") || r.includes("rainbow") || r.includes("secret") || r.includes("shining") || r.includes("star")) return "holo";
  if (r.includes("rare")) return "rare";
  if (r.includes("uncommon") || r.includes("common")) return "uncommon";
  return "default";
}

// Seeded pseudo-random (deterministic per card so reruns are consistent)
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("📈 seed-history.ts starting…\n");

  // 1. Load all cards with their most recent price
  const cards = await db.card.findMany({
    select: {
      id: true,
      rarity: true,
      releaseDate: true,
      prices: {
        orderBy: { date: "desc" },
        take: 1,
        select: { marketPrice: true, variant: true, lowPrice: true, midPrice: true, highPrice: true },
      },
    },
  });

  const priced = cards.filter((c) => c.prices[0]?.marketPrice != null);
  console.log(`   ${priced.length} cards with prices (of ${cards.length} total)`);

  // 2. Build weekly date anchors (Mon of each week going back WEEKS)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const weekDates: Date[] = [];
  for (let w = WEEKS; w >= 0; w--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - w * 7);
    weekDates.push(d);
  }

  // 3. Generate price history rows
  let inserted = 0;
  let batch: Parameters<typeof db.cardPrice.upsert>[0][] = [];

  async function flush() {
    if (batch.length === 0) return;
    await Promise.all(batch.map((args) => db.cardPrice.upsert(args)));
    inserted += batch.length;
    batch = [];
  }

  for (let i = 0; i < priced.length; i++) {
    const card = priced[i];
    const snap = card.prices[0]!;
    const anchorPrice = snap.marketPrice!;
    const variant = snap.variant;
    const tier = getTier(card.rarity, card.releaseDate);
    const { vol, drift } = TIERS[tier];
    const rand = seededRand(card.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0));

    // Walk backward from today to build weekly prices
    // We simulate prices as a geometric Brownian motion and scale so today = anchorPrice
    const rawPrices: number[] = [1.0];
    for (let w = 1; w <= WEEKS; w++) {
      const prev = rawPrices[rawPrices.length - 1];
      const shock = (rand() - 0.5) * 2 * vol;
      rawPrices.push(Math.max(0.05, prev * (1 + drift + shock)));
    }
    // Scale so final value = anchorPrice
    const scale = anchorPrice / rawPrices[rawPrices.length - 1];
    const scaledPrices = rawPrices.map((p) => Math.max(1, Math.round(p * scale)));

    for (let w = 0; w < weekDates.length; w++) {
      const date = weekDates[w];
      const mp = scaledPrices[w];
      const vol2 = syntheticVolume(mp, card.rarity);

      batch.push({
        where: { cardId_date_variant: { cardId: card.id, date, variant } },
        update: { marketPrice: mp, volume: vol2 },
        create: {
          cardId: card.id,
          date,
          variant,
          marketPrice: mp,
          lowPrice:    Math.round(mp * 0.85),
          midPrice:    Math.round(mp * 0.95),
          highPrice:   Math.round(mp * 1.10),
          volume: vol2,
        },
      });

      if (batch.length >= BATCH) await flush();
    }

    if ((i + 1) % 500 === 0) {
      await flush();
      console.log(`   ${i + 1}/${priced.length} cards processed…`);
    }
  }
  await flush();
  console.log(`\n   ✓ Upserted ${inserted} price rows across ${priced.length} cards\n`);

  // 4. Build IndexSnapshot rows (top 250 by current price, equal-weighted)
  console.log("📊 Building IndexSnapshot rows…");

  // Pick top-250 card IDs by current market price
  const top250 = priced
    .slice()
    .sort((a, b) => (b.prices[0]?.marketPrice ?? 0) - (a.prices[0]?.marketPrice ?? 0))
    .slice(0, 250);

  const top250Ids = new Set(top250.map((c) => c.id));

  // Base value for the index: average price of top-250 cards at the start (week 0)
  // We'll load the weekly prices for top-250 from DB in batches
  let snapshotsCreated = 0;

  for (let w = 0; w < weekDates.length; w++) {
    const date = weekDates[w];

    // Get prices for top-250 at this date
    const prices = await db.cardPrice.findMany({
      where: {
        cardId: { in: [...top250Ids] },
        date,
      },
      select: { cardId: true, marketPrice: true },
    });

    const priceMap = new Map(prices.map((p) => [p.cardId, p.marketPrice ?? 0]));
    const values = top250.map((c) => priceMap.get(c.id) ?? c.prices[0]!.marketPrice!);
    const totalMarketCap = values.reduce((s, v) => s + v, 0);
    const indexValue = totalMarketCap / 250; // equal-weighted avg in cents

    // Normalize to a "points" scale (base 1000 at week 0)
    const baseValue = w === 0 ? indexValue : null;

    await db.indexSnapshot.upsert({
      where: { date },
      update: { value: indexValue, totalMarketCap, components: [...top250Ids] },
      create: {
        date,
        value: indexValue,
        totalMarketCap,
        components: [...top250Ids],
      },
    });
    snapshotsCreated++;

    void baseValue; // used for reference only
  }

  console.log(`   ✓ Created ${snapshotsCreated} IndexSnapshot rows\n`);

  // 5. Summary
  const [totalPrices, totalSnapshots] = await Promise.all([
    db.cardPrice.count(),
    db.indexSnapshot.count(),
  ]);

  console.log("✅ seed-history complete!");
  console.log(`   CardPrice rows   : ${totalPrices.toLocaleString()}`);
  console.log(`   IndexSnapshot rows: ${totalSnapshots}`);
}

main()
  .catch((err) => {
    console.error("❌ seed-history failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
