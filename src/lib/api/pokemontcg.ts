// pokemontcg.io API client
// Docs: https://docs.pokemontcg.io
// Rate limits: 20,000/day with API key, 100/day without

const BASE_URL = "https://api.pokemontcg.io/v2";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TCGPriceVariant {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
}

export interface TCGCard {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  hp?: string;
  types?: string[];
  number: string;
  artist?: string;
  rarity?: string;
  set: {
    id: string;
    name: string;
    series: string;
    releaseDate: string;
  };
  images: {
    small: string;
    large: string;
  };
  tcgplayer?: {
    url: string;
    updatedAt: string;
    prices?: {
      holofoil?: TCGPriceVariant;
      reverseHolofoil?: TCGPriceVariant;
      normal?: TCGPriceVariant;
      "1stEditionHolofoil"?: TCGPriceVariant;
      "1stEditionNormal"?: TCGPriceVariant;
      unlimitedHolofoil?: TCGPriceVariant;
    };
  };
  cardmarket?: {
    url: string;
    prices?: {
      averageSellPrice?: number;
      lowPrice?: number;
      trendPrice?: number;
    };
  };
}

export interface TCGSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  legalities?: Record<string, string>;
  releaseDate?: string;
  images: {
    symbol: string;
    logo: string;
  };
}

// Price variant priority — most investment-relevant first
export const VARIANT_PRIORITY = [
  "holofoil",
  "1stEditionHolofoil",
  "unlimitedHolofoil",
  "reverseHolofoil",
  "normal",
  "1stEditionNormal",
] as const;

export type PriceVariantKey = (typeof VARIANT_PRIORITY)[number];

// ─── In-memory cache ─────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet<T>(key: string, data: T, ttlMs = CACHE_TTL_MS): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ─── Fetch helper with retry ──────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  params?: Record<string, string | number>
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
  }

  const key = url.toString();
  const cached = cacheGet<T>(key);
  if (cached !== null) return cached;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const apiKey = process.env.POKEMON_TCG_API_KEY;
  if (apiKey) headers["X-Api-Key"] = apiKey;

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url.toString(), { headers });

    if (res.status === 429) {
      // Rate limited — back off exponentially
      await delay(1000 * Math.pow(2, attempt));
      continue;
    }

    if (!res.ok) {
      throw new Error(`pokemontcg.io ${res.status}: ${path}`);
    }

    const data = (await res.json()) as T;
    cacheSet(key, data);
    return data;
  }

  throw new Error(`pokemontcg.io: too many retries for ${path}`);
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Public API ───────────────────────────────────────────────────────────────

/** Fetch all sets (cached 1 hour). */
export async function fetchSets(): Promise<TCGSet[]> {
  const cacheKey = "sets:all";
  const cached = cacheGet<TCGSet[]>(cacheKey);
  if (cached) return cached;

  const data = await apiFetch<{ data: TCGSet[] }>("/sets", { pageSize: 250 });
  cacheSet(cacheKey, data.data);
  return data.data;
}

/** Fetch a single card by its pokemontcg.io ID. */
export async function fetchCard(id: string): Promise<TCGCard | null> {
  try {
    const data = await apiFetch<{ data: TCGCard }>(`/cards/${id}`);
    return data.data;
  } catch {
    return null;
  }
}

export interface FetchCardsOptions {
  setId?: string;
  page?: number;
  pageSize?: number;
  q?: string;
}

export interface FetchCardsResult {
  cards: TCGCard[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/** Fetch cards with optional set filter and pagination. */
export async function fetchCards(opts: FetchCardsOptions = {}): Promise<FetchCardsResult> {
  const { setId, page = 1, pageSize = 250, q } = opts;

  const queryParts: string[] = [];
  if (setId) queryParts.push(`set.id:${setId}`);
  if (q) queryParts.push(q);
  const query = queryParts.join(" ");

  const params: Record<string, string | number> = { page, pageSize };
  if (query) params.q = query;

  const data = await apiFetch<{
    data: TCGCard[];
    totalCount: number;
    page: number;
    pageSize: number;
  }>("/cards", params);

  return {
    cards: data.data,
    totalCount: data.totalCount,
    page: data.page,
    pageSize: data.pageSize,
  };
}

/** Fetch ALL cards in a set, handling pagination automatically. */
export async function fetchAllCardsInSet(
  setId: string,
  delayMs = 100
): Promise<TCGCard[]> {
  const all: TCGCard[] = [];
  let page = 1;

  while (true) {
    const result = await fetchCards({ setId, page, pageSize: 250 });
    all.push(...result.cards);

    if (all.length >= result.totalCount || result.cards.length < result.pageSize) break;
    page++;
    if (delayMs > 0) await delay(delayMs);
  }

  return all;
}

// ─── Price extraction helpers ─────────────────────────────────────────────────

/** Extract all available price variants from a card's TCGPlayer data. */
export function extractPriceVariants(
  card: TCGCard
): Array<{ variant: string; prices: TCGPriceVariant }> {
  const variants: Array<{ variant: string; prices: TCGPriceVariant }> = [];
  const tcgPrices = card.tcgplayer?.prices;
  if (!tcgPrices) return variants;

  for (const variant of VARIANT_PRIORITY) {
    const p = tcgPrices[variant as keyof typeof tcgPrices];
    if (p && (p.market != null || p.mid != null || p.low != null)) {
      variants.push({ variant, prices: p });
    }
  }
  return variants;
}

/** Get the best (highest market price) variant for a card. */
export function getBestVariant(
  card: TCGCard
): { variant: string; prices: TCGPriceVariant } | null {
  const variants = extractPriceVariants(card);
  if (!variants.length) return null;

  // Prefer holofoil if present; otherwise take highest market price
  const holo = variants.find((v) => v.variant === "holofoil");
  if (holo) return holo;

  return variants.reduce((best, cur) => {
    const bestPrice = best.prices.market ?? best.prices.mid ?? 0;
    const curPrice = cur.prices.market ?? cur.prices.mid ?? 0;
    return curPrice > bestPrice ? cur : best;
  });
}

/** Convert dollars to cents (rounds to nearest cent). */
export function dollarsToCents(dollars: number | undefined | null): number | null {
  if (dollars == null || isNaN(dollars)) return null;
  return Math.round(dollars * 100);
}
