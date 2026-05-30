export interface HeatInput {
  entryId: string;
  ytGrowth7d: number | null; // fractional 7-day subscriber growth, null if no channel
  upvoteVel7d: number; // net upvotes in last 7 days
  viewVel7d: number; // profile views in last 7 days
}

// Weights — see spec. Tunable.
const W_GROWTH = 0.5;
const W_UPVOTE = 0.3;
const W_VIEW = 0.2;

/** Percentile rank of each value within `values`, in [0,1]. Ties share the lower rank. */
function percentiles(values: number[]): number[] {
  const n = values.length;
  if (n <= 1) return values.map(() => 0);
  return values.map((v) => {
    const below = values.filter((x) => x < v).length;
    return below / (n - 1);
  });
}

/**
 * Recency-weighted "trending now" score per entry, scaled 0-100.
 * Each signal is converted to a percentile rank across all entries, then blended.
 * Entries whose every signal is the minimum collapse to 0.
 */
export function computeHeatScores(inputs: HeatInput[]): Map<string, number> {
  const out = new Map<string, number>();
  if (inputs.length === 0) return out;

  // null growth sorts as the lowest value so "no channel" never beats real growth.
  const growth = inputs.map((i) => (i.ytGrowth7d == null ? -Infinity : i.ytGrowth7d));
  const upvote = inputs.map((i) => i.upvoteVel7d);
  const view = inputs.map((i) => i.viewVel7d);

  const pg = percentiles(growth);
  const pu = percentiles(upvote);
  const pv = percentiles(view);

  inputs.forEach((input, idx) => {
    const blended = W_GROWTH * pg[idx] + W_UPVOTE * pu[idx] + W_VIEW * pv[idx];
    out.set(input.entryId, Math.round(blended * 100));
  });
  return out;
}
