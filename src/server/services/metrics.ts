// Investment metric calculation functions — all pure, no side effects.
// All prices in cents (integers) unless noted.

// ─── Types ────────────────────────────────────────────────────────────────────

export type Signal =
  | "Undervalued"
  | "Momentum"
  | "GradingCandidate"
  | "HighLiquidity"
  | "CollectorFavorite"
  | "Breakout"
  | "SteadyGainer"
  | "BlueChip";

export interface PricePoint {
  date: Date;
  priceC: number;
  volume?: number;
}

export interface CardForSignals {
  id: string;
  rarity: string | null;
  releaseDate: Date | null; // card's set release date
  setReleaseDate: Date | null; // set.releaseDate (same value, passed separately for clarity)
  priceHistory: PricePoint[]; // oldest → newest, marketPrice in cents
  latestPsa10PriceC: number | null;
  latestRawPriceC: number | null;
  latestVolume: number | null;
  releasePriceC: number | null; // approximate release price for ROI calc
}

export interface SignalContext {
  /** 80th-percentile volume across all tracked cards (for HighLiquidity) */
  volume80thPercentile: number;
  /** Set of card IDs in the top-50 by current market cap (for BlueChip) */
  top50ByMarketCap: Set<string>;
}

export interface IndexComponent {
  cardId: string;
  weight: number;
  price: number; // current market price in cents
}

export interface IndexResult {
  value: number;
  components: IndexComponent[];
  totalMarketCap: number; // sum of market prices in cents
}

// ─── Core Metrics ─────────────────────────────────────────────────────────────

/** ROI: (current − purchase) / purchase, as a decimal (0.15 = 15%). */
export function calculateROI(currentPriceC: number, purchasePriceC: number): number {
  if (purchasePriceC <= 0) return 0;
  return (currentPriceC - purchasePriceC) / purchasePriceC;
}

/** CAGR: annualised return as a decimal. */
export function calculateCAGR(
  currentPriceC: number,
  purchasePriceC: number,
  years: number
): number {
  if (years <= 0 || purchasePriceC <= 0 || currentPriceC <= 0) return 0;
  return Math.pow(currentPriceC / purchasePriceC, 1 / years) - 1;
}

/**
 * Volatility: population std-dev of daily log-returns over the most recent
 * `days` data points, annualised (× √365).
 */
export function calculateVolatility(prices: PricePoint[], days = 30): number {
  const recent = prices.slice(-days);
  if (recent.length < 2) return 0;

  const logReturns: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1].priceC;
    const cur = recent[i].priceC;
    if (prev > 0 && cur > 0) logReturns.push(Math.log(cur / prev));
  }
  if (logReturns.length === 0) return 0;

  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  const variance =
    logReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / logReturns.length;
  return Math.sqrt(variance) * Math.sqrt(365); // annualised
}

/** Liquidity score 0–100 relative to the market average volume. */
export function calculateLiquidity(volume: number, marketAvgVolume: number): number {
  if (marketAvgVolume <= 0) return 0;
  return Math.min(100, Math.round((volume / marketAvgVolume) * 50));
}

/** Grading upside multiple (PSA 10 price ÷ raw price). */
export function calculateGradingUpside(psa10PriceC: number, rawPriceC: number): number {
  if (rawPriceC <= 0) return 0;
  return psa10PriceC / rawPriceC;
}

// ─── Helper: moving average ───────────────────────────────────────────────────

/** Simple arithmetic moving average of priceC over the last `days` points. */
function movingAvg(prices: PricePoint[], days: number): number | null {
  const slice = prices.slice(-days);
  if (slice.length === 0) return null;
  return slice.reduce((sum, p) => sum + p.priceC, 0) / slice.length;
}

/** Price N data points back from the end (or null if not enough history). */
function priceNBack(prices: PricePoint[], n: number): number | null {
  if (prices.length <= n) return null;
  return prices[prices.length - 1 - n].priceC;
}

// ─── Signal Generation ────────────────────────────────────────────────────────

/**
 * Generate investment signal tags for a card.
 * Context is optional — signals that need it (HighLiquidity, BlueChip) are
 * silently skipped when context is omitted.
 */
