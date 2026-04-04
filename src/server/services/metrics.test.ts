import { describe, it, expect } from "vitest";
import {
  calculateROI,
  calculateCAGR,
  calculateVolatility,
  calculateLiquidity,
  calculateGradingUpside,
  generateSignals,
  calculateIndex,
  type PricePoint,
  type CardForSignals,
} from "./metrics";

// ─── calculateROI ─────────────────────────────────────────────────────────────

describe("calculateROI", () => {
  it("returns correct positive ROI", () => {
    expect(calculateROI(1500, 1000)).toBeCloseTo(0.5);
  });

  it("returns correct negative ROI", () => {
    expect(calculateROI(500, 1000)).toBeCloseTo(-0.5);
  });

  it("returns 0 when purchase price is 0", () => {
    expect(calculateROI(1000, 0)).toBe(0);
  });

  it("returns 0 when prices are equal", () => {
    expect(calculateROI(1000, 1000)).toBe(0);
  });
});

// ─── calculateCAGR ────────────────────────────────────────────────────────────

describe("calculateCAGR", () => {
  it("returns correct CAGR for 2x gain over 5 years", () => {
    // 2^(1/5) - 1 ≈ 0.1487
    expect(calculateCAGR(2000, 1000, 5)).toBeCloseTo(0.1487, 3);
  });

  it("returns 0 for zero years", () => {
    expect(calculateCAGR(2000, 1000, 0)).toBe(0);
  });

  it("returns 0 for zero purchase price", () => {
    expect(calculateCAGR(2000, 0, 5)).toBe(0);
  });

  it("returns 0 for zero current price", () => {
    expect(calculateCAGR(0, 1000, 5)).toBe(0);
  });

  it("handles 1-year period correctly", () => {
    // 50% gain over 1 year = 50% CAGR
    expect(calculateCAGR(1500, 1000, 1)).toBeCloseTo(0.5);
  });
});

// ─── calculateVolatility ──────────────────────────────────────────────────────

describe("calculateVolatility", () => {
  it("returns 0 with fewer than 2 data points", () => {
    const prices: PricePoint[] = [{ date: new Date(), priceC: 1000 }];
    expect(calculateVolatility(prices)).toBe(0);
  });

  it("returns 0 for a completely flat price series", () => {
    const prices: PricePoint[] = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2024, 0, i + 1),
      priceC: 1000,
    }));
    expect(calculateVolatility(prices)).toBe(0);
  });

  it("returns a positive number for a volatile series", () => {
    const prices: PricePoint[] = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2024, 0, i + 1),
      priceC: i % 2 === 0 ? 1000 : 2000, // oscillates +100%/-50%
    }));
    expect(calculateVolatility(prices)).toBeGreaterThan(0);
  });

  it("only uses the last `days` points", () => {
    // First 20 data points are flat; last 10 are volatile
    const flat = Array.from({ length: 20 }, (_, i) => ({
      date: new Date(2024, 0, i + 1),
      priceC: 1000,
    }));
    const volatile = Array.from({ length: 10 }, (_, i) => ({
      date: new Date(2024, 1, i + 1),
      priceC: i % 2 === 0 ? 1000 : 2000,
    }));
    const all = [...flat, ...volatile];
    expect(calculateVolatility(all, 10)).toBeGreaterThan(0);
    expect(calculateVolatility(flat, 10)).toBe(0);
  });
});

// ─── calculateLiquidity ───────────────────────────────────────────────────────

describe("calculateLiquidity", () => {
  it("returns 0 when market average volume is 0", () => {
    expect(calculateLiquidity(500, 0)).toBe(0);
  });

  it("returns 50 when volume equals market average", () => {
    expect(calculateLiquidity(100, 100)).toBe(50);
  });

  it("caps at 100", () => {
    expect(calculateLiquidity(10000, 1)).toBe(100);
  });

  it("returns proportional score", () => {
    // volume is 200% of avg → 50 * 2 = 100, capped
    expect(calculateLiquidity(200, 100)).toBe(100);
    // volume is 50% of avg → 50 * 0.5 = 25
    expect(calculateLiquidity(50, 100)).toBe(25);
  });
});

// ─── calculateGradingUpside ───────────────────────────────────────────────────

describe("calculateGradingUpside", () => {
  it("returns 0 for zero raw price", () => {
    expect(calculateGradingUpside(5000, 0)).toBe(0);
  });

  it("returns correct multiple", () => {
    expect(calculateGradingUpside(3000, 1000)).toBeCloseTo(3.0);
  });

  it("returns <1 when psa10 price is below raw", () => {
    expect(calculateGradingUpside(800, 1000)).toBeCloseTo(0.8);
  });
});

// ─── generateSignals ──────────────────────────────────────────────────────────

function makeCard(overrides: Partial<CardForSignals> = {}): CardForSignals {
  return {
    id: "test-1",
    rarity: "Rare Holo",
    releaseDate: new Date("1999-01-09"),
    setReleaseDate: new Date("1999-01-09"),
    priceHistory: [],
    latestPsa10PriceC: null,
    latestRawPriceC: null,
    latestVolume: null,
    releasePriceC: null,
    ...overrides,
  };
}

