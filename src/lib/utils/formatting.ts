export const formatCents = (cents: number | null | undefined): string => {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const toCents = (dollars: number): number => Math.round(dollars * 100);

export const formatPct = (
  pct: number | null | undefined,
  decimals = 2,
  showPlus = true
): string => {
  if (pct == null) return "—";
  const sign = pct >= 0 && showPlus ? "+" : "";
  return `${sign}${pct.toFixed(decimals)}%`;
};

export const formatNum = (n: number | null | undefined, decimals = 2): string => {
  if (n == null) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatMillions = (cents: number | null | undefined): string => {
  if (cents == null) return "—";
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`;
  return formatCents(cents);
};

/** Returns the Tailwind class for a positive/negative/neutral value. */
export const pctColor = (n: number | null | undefined): string => {
  if (n == null) return "text-slate-400";
  return n > 0 ? "text-green-400" : n < 0 ? "text-red-400" : "text-slate-400";
};

/** Returns the hex color for a positive/negative/neutral value. */
export const clr = (n: number | null | undefined): string => {
  if (n == null) return "#94a3b8";
  return n > 0 ? "#22c55e" : n < 0 ? "#ef4444" : "#94a3b8";
};
