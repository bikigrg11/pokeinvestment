import { describe, it, expect } from "vitest";
import { computeHeatScores, type HeatInput } from "./creator-heat";

describe("computeHeatScores", () => {
  it("returns 0 for an entry with no signal", () => {
    const inputs: HeatInput[] = [
      { entryId: "a", ytGrowth7d: null, upvoteVel7d: 0, viewVel7d: 0 },
    ];
    expect(computeHeatScores(inputs).get("a")).toBe(0);
  });

  it("ranks the strongest entry highest and scales 0-100", () => {
    const inputs: HeatInput[] = [
      { entryId: "low", ytGrowth7d: 0.0, upvoteVel7d: 0, viewVel7d: 0 },
      { entryId: "mid", ytGrowth7d: 0.05, upvoteVel7d: 5, viewVel7d: 10 },
      { entryId: "high", ytGrowth7d: 0.2, upvoteVel7d: 50, viewVel7d: 100 },
    ];
    const scores = computeHeatScores(inputs);
    expect(scores.get("high")).toBe(100);
    expect(scores.get("low")).toBe(0);
    expect(scores.get("mid")!).toBeGreaterThan(0);
    expect(scores.get("mid")!).toBeLessThan(100);
  });

  it("treats null ytGrowth as the lowest growth value", () => {
    const inputs: HeatInput[] = [
      { entryId: "nogrowth", ytGrowth7d: null, upvoteVel7d: 10, viewVel7d: 10 },
      { entryId: "growth", ytGrowth7d: 0.1, upvoteVel7d: 10, viewVel7d: 10 },
    ];
    const scores = computeHeatScores(inputs);
    expect(scores.get("growth")!).toBeGreaterThan(scores.get("nogrowth")!);
  });

  it("returns an empty map for empty input", () => {
    expect(computeHeatScores([]).size).toBe(0);
  });
});
