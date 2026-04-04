/**
 * Prisma seed script — fetches sets and cards from pokemontcg.io and
 * populates the database.
 *
 * Run: npx prisma db seed
 *
 * Strategy:
 *  1. Fetch all sets → upsert every set
 *  2. For a curated list of investment-relevant sets, fetch all cards
 *  3. Upsert each card + its current price snapshot
 *
 * Rate limit: ~20 000 req/day with a free API key. Seed uses ~60–120 requests.
 */

import { PrismaClient } from "@prisma/client";
import {
  fetchSets,
  fetchAllCardsInSet,
  extractPriceVariants,
  dollarsToCents,
  type TCGCard,
  type TCGSet,
} from "../src/lib/api/pokemontcg";

const db = new PrismaClient();

// ─── Priority sets ────────────────────────────────────────────────────────────
// Vintage + high-investment-value modern sets. Mapped from pokemontcg.io set IDs.
// Full list: https://pokemontcg.io/v2/sets

const PRIORITY_SET_IDS = new Set([
  // Base Era
  "base1",   // Base Set
  "base2",   // Jungle
  "base3",   // Fossil
  "base4",   // Team Rocket
  "base5",   // Base Set 2
  "base6",   // Legendary Collection
  // Gym
  "gym1",    // Gym Heroes
  "gym2",    // Gym Challenge
  // Neo
  "neo1",    // Neo Genesis
  "neo2",    // Neo Discovery
  "neo3",    // Neo Revelation
  "neo4",    // Neo Destiny
  // e-Series
  "ecard1",  // Expedition
  "ecard2",  // Aquapolis
  "ecard3",  // Skyridge
  // EX Era
  "ex1",     // EX Ruby & Sapphire
  "ex3",     // EX Dragon
  "ex6",     // EX FireRed & LeafGreen
  "ex16",    // EX Power Keepers
  // DP/Platinum
  "dp1",     // Diamond & Pearl
  "pl4",     // Arceus
  // HGSS
  "hgss1",   // HeartGold SoulSilver
  "hgss4",   // Triumphant
  // BW
  "bw1",     // Black & White
  "bw11",    // Legendary Treasures
  // XY
  "xy1",     // XY Base
  "xy12",    // XY Evolutions
  // SM
  "sm1",     // Sun & Moon Base
  "sm115",   // Hidden Fates
  "sma",     // SM Black Star Promos
  // SWSH
  "swsh1",   // Sword & Shield Base
  "swsh35",  // Champion's Path
  "swsh7",   // Evolving Skies
  "swsh12",  // Silver Tempest
  "swsh12pt5", // Crown Zenith
  // SV
  "sv1",     // Scarlet & Violet Base
  "sv3",     // Obsidian Flames
  "sv3pt5",  // 151
  "sv4",     // Paradox Rift
  "sv8",     // Surging Sparks
  "sv8pt5",  // Prismatic Evolutions
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTCGDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  // pokemontcg.io format: "YYYY/MM/DD" or "MM/DD/YYYY" — normalise
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  // Detect format: if first part is 4 digits → YYYY/MM/DD
  if (parts[0].length === 4) {
    return new Date(`${parts[0]}-${parts[1]}-${parts[2]}T00:00:00Z`);
  }
  // MM/DD/YYYY
  return new Date(`${parts[2]}-${parts[0]}-${parts[1]}T00:00:00Z`);
}

function parsePokemonName(name: string): string {
  // Strip card suffixes: "Charizard V", "Charizard VMAX", "Charizard ex", etc.
  return name
    .replace(/\s+(V|VMAX|VSTAR|ex|EX|GX|LV\.X|BREAK|δ|Star|Prime|Legend)(\s|$).*/i, "")
    .replace(/\s*(Shining|Dark|Light|Shadow|Rocket's|Misty's|Blaine's|Brock's|Erika's|Giovanni's|Koga's|Lt\. Surge's|Sabrina's|Jasmine's|Morty's|Chuck's|Whitney's|Pryce's|Clair's)\s*/i, "")
    .trim();
}

async function upsertSet(set: TCGSet): Promise<void> {
  await db.set.upsert({
    where: { id: set.id },
    update: {
      name: set.name,
      series: set.series,
      totalCards: set.total,
      printedTotal: set.printedTotal,
      releaseDate: parseTCGDate(set.releaseDate),
      symbolUrl: set.images.symbol,
      logoUrl: set.images.logo,
      legalities: set.legalities ?? {},
    },
    create: {
      id: set.id,
      name: set.name,
      series: set.series,
      totalCards: set.total,
      printedTotal: set.printedTotal,
      releaseDate: parseTCGDate(set.releaseDate),
      symbolUrl: set.images.symbol,
      logoUrl: set.images.logo,
      legalities: set.legalities ?? {},
    },
  });
}

async function upsertCard(card: TCGCard, setReleaseDate: Date | null): Promise<void> {
  const pokemon = parsePokemonName(card.name);

  await db.card.upsert({
    where: { id: card.id },
    update: {
      name: card.name,
      pokemon,
      setId: card.set.id,
      rarity: card.rarity ?? null,
      cardNumber: card.number,
      supertype: card.supertype,
      subtypes: card.subtypes ?? [],
      types: card.types ?? [],
      hp: card.hp ?? null,
      artist: card.artist ?? null,
      imageSmall: card.images.small,
      imageLarge: card.images.large,
      tcgplayerUrl: card.tcgplayer?.url ?? null,
      cardmarketUrl: card.cardmarket?.url ?? null,
      releaseDate: setReleaseDate,
    },
    create: {
      id: card.id,
      name: card.name,
      pokemon,
      setId: card.set.id,
      rarity: card.rarity ?? null,
      cardNumber: card.number,
      supertype: card.supertype,
      subtypes: card.subtypes ?? [],
      types: card.types ?? [],
      hp: card.hp ?? null,
      artist: card.artist ?? null,
      imageSmall: card.images.small,
      imageLarge: card.images.large,
      tcgplayerUrl: card.tcgplayer?.url ?? null,
      cardmarketUrl: card.cardmarket?.url ?? null,
      releaseDate: setReleaseDate,
    },
  });
}

async function upsertPrices(card: TCGCard, date: Date): Promise<void> {
  const variants = extractPriceVariants(card);
  if (variants.length === 0) return;

  for (const { variant, prices } of variants) {
    const marketPrice = dollarsToCents(prices.market);
    const lowPrice = dollarsToCents(prices.low);
    const midPrice = dollarsToCents(prices.mid);
    const highPrice = dollarsToCents(prices.high);

    // Skip if no useful price data
    if (marketPrice == null && midPrice == null) continue;

    // Round date to start-of-day to make the unique constraint deterministic
    const day = new Date(date);
    day.setUTCHours(0, 0, 0, 0);

    await db.cardPrice.upsert({
      where: {
        cardId_date_variant: { cardId: card.id, date: day, variant },
      },
      update: {
        marketPrice,
        lowPrice,
        midPrice,
        highPrice,
      },
      create: {
        cardId: card.id,
        date: day,
        variant,
        marketPrice,
        lowPrice,
        midPrice,
        highPrice,
      },
    });
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting PokeInvest seed...\n");

  // ── Step 1: Fetch & upsert all sets ────────────────────────────────────────
  console.log("📦 Fetching all sets from pokemontcg.io...");
  const allSets = await fetchSets();
  console.log(`   Got ${allSets.length} sets`);

  for (const set of allSets) {
    await upsertSet(set);
  }
  console.log(`   ✓ Upserted ${allSets.length} sets\n`);

  // Build a lookup map for set release dates
  const setDateMap = new Map<string, Date | null>();
  for (const set of allSets) {
    setDateMap.set(set.id, parseTCGDate(set.releaseDate));
  }

  // ── Step 2: Fetch cards for priority sets ──────────────────────────────────
  const prioritySets = allSets.filter((s) => PRIORITY_SET_IDS.has(s.id));
  console.log(
    `🃏 Fetching cards for ${prioritySets.length} priority sets (out of ${allSets.length} total)...`
  );

  let totalCards = 0;
  let totalPrices = 0;
  const now = new Date();

  for (const set of prioritySets) {
    process.stdout.write(`   ${set.name} (${set.id}) — `);

    let cards: TCGCard[];
    try {
      cards = await fetchAllCardsInSet(set.id, 150);
    } catch (err) {
      console.error(`FAILED: ${err}`);
      continue;
    }

    const setReleaseDate = setDateMap.get(set.id) ?? null;

    for (const card of cards) {
      await upsertCard(card, setReleaseDate);
      await upsertPrices(card, now);
      totalCards++;
      const variants = extractPriceVariants(card);
      totalPrices += variants.length;
    }

    console.log(`${cards.length} cards`);

    // Polite delay between sets
    await new Promise((r) => setTimeout(r, 200));
  }

  // ── Step 3: Summary ────────────────────────────────────────────────────────
  const [dbSets, dbCards, dbPrices] = await Promise.all([
    db.set.count(),
    db.card.count(),
    db.cardPrice.count(),
  ]);

  console.log("\n✅ Seed complete!");
  console.log(`   Sets in DB   : ${dbSets}`);
  console.log(`   Cards in DB  : ${dbCards} (seeded ${totalCards})`);
  console.log(`   Prices in DB : ${dbPrices} (seeded ${totalPrices})`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
