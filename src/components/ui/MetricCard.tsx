import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: LucideIcon;
  mono?: boolean;
}

export function MetricCard({ label, value, sub, color, icon: Icon, mono = true }: MetricCardProps) {
  return (
    <div
      style={{
        padding: "16px 20px",
        background: "#0c1222",
        border: "1px solid #1e293b",
        borderRadius: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        {Icon && <Icon size={13} color="#64748b" />}
        <span
          style={{
            fontSize: 11,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: color ?? "#e2e8f0",
          fontFamily: mono ? "'JetBrains Mono', 'SF Mono', monospace" : "inherit",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 11,
            color: color ?? "#64748b",
            marginTop: 4,
            fontWeight: 500,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
