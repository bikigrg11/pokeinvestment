/** Signal badge colors — theme-agnostic, used across all pages */
export const SIGNAL_COLORS: Record<string, string> = {
  "Blue Chip": "#60a5fa",
  "Momentum": "#fb923c",
  "Grading Candidate": "#a78bfa",
  "Undervalued": "#22d3ee",
  "High Liquidity": "#34d399",
  "Steady Gainer": "#818cf8",
  "Collector Favorite": "#f472b6",
  "Breakout": "#fbbf24",
  "Grail": "#f5f1e8",
};

export function getSignalColor(signal: string): string {
  return SIGNAL_COLORS[signal] ?? "#94a3b8";
}
