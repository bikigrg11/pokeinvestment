"use client";

import { memo, useMemo } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}

export const Sparkline = memo(function Sparkline({
  data,
  width = 120,
  height = 30,
  color,
  fill = true,
}: SparklineProps) {
  const { path, c, gradId } = useMemo(() => {
    const pts = data.slice(-24);
    if (pts.length < 2) return { path: "", c: "var(--text-3)", gradId: "" };
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const rng = max - min || 1;
    const d = pts
      .map((p, i) => {
        const x = (i / (pts.length - 1)) * width;
        const y = height - ((p - min) / rng) * height;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
    const lineColor = color ?? (pts[pts.length - 1] >= pts[0] ? "var(--pos)" : "var(--neg)");
    const id = `sp-${Math.random().toString(36).slice(2, 8)}`;
    return { path: d, c: lineColor, gradId: id };
  }, [data, width, height, color]);

  if (!path) return null;

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {fill && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity="0.3" />
            <stop offset="100%" stopColor={c} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {fill && <path d={`${path} L ${width} ${height} L 0 ${height} Z`} fill={`url(#${gradId})`} />}
      <path d={path} stroke={c} strokeWidth={1.5} fill="none" strokeLinejoin="round" />
    </svg>
  );
});
