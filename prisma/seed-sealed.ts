/**
 * seed-sealed.ts — seeds ~25 sealed Pokémon TCG products with real MSRPs
 * and estimated current market values.
 *
 * Run: npx tsx prisma/seed-sealed.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({ log: [] });

// ─── Sealed product data ──────────────────────────────────────────────────────
// releasePriceC = MSRP in cents
// currentPriceC = approximate current market value in cents (eBay/TCGPlayer avg)

const PRODUCTS = [
  // ── Scarlet & Violet Era ────────────────────────────────────────────────────
  {
    setId: "sv8pt5",  // Prismatic Evolutions
    name: "Prismatic Evolutions Elite Trainer Box",
    type: "ETB",
    releasePriceC: 4999,
    currentPriceC: 18000,
  },
  {
    setId: "sv8pt5",
    name: "Prismatic Evolutions Booster Bundle",
    type: "Bundle",
    releasePriceC: 2499,
    currentPriceC: 7500,
  },
  {
    setId: "sv8",    // Surging Sparks
    name: "Surging Sparks Booster Box",
    type: "Booster Box",
    releasePriceC: 14399,
    currentPriceC: 15500,
  },
  {
    setId: "sv8",
    name: "Surging Sparks Elite Trainer Box",
    type: "ETB",
    releasePriceC: 4999,
    currentPriceC: 5500,
  },
  {
    setId: "sv3pt5",  // 151
    name: "Pokémon Card 151 Booster Box",
    type: "Booster Box",
    releasePriceC: 14399,
    currentPriceC: 19000,
  },
  {
    setId: "sv3pt5",
    name: "Pokémon Card 151 Elite Trainer Box",
    type: "ETB",
    releasePriceC: 4999,
    currentPriceC: 7200,
  },
  {
    setId: "sv4",   // Paradox Rift
    name: "Paradox Rift Booster Box",
    type: "Booster Box",
    releasePriceC: 14399,
    currentPriceC: 12500,
  },
  {
    setId: "sv1",   // Scarlet & Violet Base
    name: "Scarlet & Violet Booster Box",
    type: "Booster Box",
    releasePriceC: 14399,
    currentPriceC: 11000,
  },
  // ── Sword & Shield Era ──────────────────────────────────────────────────────
  {
    setId: "swsh12pt5",  // Crown Zenith
    name: "Crown Zenith Elite Trainer Box",
    type: "ETB",
    releasePriceC: 4999,
    currentPriceC: 7800,
  },
  {
    setId: "swsh7",  // Evolving Skies
    name: "Evolving Skies Booster Box",
    type: "Booster Box",
    releasePriceC: 14399,
    currentPriceC: 28500,
  },
  {
    setId: "swsh7",
    name: "Evolving Skies Elite Trainer Box",
    type: "ETB",
    releasePriceC: 4999,
    currentPriceC: 11000,
  },
  {
    setId: "swsh35",  // Champion's Path
    name: "Champion's Path Elite Trainer Box",
    type: "ETB",
    releasePriceC: 4999,
    currentPriceC: 14500,
  },
  {
    setId: "swsh12",  // Silver Tempest
    name: "Silver Tempest Booster Box",
    type: "Booster Box",
    releasePriceC: 14399,
    currentPriceC: 10500,
  },
  {
    setId: "swsh1",  // Sword & Shield Base
    name: "Sword & Shield Base Booster Box",
    type: "Booster Box",
    releasePriceC: 10799,
    currentPriceC: 13000,
  },
  // ── Sun & Moon Era ──────────────────────────────────────────────────────────
  {
    setId: "sm115",  // Hidden Fates
    name: "Hidden Fates Elite Trainer Box",
    type: "ETB",
    releasePriceC: 3999,
    currentPriceC: 9500,
  },
  {
    setId: "sm115",
    name: "Hidden Fates Shiny Vault Booster Box",
    type: "Booster Box",
    releasePriceC: 10799,
    currentPriceC: 18000,
  },
  {
    setId: "sm1",   // Sun & Moon Base
    name: "Sun & Moon Base Booster Box",
    type: "Booster Box",
    releasePriceC: 9999,
    currentPriceC: 11500,
  },
  // ── XY Era ──────────────────────────────────────────────────────────────────
  {
    setId: "xy12",  // Evolutions
    name: "XY Evolutions Booster Box",
    type: "Booster Box",
    releasePriceC: 9999,
    currentPriceC: 34000,
  },
  {
    setId: "xy12",
    name: "XY Evolutions Elite Trainer Box",
    type: "ETB",
    releasePriceC: 3999,
    currentPriceC: 14000,
  },
  {
    setId: "xy1",   // XY Base
    name: "XY Base Booster Box",
    type: "Booster Box",
    releasePriceC: 9999,
    currentPriceC: 19000,
  },
  // ── Black & White Era ───────────────────────────────────────────────────────
  {
    setId: "bw11",  // Legendary Treasures
    name: "Legendary Treasures Booster Box",
    type: "Booster Box",
    releasePriceC: 9999,
    currentPriceC: 38000,
  },
  {
    setId: "bw1",   // Black & White Base
    name: "Black & White Base Booster Box",
    type: "Booster Box",
    releasePriceC: 9999,
    currentPriceC: 22000,
  },
  // ── Vintage ──────────────────────────────────────────────────────────────────
  {
    setId: "base1", // Base Set
    name: "Base Set Booster Pack (Shadowless)",
    type: "Booster Pack",
    releasePriceC: 299,
    currentPriceC: 65000,
  },
  {
    setId: "neo1",  // Neo Genesis
    name: "Neo Genesis Booster Box",
    type: "Booster Box",
    releasePriceC: 9999,
    currentPriceC: 180000,
  },
  {
    setId: "base6", // Legendary Collection
    name: "Legendary Collection Booster Box",
    type: "Booster Box",
    releasePriceC: 9999,
    currentPriceC: 95000,
  },
];

async function main() {
  console.log("🎁 seed-sealed.ts starting…\n");

  // Verify set IDs exist in DB
  const setIds = [...new Set(PRODUCTS.map((p) => p.setId))];
  const existingSets = await db.set.findMany({
    where: { id: { in: setIds } },
    select: { id: true, name: true },
  });
  const existingSetIds = new Set(existingSets.map((s) => s.id));

  const missing = setIds.filter((id) => !existingSetIds.has(id));
  if (missing.length > 0) {
    console.warn(`⚠️  Missing sets in DB (run seed.ts first): ${missing.join(", ")}`);
  }

  let created = 0;
  let skipped = 0;

  for (const product of PRODUCTS) {
    if (!existingSetIds.has(product.setId)) {
      skipped++;
      continue;
    }

    // Upsert by name + setId to be idempotent
    const existing = await db.sealedProduct.findFirst({
      where: { name: product.name, setId: product.setId },
    });

    if (existing) {
      await db.sealedProduct.update({
        where: { id: existing.id },
        data: {
          currentPriceC: product.currentPriceC,
          lastUpdated: new Date(),
        },
      });
    } else {
      await db.sealedProduct.create({
        data: {
          name: product.name,
          setId: product.setId,
          type: product.type,
          releasePriceC: product.releasePriceC,
          currentPriceC: product.currentPriceC,
          lastUpdated: new Date(),
        },
      });
      created++;
    }

    console.log(`   ✓ ${product.name}`);
  }

  const total = await db.sealedProduct.count();
  console.log(`\n✅ seed-sealed complete!`);
  console.log(`   Created : ${created} products`);
  console.log(`   Skipped : ${skipped} (set not in DB)`);
  console.log(`   Total   : ${total} sealed products in DB`);
}

main()
  .catch((err) => {
    console.error("❌ seed-sealed failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
