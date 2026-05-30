import { createHash } from "crypto";

/**
 * Anonymous, rotating voter/submitter fingerprint for the no-login Creator Hub.
 * The daily salt means a fingerprint cannot be tracked across days, while still
 * deduping votes and rate-limiting submissions within a single day.
 */
export function voterHash(ip: string, ua: string, day: Date): string {
  const salt = day.toISOString().slice(0, 10); // YYYY-MM-DD
  return createHash("sha256").update(`${ip}|${ua}|${salt}`).digest("hex");
}

const BANNED_TERMS = [
  "viagra",
  "casino",
  "porn",
  "crypto airdrop",
  "free money",
  "click here to win",
];

const URL_RE = /https?:\/\/\S+/gi;

/** Cheap, dependency-free spam screen for open submissions. */
export function isSpam(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  if (BANNED_TERMS.some((t) => lower.includes(t))) return true;
  const urls = text.match(URL_RE);
  if (urls && urls.length > 2) return true;
  return false;
}
