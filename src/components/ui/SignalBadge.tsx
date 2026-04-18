import { memo } from "react";
import { getSignalColor } from "@/lib/utils/signals";

interface SignalBadgeProps {
  signal: string;
}

export const SignalBadge = memo(function SignalBadge({ signal }: SignalBadgeProps) {
  const color = getSignalColor(signal);
  const label = signal.replace(/([A-Z])/g, " $1").trim();

  return (
    <span
      style={{
        background: `${color}1a`,
        color,
        border: `1px solid ${color}55`,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.3px",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        display: "inline-block",
      }}
    >
      {label}
    </span>
  );
});
