"use client";

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
}

export function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const fmt = (name: string, val: number) => {
    if (name.includes("$") || ["price", "value", "Price", "Value"].some((k) => name.includes(k)))
      return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (name.includes("%") || name.includes("ROI") || name.includes("Return"))
      return `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
    return val.toLocaleString("en-US", { maximumFractionDigits: 2 });
  };

  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #334155",
        borderRadius: 6,
        padding: "8px 12px",
        fontSize: 12,
        minWidth: 120,
      }}
    >
      {label && <div style={{ color: "#94a3b8", marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600, fontFamily: "monospace" }}>
          {p.name}: {fmt(p.name, p.value)}
        </div>
      ))}
    </div>
  );
}
