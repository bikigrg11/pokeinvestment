"use client";

import { memo } from "react";

interface BuyScoreRingProps {
  score: number;
  size?: number;
  showLabel?: boolean;
}

export const BuyScoreRing = memo(function BuyScoreRing({
  score,
  size = 64,
  showLabel = true,
}: BuyScoreRingProps) {
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  const color =
    score >= 80 ? "var(--pos)" : score >= 60 ? "var(--accent)" : score >= 40 ? "#fb923c" : "var(--neg)";

  return (
    <div style={{ position: "relative", width: size, height: size, display: "inline-block" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={`${(circ * score) / 100} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: size * 0.3,
            fontWeight: 800,
            color,
            fontFamily: "var(--font-mono)",
            lineHeight: 1,
          }}
        >
          {score}
        </span>
        {showLabel && (
          <span
            style={{
              fontSize: size * 0.13,
              color: "var(--text-3)",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              marginTop: 1,
            }}
          >
            score
          </span>
        )}
      </div>
    </div>
  );
});
