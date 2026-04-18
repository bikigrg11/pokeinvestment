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
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        {Icon && <Icon size={13} color="var(--text-3)" />}
        <span
          style={{
            fontSize: 11,
            color: "var(--text-3)",
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
          color: color ?? "var(--text)",
          fontFamily: mono ? "var(--font-mono)" : "inherit",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 11,
            color: color ?? "var(--text-3)",
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
