"use client";

import { memo } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface MiniSparklineProps {
  data: Array<{ value: number }>;
  color?: string;
  height?: number;
  width?: number | string;
}

export const MiniSparkline = memo(function MiniSparkline({
  data,
  color,
  height = 40,
  width = 100,
}: MiniSparklineProps) {
  if (!data || data.length === 0) {
    return <div style={{ width, height, opacity: 0.2, background: "var(--bg-panel-2)", borderRadius: 2 }} />;
  }

  // Auto-detect color from trend if not provided
  const effectiveColor = color ?? (data[data.length - 1].value >= data[0].value ? "var(--pos)" : "var(--neg)");
  const gradId = `spark-${String(effectiveColor).replace(/[^a-z0-9]/gi, "")}`;

  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={effectiveColor} stopOpacity={0.3} />
            <stop offset="100%" stopColor={effectiveColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={effectiveColor}
          fill={`url(#${gradId})`}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});
