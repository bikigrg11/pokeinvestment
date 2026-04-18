"use client";

import { memo } from "react";
import { getSignalColor } from "@/lib/utils/signals";

interface PillProps {
  label: string;
  color?: string;
  filled?: boolean;
}

export const Pill = memo(function Pill({ label, color, filled }: PillProps) {
  const c = color ?? getSignalColor(label);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: filled ? c : `${c}1a`,
        color: filled ? "var(--bg-page)" : c,
        border: `1px solid ${c}55`,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.3px",
        whiteSpace: "nowrap",
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  );
});