export function generateSignals(
  card: CardForSignals,
  context?: Partial<SignalContext>
): Signal[] {
  const signals: Signal[] = [];
  const prices = card.priceHistory;
  const latest = prices.at(-1);
  if (!latest) return signals;

  const latestPrice = latest.priceC;

  // ── Undervalued ─────────────────────────────────────────────────────────────
  // Price below 90-day MA by >15% AND positive volume trend (last 7d avg > prior 7d avg)
  const ma90 = movingAvg(prices, 90);
  if (ma90 !== null && latestPrice < ma90 * 0.85) {
    const vol7 = prices.slice(-7).reduce((s, p) => s + (p.volume ?? 0), 0) / 7;
    const vol7prev = prices.slice(-14, -7).reduce((s, p) => s + (p.volume ?? 0), 0) / 7;
    if (vol7 > vol7prev) signals.push("Undervalued");
  }

  // ── Momentum ────────────────────────────────────────────────────────────────
  // Price up >10% in last 7 data points AND volume increasing
  const price7dAgo = priceNBack(prices, 7);
  if (price7dAgo !== null && price7dAgo > 0) {
    const change7d = (latestPrice - price7dAgo) / price7dAgo;
    const vol7 = prices.slice(-7).reduce((s, p) => s + (p.volume ?? 0), 0) / 7;
    const vol7prev = prices.slice(-14, -7).reduce((s, p) => s + (p.volume ?? 0), 0) / 7;
    if (change7d > 0.1 && vol7 > vol7prev) signals.push("Momentum");
  }

  // ── Grading Candidate ───────────────────────────────────────────────────────
  // PSA10/raw > 3x AND raw price > $5 (500 cents)
  if (
    card.latestPsa10PriceC != null &&
    card.latestRawPriceC != null &&
    card.latestRawPriceC > 500
  ) {
    const ratio = card.latestPsa10PriceC / card.latestRawPriceC;
    if (ratio > 3) signals.push("GradingCandidate");
  }

  // ── High Liquidity ──────────────────────────────────────────────────────────
  // Volume in top 20% of all tracked cards (80th percentile threshold from context)
  if (
    context?.volume80thPercentile != null &&
    card.latestVolume != null &&
    card.latestVolume >= context.volume80thPercentile
  ) {
    signals.push("HighLiquidity");
  }

  // ── Collector Favorite ──────────────────────────────────────────────────────
  // From a vintage set (released before 2005) AND rarity is Rare Holo or above
  const releaseYear = (card.setReleaseDate ?? card.releaseDate)?.getFullYear() ?? 9999;
  const rarityScore = rarityRank(card.rarity);
  if (releaseYear < 2005 && rarityScore >= RARITY_RARE_HOLO_RANK) {
    signals.push("CollectorFavorite");
  }

  // ── Breakout ────────────────────────────────────────────────────────────────
  // Price up >25% in 30 data points AND prior-30d volatility was low (<0.15 annualised)
  const price30dAgo = priceNBack(prices, 30);
  if (price30dAgo !== null && price30dAgo > 0) {
    const change30d = (latestPrice - price30dAgo) / price30dAgo;
    const priorVol = calculateVolatility(prices.slice(0, -30), 30);
    if (change30d > 0.25 && priorVol < 0.15) signals.push("Breakout");
  }

  // ── Steady Gainer ───────────────────────────────────────────────────────────
  // Positive price change in each of the last 6 monthly windows (≈180 data points)
  if (prices.length >= 180) {
    const monthlyReturns: number[] = [];
    for (let i = 0; i < 6; i++) {
      const end = prices[prices.length - 1 - i * 30]?.priceC ?? 0;
      const start = prices[prices.length - 1 - (i + 1) * 30]?.priceC ?? 0;
      if (start > 0) monthlyReturns.push(end - start);
    }
    if (monthlyReturns.length === 6 && monthlyReturns.every((r) => r > 0)) {
      signals.push("SteadyGainer");
    }
  }

  // ── Blue Chip ───────────────────────────────────────────────────────────────
  // In top-50 by market cap AND >100% ROI since release
  if (context?.top50ByMarketCap?.has(card.id)) {
    if (card.releasePriceC != null && card.releasePriceC > 0) {
      const roi = calculateROI(latestPrice, card.releasePriceC);
      if (roi > 1.0) signals.push("BlueChip");
    }
  }

  return signals;
}

// ─── Rarity Ranking ──────────────────────────────────────────────────────────

const RARITY_RARE_HOLO_RANK = 4;

const RARITY_RANKS: Record<string, number> = {
  Common: 1,
  Uncommon: 2,
  Rare: 3,
  "Rare Holo": 4,
  "Rare Holo EX": 5,
  "Rare Holo GX": 5,
  "Rare Holo V": 5,
  "Rare Ultra": 6,
  "Ultra Rare": 6,
  "Rare Secret": 7,
  "Secret Rare": 7,
  "Illustration Rare": 7,
  "Special Illustration Rare": 8,
  "Special Art Rare": 8,
  "Hyper Rare": 9,
  "Gold Star": 10,
  "Amazing Rare": 6,
  "Radiant Rare": 6,
  "Trainer Gallery Rare Holo": 5,
};

function rarityRank(rarity: string | null): number {
  if (!rarity) return 0;
  return RARITY_RANKS[rarity] ?? 3; // default to Rare if unknown
}

// ─── Pokemon 250 Index ────────────────────────────────────────────────────────

/**
 * Calculate the Pokemon 250 Index — equal-weight basket of the top 250 cards
 * by current market price.  Re-indexes against `previousValue` so the series
 * is continuous.
 */
export function calculateIndex(
  /** Cards sorted by descending market price; pass up to 250. */
  topCards: Array<{ id: string; latestPriceC: number }>,
  /** Previous index value for chain-linking (use 1000 for first snapshot). */
  previousValue: number
): IndexResult {
  const components = topCards.slice(0, 250);
  if (components.length === 0) {
    return { value: previousValue, components: [], totalMarketCap: 0 };
  }

  const totalMarketCap = components.reduce((sum, c) => sum + c.latestPriceC, 0);
  const weight = 1 / components.length; // equal-weight

  // Avg price relative to previous basket avg — kept simple for MVP
  const avgPrice = totalMarketCap / components.length;

  return {
    value: Math.round((previousValue * avgPrice) / (avgPrice || 1) * 100) / 100,
    components: components.map((c) => ({
      cardId: c.id,
      weight,
      price: c.latestPriceC,
    })),
    totalMarketCap,
  };
}
