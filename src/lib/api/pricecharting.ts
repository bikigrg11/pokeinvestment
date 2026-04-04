/**
 * PriceCharting.com API client
 * Docs: https://www.pricecharting.com/api-overview
 *
 * Used for: fetching raw, graded PSA 9, and PSA 10 prices for Pokémon cards.
 * PriceCharting tracks real sold prices from eBay and other marketplaces.
 *
 * Required env var:
 *   PRICECHARTING_API_KEY — get a free key at https://www.pricecharting.com/api
 *
 * Pricing tiers:
 *   Free  : limited calls/day, no graded prices
 *   $15/mo: full access including graded prices (PSA 9, PSA 10)
 */

const BASE_URL = "https://www.pricecharting.com/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PricechartingProduct {
  id: string;
  "product-name": string;
  "console-name": string;
  "price-charting-id": number;
  /** Loose/raw price in cents */
  "loose-price": number;
  /** Complete (with accessories) price in cents */
  "complete-price"?: number;
  /** Graded PSA 9 equivalent in cents */
  "graded-price"?: number;
  /** Graded PSA 10 in cents */
  "manual-only-price"?: number;
}

interface SearchResponse {
  status: string;
  products: PricechartingProduct[];
}

// ─── Client ───────────────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.PRICECHARTING_API_KEY;
  if (!key) throw new Error("PRICECHARTING_API_KEY not set in .env");
  return key;
}

/**
 * Search PriceCharting for a Pokémon card by name.
 * Returns up to 10 matching products.
 */
export async function searchPricechartingCard(
  cardName: string,
  setName?: string
): Promise<PricechartingProduct[]> {
  const key = getApiKey();
  const q = setName ? `${cardName} ${setName}` : cardName;

  const res = await fetch(
    `${BASE_URL}/products?q=${encodeURIComponent(q)}&t=${encodeURIComponent(key)}`
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PriceCharting search failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as SearchResponse;
  // Filter to Pokémon console only
  return (data.products ?? []).filter(
    (p) => p["console-name"]?.toLowerCase().includes("pokemon")
  );
}

/**
 * Fetch prices for a specific PriceCharting product by ID.
 */
export async function getPricechartingPrices(
  productId: string | number
): Promise<PricechartingProduct | null> {
  const key = getApiKey();

  const res = await fetch(
    `${BASE_URL}/product?id=${productId}&t=${encodeURIComponent(key)}`
  );

  if (res.status === 404) return null;

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PriceCharting product fetch failed (${res.status}): ${text}`);
  }

  return (await res.json()) as PricechartingProduct;
}

/**
 * Find the best-matching PriceCharting product for a card and return its prices.
 * Returns null if no match found or API key not set.
 *
 * Price fields (all in cents):
 *   loosePrice  — raw/ungraded market price
 *   psa9Price   — PSA 9 graded price
 *   psa10Price  — PSA 10 graded price
 */
export async function getCardGradedPrices(
  cardName: string,
  setName: string
): Promise<{ loosePrice: number | null; psa9Price: number | null; psa10Price: number | null } | null> {
  try {
    const results = await searchPricechartingCard(cardName, setName);
    if (results.length === 0) return null;

    // Take the closest name match (first result is usually best)
    const product = results[0];
    const prices = await getPricechartingPrices(product["price-charting-id"]);
    if (!prices) return null;

    return {
      loosePrice:  prices["loose-price"] > 0   ? prices["loose-price"]        : null,
      psa9Price:   (prices["graded-price"] ?? 0) > 0  ? prices["graded-price"]!       : null,
      psa10Price:  (prices["manual-only-price"] ?? 0) > 0 ? prices["manual-only-price"]! : null,
    };
  } catch {
    return null;
  }
}
