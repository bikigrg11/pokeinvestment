import { memo } from "react";

const SIGNAL_COLORS: Record<string, string> = {
  Undervalued: "#22d3ee",
  Momentum: "#f59e0b",
  GradingCandidate: "#a78bfa",
  HighLiquidity: "#34d399",
  CollectorFavorite: "#f472b6",
  Breakout: "#fb923c",
  SteadyGainer: "#60a5fa",
  BlueChip: "#fbbf24",
};

interface SignalBadgeProps {
  signal: string;
}

export const SignalBadge = memo(function SignalBadge({ signal }: SignalBadgeProps) {
  const color = SIGNAL_COLORS[signal] ?? "#64748b";
  const label = signal.replace(/([A-Z])/g, " $1").trim(); // "GradingCandidate" → "Grading Candidate"

  return (
    <span
      style={{
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        display: "inline-block",
      }}
    >
      {label}
    </span>
  );
});
