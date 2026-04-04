/**
 * eBay Browse API client
 * Docs: https://developer.ebay.com/api-docs/buy/browse/overview.html
 *
 * Used for: fetching recent SOLD listing prices for graded cards (PSA 10, PSA 9)
 * and raw card sold prices to populate psa10Price, rawPrice, and volume fields.
 *
 * Required env vars:
 *   EBAY_CLIENT_ID     — from developer.ebay.com app credentials
 *   EBAY_CLIENT_SECRET — from developer.ebay.com app credentials
 *
 * Sign up free at: https://developer.ebay.com
 */

const EBAY_AUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EbayTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface EbayItemSummary {
  itemId: string;
  title: string;
  price: { value: string; currency: string };
  condition: string;
  itemEndDate?: string;
  buyingOptions: string[];
}

interface EbaySearchResponse {
  itemSummaries?: EbayItemSummary[];
  total?: number;
  next?: string;
}

export interface EbaySoldResult {
  medianPrice: number | null;   // cents
  averagePrice: number | null;  // cents
  minPrice: number | null;      // cents
  maxPrice: number | null;      // cents
  saleCount: number;
  rawPrices: number[];          // cents
}

// ─── OAuth token cache ────────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set in .env");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(EBAY_AUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay auth failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as EbayTokenResponse;
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

// ─── Search helpers ───────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Search eBay sold listings for a card query.
 * Returns price statistics from recently completed listings.
 *
 * @param query  e.g. "Charizard Base Set PSA 10" or "Pikachu Illustrator raw"
 * @param limit  max results to fetch (max 200)
 */
export async function searchSoldListings(
  query: string,
  limit = 50,
  /** eBay condition IDs to filter by.
   *  1000 = Near Mint or Better (PSA 9/10 slabs)
   *  2000 = Excellent (PSA 7-8)
   *  3000 = Good (raw played cards)
   *  Omit to search all conditions.
   */
  conditionIds?: string
): Promise<EbaySoldResult> {
  const token = await getAccessToken();

  const filter = conditionIds
    ? `buyingOptions:{FIXED_PRICE},conditionIds:{${conditionIds}}`
    : "buyingOptions:{FIXED_PRICE}";

  const params = new URLSearchParams({
    q: query,
    category_ids: "2536",  // Pokémon TCG category on eBay
    limit: String(Math.min(limit, 200)),
    filter,
  });

  const res = await fetch(`${EBAY_SEARCH_URL}?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    },
  });

  if (res.status === 429) {
    await delay(5000);
    return searchSoldListings(query, limit, conditionIds);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay search failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as EbaySearchResponse;
  const items = data.itemSummaries ?? [];

  if (items.length === 0) {
    return { medianPrice: null, averagePrice: null, minPrice: null, maxPrice: null, saleCount: 0, rawPrices: [] };
  }

  // Convert prices to cents
  const prices = items
    .map((item) => Math.round(parseFloat(item.price.value) * 100))
    .filter((p) => p > 0 && p < 10_000_000); // sanity filter ($0–$100k)

  if (prices.length === 0) {
    return { medianPrice: null, averagePrice: null, minPrice: null, maxPrice: null, saleCount: 0, rawPrices: [] };
  }

  prices.sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 === 0
    ? Math.round((prices[mid - 1] + prices[mid]) / 2)
    : prices[mid];
  const average = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);

  return {
    medianPrice: median,
    averagePrice: average,
    minPrice: prices[0],
    maxPrice: prices[prices.length - 1],
    saleCount: prices.length,
    rawPrices: prices,
  };
}

/**
 * Build a search query for a graded card.
 * e.g. buildGradedQuery("Charizard", "Base Set", "PSA", "10")
 */
// Short disambiguating keyword to append for sets where card names are ambiguous.
// e.g. "Shining Charizard" exists in Neo Destiny AND Shining Fates — must add "Neo".
// Key: lowercase substring of set name. Value: short keyword to append to eBay query.
const SET_DISAMBIGUATORS: Array<[string, string]> = [
  ["neo destiny",      "Neo Destiny"],
  ["neo genesis",      "Neo Genesis"],
  ["neo revelation",   "Neo Revelation"],
  ["neo discovery",    "Neo Discovery"],
  ["team rocket",      "Rocket"],
  ["gym heroes",       "Gym"],
  ["gym challenge",    "Gym"],
  ["jungle",           "Jungle"],
  ["fossil",           "Fossil"],
  ["base set 2",       "Base Set 2"],
  ["base set",         "Base Set"],
  ["legendary collection", "Legendary"],
  ["shining fates",    "Shining Fates"],
];

function setDisambiguator(setName: string): string {
  const s = setName.toLowerCase();
  return SET_DISAMBIGUATORS.find(([key]) => s.includes(key))?.[1] ?? "";
}

export function buildGradedQuery(
  cardName: string,
  setName: string,
  gradeCompany = "PSA",
  grade = "10"
): string {
  const name = cardName.replace(/\s+(V|VMAX|VSTAR|ex|GX|EX)$/i, "").slice(0, 30);
  const disambig = setDisambiguator(setName);
  const setContext = disambig ? ` ${disambig}` : "";
  return `${name}${setContext} ${gradeCompany} ${grade}`;
}

/**
 * Build a search query for a raw (ungraded) card.
 */
export function buildRawQuery(cardName: string, setName: string): string {
  const name = cardName.replace(/\s+(V|VMAX|VSTAR|ex|GX|EX)$/i, "").slice(0, 30);
  return `${name} ${setName} raw NM`;
}
