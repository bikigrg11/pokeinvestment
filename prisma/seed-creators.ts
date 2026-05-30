/**
 * Seed the Creator Hub directory with notable Pokémon-hobby people & resources.
 *
 * YouTube channels are VERIFIED against the live YouTube Data API at run time —
 * each channelId/handle is resolved to its real title, avatar, and subscriber
 * count, and anything that doesn't resolve is skipped. This guards against dead
 * or wrong channel links. Non-YouTube resources (grading, marketplaces, news,
 * tools) use canonical first-party URLs.
 *
 * Idempotent: upserts by slug and replaces links each run.
 *
 *   YOUTUBE_API_KEY=... npx tsx prisma/seed-creators.ts
 *   (set DATABASE_URL to target local or production)
 */
import { PrismaClient, EntryCategory } from "@prisma/client";
import {
  fetchYouTubeChannels,
  fetchYouTubeByHandle,
  type YTChannelStats,
} from "../src/lib/api/youtube";

const db = new PrismaClient();

type Link = { platform: string; url: string };
type Seed = {
  name: string;
  category: EntryCategory;
  channelId?: string; // resolve via channels.list
  handle?: string; // resolve via channels.list?forHandle
  links?: Link[];
};

// ── YouTube creators (channel IDs sourced from Feedspot's TCG channel list) ──
const CREATORS: Seed[] = [
  { name: "RealBreakingNate", category: "YOUTUBER", channelId: "UCcwfDOpvOnFtdtbAKW7Vs_w" },
  { name: "UnlistedLeaf", category: "YOUTUBER", channelId: "UCAHHqWLedf6xRyyVByhAHMw" },
  { name: "Leonhart", category: "YOUTUBER", channelId: "UCBHD6Yg8R1yS9akfGm4mecQ" },
  { name: "Deep Pocket Monster", category: "YOUTUBER", channelId: "UCnnrLDosqnpRPQ_TH3uXnnQ" },
  { name: "Randolph Pokemon", category: "YOUTUBER", channelId: "UCd0bq0P8Xz9vEJqdnyqHYrg" },
  { name: "Luxury Ball Collectibles", category: "STREAMER_BREAKER", channelId: "UC0ILPO-k8pIwEJWZY5D2CpQ" },
  { name: "Ptcgradio", category: "YOUTUBER", channelId: "UCnwlWgbcxwpsnB7LtOL1kPg" },
  { name: "DarkGhoul", category: "YOUTUBER", channelId: "UCaII8NxkiEDZJIhl9xSD-EA" },
  { name: "AzulGG", category: "STREAMER_BREAKER", channelId: "UCEZlNLKMWQ7FV33gr9lpX9A" },
  { name: "Danny Phantump", category: "YOUTUBER", channelId: "UCcWWKSAKzPkwGCr7B7QJ1hA" },
  { name: "TwicebakedJake", category: "YOUTUBER", channelId: "UC8FyZ-7SuPVVaoxpFOE5pvA" },
  { name: "Tricky Gym", category: "YOUTUBER", channelId: "UC35KRaWGA7hQ5De40GG_7Fw" },
  { name: "LittleDarkFury", category: "STREAMER_BREAKER", channelId: "UCAhRWmekXLryJOZRUYR4seQ" },
  { name: "SneakerTalk TCG", category: "YOUTUBER", channelId: "UCBjjolWH6d6JJRCZ6a02N6w" },
  { name: "ZapdosTCG", category: "YOUTUBER", channelId: "UCYCzQRsPJ_eUEXXmU_CSx2g" },
  { name: "ForTheWinTCG", category: "YOUTUBER", channelId: "UCAQKOO0Evm2TENo0UCZR-pg" },
  { name: "The Pokémon Evolutionaries", category: "PODCAST", channelId: "UCgD--vlzKcTINeWeTyQczyA" },
  { name: "PokeCuz TCG", category: "YOUTUBER", channelId: "UCB82_QMr5slrVN4woHJC1Lw" },
  { name: "Don Diego Trading", category: "YOUTUBER", channelId: "UCaoUNLgRXojkEiX9IzPks4g" },
  { name: "TrustYourPilot Pokemon", category: "YOUTUBER", channelId: "UCZiUkbtzrEzCiDZ09oZYBbQ" },
  { name: "LDF PTCG", category: "YOUTUBER", channelId: "UCExbrATu_Pqqu2v7tQg6fOQ" },
  { name: "OmniPoke", category: "YOUTUBER", channelId: "UC9k2vZA_jd83-4gMzRupYrQ" },
  { name: "Rahul Reddy", category: "YOUTUBER", channelId: "UCc6p3ALAsltaZmXS4onBDzw" },
  { name: "tablemon", category: "STREAMER_BREAKER", channelId: "UCt2NlhRtMMF5mFlSZxTesiA" },
  { name: "The Shuffle Squad", category: "YOUTUBER", channelId: "UClS5htrYFGOcBfJRM8awoeg" },
  { name: "Celio's Network", category: "STREAMER_BREAKER", channelId: "UCkUDPJUQDWhKT2KfQivXNKQ" },
  { name: "TheDexLogs", category: "YOUTUBER", channelId: "UCa65EVP9gcplK_3B8HQ4fsA" },
  { name: "Bewear The TERRIBLE", category: "YOUTUBER", channelId: "UCw_1T6YLsSiOaNjJPKEE2RQ" },
  { name: "Jay's Corner TCG", category: "YOUTUBER", channelId: "UCRN3-pBsdLQJBCR7vQjXb3w" },
  { name: "Popsicle Knight", category: "YOUTUBER", channelId: "UCaJRkZn63jCodODUOyGPiiA" },
  { name: "DK Cards", category: "YOUTUBER", channelId: "UCUsODGoQh1uj_hH2G3k2bQg" },
  { name: "10types", category: "YOUTUBER", channelId: "UCGt88fXOvxhyXZrj5MDKQwQ" },
  { name: "TripleBtcg", category: "YOUTUBER", channelId: "UC56qnM2t-CgBudbr7nHLNcA" },
  { name: "BurtsPTCG", category: "STREAMER_BREAKER", channelId: "UCkUfHh_0zQ_1ZXhMeezm0nA" },
  { name: "SmartTCG", category: "YOUTUBER", channelId: "UCPYRtL8YPmYDdOxe6wwBapw" },
  { name: "Jank Play TCG", category: "YOUTUBER", channelId: "UCE0GMTv2wR_ptzp-SIFfU-w" },
  { name: "Paraspectre", category: "YOUTUBER", channelId: "UC05_VFP15Ll-Eui1MwMbyOg" },
  { name: "DarkIntegralGaming", category: "YOUTUBER", channelId: "UC18Y2Z7TqLHFvg4Fk3UkbRg" },
  { name: "Rare Candy", category: "YOUTUBER", channelId: "UCkgkRXdzdVrMGO4vjLmzzjw" },
  { name: "Balthazar Pkmns", category: "YOUTUBER", channelId: "UCzQjgV8Z4CP7I5O-ZDmlD-Q" },
  { name: "The Sableyes", category: "YOUTUBER", channelId: "UC6ZBtvoVxDJYESu7Y5mITuw" },
  { name: "Ruby Retro", category: "YOUTUBER", channelId: "UC59nXsqCA9I2uXfidX6WQkQ" },
  { name: "Chari Card", category: "YOUTUBER", channelId: "UC-OqDos6h4QtYnZyfnfJWRA" },
  { name: "Ninecard TCG", category: "YOUTUBER", channelId: "UC_bHSWMGzWgcFSn9XtF4dtQ" },
  { name: "TCG Park", category: "YOUTUBER", channelId: "UCdvtrY2VrCkZi5A3N_q5fFA" },
  { name: "Strictly Better Pokemon TCG", category: "YOUTUBER", channelId: "UCt0ta4prYhdo1TmM-HyhNgQ" },
  { name: "Pokémon TCG UK", category: "YOUTUBER", channelId: "UCMm8VMNXjcCk7eTawoBCPCA" },
  // Resolved by handle (well-known channels not in the Feedspot ID list):
  { name: "PokeRev", category: "YOUTUBER", handle: "PokeRev" },
  { name: "DanshGames", category: "STREAMER_BREAKER", handle: "DanshGames" },
  // PokeGuardian's channel doubles as their news outlet (site added in RESOURCES below).
  { name: "PokeGuardian (YouTube)", category: "NEWS_BLOG", channelId: "UCd8atw_LNeXe2WMqS50vBMA",
    links: [{ platform: "website", url: "https://www.pokeguardian.com" }] },
];