function makePrices(values: number[]): PricePoint[] {
  return values.map((priceC, i) => ({
    date: new Date(2024, 0, i + 1),
    priceC,
    volume: 100,
  }));
}

describe("generateSignals", () => {
  it("returns empty array when no price history", () => {
    const card = makeCard();
    expect(generateSignals(card)).toEqual([]);
  });

  it("detects CollectorFavorite for vintage holo", () => {
    const card = makeCard({
      rarity: "Rare Holo",
      setReleaseDate: new Date("1999-01-09"), // Base Set — pre-2005
      priceHistory: makePrices([1000]),
    });
    expect(generateSignals(card)).toContain("CollectorFavorite");
  });

  it("does NOT flag CollectorFavorite for modern set", () => {
    const card = makeCard({
      rarity: "Rare Holo",
      setReleaseDate: new Date("2023-01-01"), // modern
      priceHistory: makePrices([1000]),
    });
    expect(generateSignals(card)).not.toContain("CollectorFavorite");
  });

  it("does NOT flag CollectorFavorite for low rarity vintage", () => {
    const card = makeCard({
      rarity: "Common",
      setReleaseDate: new Date("1999-01-09"),
      priceHistory: makePrices([1000]),
    });
    expect(generateSignals(card)).not.toContain("CollectorFavorite");
  });

  it("detects GradingCandidate when PSA10/raw > 3x and raw > $5", () => {
    const card = makeCard({
      priceHistory: makePrices([1000]),
      latestPsa10PriceC: 4000, // 4x raw
      latestRawPriceC: 1000,   // $10
    });
    expect(generateSignals(card)).toContain("GradingCandidate");
  });

  it("does NOT flag GradingCandidate when raw price is under $5", () => {
    const card = makeCard({
      priceHistory: makePrices([400]),
      latestPsa10PriceC: 2000, // 5x raw but raw < $5
      latestRawPriceC: 400,    // $4
    });
    expect(generateSignals(card)).not.toContain("GradingCandidate");
  });

  it("detects HighLiquidity when volume exceeds 80th percentile", () => {
    const card = makeCard({
      priceHistory: makePrices([1000]),
      latestVolume: 500,
    });
    expect(
      generateSignals(card, { volume80thPercentile: 400 })
    ).toContain("HighLiquidity");
  });

  it("detects Momentum when price rises >10% over 7 data points with higher volume", () => {
    // 14 points: first 7 low volume, next 7 rising price + higher volume
    const prices: PricePoint[] = [
      ...Array.from({ length: 7 }, (_, i) => ({
        date: new Date(2024, 0, i + 1),
        priceC: 1000,
        volume: 50,
      })),
      ...Array.from({ length: 7 }, (_, i) => ({
        date: new Date(2024, 0, i + 8),
        priceC: 1000 + i * 30, // ends at 1180 (>10% gain)
        volume: 150, // higher than prior 7 (avg 50)
      })),
    ];
    const card = makeCard({ priceHistory: prices });
    expect(generateSignals(card)).toContain("Momentum");
  });

  it("detects BlueChip when in top-50 and ROI > 100%", () => {
    const card = makeCard({
      id: "charizard-base1-4",
      priceHistory: makePrices([50000]), // $500 current
      releasePriceC: 500,               // $5 release → 100x = 9900% ROI
    });
    expect(
      generateSignals(card, { top50ByMarketCap: new Set(["charizard-base1-4"]) })
    ).toContain("BlueChip");
  });
});

// ─── calculateIndex ───────────────────────────────────────────────────────────

describe("calculateIndex", () => {
  it("returns previousValue unchanged when no cards", () => {
    const result = calculateIndex([], 1000);
    expect(result.value).toBe(1000);
    expect(result.components).toHaveLength(0);
    expect(result.totalMarketCap).toBe(0);
  });

  it("calculates totalMarketCap correctly", () => {
    const cards = [
      { id: "a", latestPriceC: 1000 },
      { id: "b", latestPriceC: 2000 },
      { id: "c", latestPriceC: 3000 },
    ];
    const result = calculateIndex(cards, 1000);
    expect(result.totalMarketCap).toBe(6000);
  });

  it("assigns equal weights to all components", () => {
    const cards = [
      { id: "a", latestPriceC: 1000 },
      { id: "b", latestPriceC: 2000 },
    ];
    const result = calculateIndex(cards, 1000);
    expect(result.components).toHaveLength(2);
    result.components.forEach((c) => expect(c.weight).toBeCloseTo(0.5));
  });

  it("caps basket at 250 cards", () => {
    const cards = Array.from({ length: 300 }, (_, i) => ({
      id: `card-${i}`,
      latestPriceC: 1000,
    }));
    const result = calculateIndex(cards, 1000);
    expect(result.components).toHaveLength(250);
  });
});
