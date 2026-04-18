"use client";

interface StatProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export function Stat({ label, value, sub, color }: StatProps) {
  return (
    <div
      style={{
        padding: "14px 18px",
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "var(--text-3)",
          textTransform: "uppercase",
          letterSpacing: "1px",
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: color ?? "var(--text)",
          fontFamily: "var(--font-mono)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: color ?? "var(--text-3)", marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}