// ── Non-YouTube resources (canonical first-party URLs) ──
const RESOURCES: Seed[] = [
  // Grading
  { name: "PSA (Professional Sports Authenticator)", category: "GRADING", links: [{ platform: "website", url: "https://www.psacard.com" }] },
  { name: "Beckett Grading Services (BGS)", category: "GRADING", links: [{ platform: "website", url: "https://www.beckett.com" }] },
  { name: "CGC Cards", category: "GRADING", links: [{ platform: "website", url: "https://www.cgccards.com" }] },
  { name: "SGC (Sportscard Guaranty)", category: "GRADING", links: [{ platform: "website", url: "https://www.gosgc.com" }] },
  { name: "TAG Grading", category: "GRADING", links: [{ platform: "website", url: "https://www.taggrading.com" }] },
  { name: "ACE Grading", category: "GRADING", links: [{ platform: "website", url: "https://acegrading.com" }] },
  // Marketplaces
  { name: "TCGplayer", category: "MARKETPLACE", links: [{ platform: "website", url: "https://www.tcgplayer.com" }] },
  { name: "Whatnot", category: "MARKETPLACE", links: [{ platform: "website", url: "https://www.whatnot.com" }] },
  { name: "eBay", category: "MARKETPLACE", links: [{ platform: "website", url: "https://www.ebay.com" }] },
  { name: "Cardmarket", category: "MARKETPLACE", links: [{ platform: "website", url: "https://www.cardmarket.com" }] },
  { name: "Troll and Toad", category: "MARKETPLACE", links: [{ platform: "website", url: "https://www.trollandtoad.com" }] },
  // News / info
  { name: "PokéBeach", category: "NEWS_BLOG", links: [{ platform: "website", url: "https://www.pokebeach.com" }] },
  { name: "Serebii.net", category: "NEWS_BLOG", links: [{ platform: "website", url: "https://www.serebii.net" }] },
  { name: "Bulbapedia", category: "NEWS_BLOG", links: [{ platform: "website", url: "https://bulbapedia.bulbagarden.net" }] },
  { name: "Card Chill", category: "NEWS_BLOG", links: [{ platform: "website", url: "https://cardchill.com" }] },
  // Tools / price data
  { name: "PriceCharting", category: "TOOL_SITE", links: [{ platform: "website", url: "https://www.pricecharting.com/category/pokemon-cards" }] },
  { name: "Collectr", category: "TOOL_SITE", links: [{ platform: "website", url: "https://www.getcollectr.com" }] },
  { name: "PokemonPriceTracker", category: "TOOL_SITE", links: [{ platform: "website", url: "https://www.pokemonpricetracker.com" }] },
  // Podcasts
  { name: "It's Super Effective", category: "PODCAST", links: [{ platform: "website", url: "https://www.pkmncast.com" }] },
  // Community
  { name: "Elite Fourum", category: "COMMUNITY", links: [{ platform: "website", url: "https://www.elitefourum.com" }] },
  { name: "r/PokemonTCG", category: "COMMUNITY", links: [{ platform: "website", url: "https://www.reddit.com/r/PokemonTCG" }] },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

async function upsertEntry(seed: Seed, resolved: YTChannelStats | null) {
  const slug = slugify(seed.name);
  const links: Link[] = [...(seed.links ?? [])];
  const channelId = resolved?.channelId ?? null;
  if (channelId) {
    links.unshift({ platform: "youtube", url: `https://www.youtube.com/channel/${channelId}` });
  }

  const data = {
    name: seed.name,
    category: seed.category,
    avatarUrl: resolved?.avatarUrl ?? null,
    youtubeChannelId: channelId,
    ytSubscribers: resolved?.subscribers ?? null,
    status: "live",
  };

  await db.entry.upsert({
    where: { slug },
    update: { ...data, links: { deleteMany: {}, create: links } },
    create: { slug, ...data, links: { create: links } },
  });
}

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  console.log(apiKey ? "YouTube API key present — verifying channels." : "⚠ No YOUTUBE_API_KEY — YouTube entries will save without channel data.");

  // 1. Batch-resolve all channelId creators against the live API.
  const ids = [...new Set(CREATORS.filter((c) => c.channelId).map((c) => c.channelId!))];
  const stats = await fetchYouTubeChannels(ids);
  const byId = new Map(stats.map((s) => [s.channelId, s]));
  console.log(`Resolved ${stats.length}/${ids.length} channels by ID.`);

  let added = 0;
  let skipped = 0;

  for (const seed of CREATORS) {
    let resolved: YTChannelStats | null = null;
    if (seed.channelId) {
      resolved = byId.get(seed.channelId) ?? null;
      if (!resolved && apiKey) {
        console.warn(`  ! ${seed.name}: channelId did not resolve — skipping`);
        skipped++;
        continue;
      }
    } else if (seed.handle) {
      resolved = await fetchYouTubeByHandle(seed.handle);
      if (!resolved && apiKey) {
        console.warn(`  ! ${seed.name}: handle @${seed.handle} did not resolve — skipping`);
        skipped++;
        continue;
      }
    }
    await upsertEntry(seed, resolved);
    added++;
  }

  for (const seed of RESOURCES) {
    await upsertEntry(seed, null);
    added++;
  }

  const total = await db.entry.count();
  console.log(`\n✅ Seeded ${added} entries (${skipped} skipped). Directory now holds ${total} entries.`);
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error("Seed failed:", e);
  await db.$disconnect();
  process.exit(1);
});
