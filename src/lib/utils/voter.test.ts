import { describe, it, expect } from "vitest";
import { voterHash, isSpam } from "./voter";

describe("voterHash", () => {
  const day = new Date("2026-05-29T12:00:00Z");

  it("is deterministic for the same ip+ua+day", () => {
    expect(voterHash("1.2.3.4", "UA", day)).toBe(voterHash("1.2.3.4", "UA", day));
  });

  it("differs when the day changes (daily salt)", () => {
    const next = new Date("2026-05-30T12:00:00Z");
    expect(voterHash("1.2.3.4", "UA", day)).not.toBe(voterHash("1.2.3.4", "UA", next));
  });

  it("differs for different IPs", () => {
    expect(voterHash("1.2.3.4", "UA", day)).not.toBe(voterHash("9.9.9.9", "UA", day));
  });

  it("returns a 64-char hex string", () => {
    expect(voterHash("1.2.3.4", "UA", day)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("isSpam", () => {
  it("flags text containing more than two URLs", () => {
    expect(isSpam("buy http://a.com http://b.com http://c.com now")).toBe(true);
  });

  it("flags banned promo terms", () => {
    expect(isSpam("CHEAP VIAGRA cards")).toBe(true);
  });

  it("passes a normal creator bio", () => {
    expect(isSpam("Vintage WOTC breaks every Friday at twitch.tv/example")).toBe(false);
  });

  it("passes empty input", () => {
    expect(isSpam("")).toBe(false);
  });
});
