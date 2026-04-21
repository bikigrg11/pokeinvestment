"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { trpc } from "@/lib/trpc/client";
import { SortableTable } from "@/components/ui/SortableTable";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { CardArt } from "@/components/ui/CardArt";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatCents } from "@/lib/utils/formatting";
import { getSignalColor } from "@/lib/utils/signals";

const DIST_COLORS = ["#6366f1", "#22c55e", "#3b82f6", "#a78bfa", "#f472b6", "#fb923c", "#22d3ee", "#34d399", "#f87171", "#818cf8", "#facc15"];
const SIGNALS = ["Undervalued", "Momentum", "GradingCandidate", "HighLiquidity", "CollectorFavorite", "Breakout", "SteadyGainer", "BlueChip"];

const DEFAULT_FILTERS = {
  minGradingUpside: 0,
  minVolume: 0,
  maxPriceDollars: "",
  minPriceDollars: "",
  signal: "",
};

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: "var(--text-3)", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color ?? "var(--text)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
          {p.name}: {typeof p.value === "number" ? (p.dataKey === "avgPrice" ? formatCents(p.value) : p.value.toLocaleString()) : p.value}
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const { data: allCards, isLoading, isError, refetch } = trpc.analytics.screener.useQuery({
    minGradingUpside: 0,
    minVolume: 0,
    limit: 500,
  });

  const cards = useMemo(() => allCards ?? [], [allCards]);

  const rarityDist = useMemo(() => {
    const map = new Map<string, number>();
    cards.forEach((c) => {
      const r = c.rarity ?? "Unknown";
      map.set(r, (map.get(r) ?? 0) + 1);
    });
    return [...map.entries()]
      .map(([name, value]) => ({ name: name.length > 14 ? name.slice(0, 14) + "..." : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [cards]);

  const priceByRarity = useMemo(() => {
    const map = new Map<string, number[]>();
    cards.forEach((c) => {
      if (!c.marketPrice) return;
      const r = c.rarity ?? "Unknown";
      const arr = map.get(r) ?? [];
      arr.push(c.marketPrice);
      map.set(r, arr);
    });
    return [...map.entries()]
      .map(([rarity, prices]) => ({
        rarity: rarity.length > 14 ? rarity.slice(0, 14) + "..." : rarity,
        avgPrice: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
      }))
      .sort((a, b) => b.avgPrice - a.avgPrice)
      .slice(0, 12);
  }, [cards]);

  const filtered = useMemo(() => {
    const maxC = filters.maxPriceDollars ? parseFloat(filters.maxPriceDollars) * 100 : null;
    const minC = filters.minPriceDollars ? parseFloat(filters.minPriceDollars) * 100 : null;

    return cards.filter((c) => {
      if (filters.minGradingUpside > 0 && (c.gradingUpside ?? 0) < filters.minGradingUpside) return false;
      if (filters.minVolume > 0 && (c.volume ?? 0) < filters.minVolume) return false;
      if (maxC != null && (c.marketPrice ?? 0) > maxC) return false;
      if (minC != null && (c.marketPrice ?? 0) < minC) return false;
      if (filters.signal && !c.signals.includes(filters.signal as never)) return false;
      return true;
    });
  }, [cards, filters]);

  const hasActiveFilters =
    filters.minGradingUpside > 0 || filters.minVolume > 0 ||
    filters.maxPriceDollars !== "" || filters.minPriceDollars !== "" || filters.signal !== "";

  type ScreenRow = (typeof cards)[number] & Record<string, unknown>;

  const inpStyle: React.CSSProperties = {
    padding: "7px 12px", borderRadius: "var(--radius)", border: "1px solid var(--border)",
    background: "var(--bg-panel)", color: "var(--text)", fontSize: 12, width: 100, outline: "none",
  };

  const columns = [
    {
      key: "name",
      label: "Card",
      bold: true,
      render: (row: ScreenRow) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CardArt cardId={row.id} name={row.name} imageUrl={row.imageSmall ?? null} w={32} h={45} />
          <div>
            <span style={{ fontWeight: 600, color: "var(--text)" }}>{row.name}</span>
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>{row.setName}</div>
          </div>
        </div>
      ),
    },
    {
      key: "rarity",
      label: "Rarity",
      render: (row: ScreenRow) => <span style={{ color: "var(--text-2)", fontSize: 12 }}>{row.rarity ?? "—"}</span>,
    },
    {
      key: "marketPrice",
      label: "Price",
      align: "right" as const,
      mono: true,
      render: (row: ScreenRow) => formatCents(row.marketPrice),
    },
    {
      key: "psa10Price",
      label: "PSA 10",
      align: "right" as const,
      mono: true,
      render: (row: ScreenRow) => formatCents(row.psa10Price),
    },
    {
      key: "gradingUpside",
      label: "Grade x",
      align: "right" as const,
      mono: true,
      render: (row: ScreenRow) => row.gradingUpside != null ? `${row.gradingUpside.toFixed(1)}x` : "—",
    },
    {
      key: "volume",
      label: "Volume",
      align: "right" as const,
      mono: true,
      render: (row: ScreenRow) => (row.volume != null ? String(row.volume) : "—"),
    },
    {
      key: "signals",
      label: "Signals",
      sortable: false,
      render: (row: ScreenRow) => (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {row.signals.length > 0
            ? row.signals.slice(0, 2).map((s: string) => <Pill key={s} label={s} />)
            : <span style={{ color: "var(--text-3)", fontSize: 11 }}>—</span>}
        </div>
      ),
    },
  ];

  if (isError) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: "var(--display-weight)" as unknown as number, color: "var(--text)", margin: 0 }}>Screener</h1>
        <ErrorState message="Failed to load analytics data" onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: "var(--display-weight)" as unknown as number, color: "var(--text)", margin: 0 }}>Screener</h1>
        <p style={{ color: "var(--text-3)", fontSize: 14, margin: "4px 0 0" }}>Build your own investment universe. {isLoading ? "..." : `${filtered.length} matches.`}</p>
      </div>

      {/* Charts row */}
      <div className="grid-2col">
        <Panel title="Rarity Distribution">
          {isLoading ? (
            <div className="skeleton" style={{ height: 200, borderRadius: "var(--radius)" }} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={rarityDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={1} isAnimationActive={false}>
                  {rarityDist.map((_, i) => <Cell key={i} fill={DIST_COLORS[i % DIST_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} labelStyle={{ color: "var(--text-3)" }} itemStyle={{ color: "var(--text)" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Avg Price by Rarity">
          {isLoading ? (
            <div className="skeleton" style={{ height: 200, borderRadius: "var(--radius)" }} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={priceByRarity} layout="vertical">
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fill: "var(--text-3)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} />
                <YAxis dataKey="rarity" type="category" tick={{ fill: "var(--text-2)", fontSize: 10 }} tickLine={false} axisLine={false} width={100} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="avgPrice" fill="var(--accent)" radius={[0, 3, 3, 0]} name="Avg Price" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      {/* Screener with filters + results */}
      <div className="grid-screener">
        <Panel title="Filters">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { l: "Min Buy Score", v: 0, s: () => {}, min: 0, max: 100, unit: "" },
              { l: "Min Grade Multiple", v: filters.minGradingUpside, s: (v: number) => setFilters((f) => ({ ...f, minGradingUpside: v })), min: 0, max: 10, unit: "x" },
            ].map((f) => (
              <div key={f.l}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: "var(--text-2)" }}>{f.l}</span>
                  <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{f.v}{f.unit}</span>
                </div>
                <input type="range" min={f.min} max={f.max} value={f.v} onChange={(e) => f.s(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--accent)" }} step={f.unit === "x" ? 0.5 : 1} />
              </div>
            ))}

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                <span style={{ color: "var(--text-2)" }}>Max Price</span>
                <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{filters.maxPriceDollars ? `$${filters.maxPriceDollars}` : "Any"}</span>
              </div>
              <input type="number" value={filters.maxPriceDollars} placeholder="max $" onChange={(e) => setFilters((f) => ({ ...f, maxPriceDollars: e.target.value }))} style={inpStyle} min="0" />
            </div>

            <div>
              <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 8 }}>Signals (any match)</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SIGNALS.map((s) => (
                  <button key={s} onClick={() => setFilters((f) => ({ ...f, signal: f.signal === s ? "" : s }))} style={{
                    padding: "5px 10px", borderRadius: 999, fontSize: 10, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", cursor: "pointer",
                    border: `1px solid ${filters.signal === s ? getSignalColor(s) : "var(--border)"}`,
                    background: filters.signal === s ? `${getSignalColor(s)}26` : "transparent",
                    color: filters.signal === s ? getSignalColor(s) : "var(--text-3)",
                  }}>{s.replace(/([A-Z])/g, " $1").trim()}</button>
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <button onClick={() => setFilters(DEFAULT_FILTERS)} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "8px", borderRadius: "var(--radius)",
                border: "1px solid var(--border)", background: "transparent", color: "var(--text-3)", fontSize: 12, cursor: "pointer",
              }}>
                <RotateCcw size={11} /> Reset filters
              </button>
            )}
          </div>
        </Panel>

        <Panel padding={0}>
          {isLoading ? (
            <div style={{ padding: 20 }}>
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 40, marginBottom: 8, borderRadius: 6 }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
              No cards match the current filters.{" "}
              <button onClick={() => setFilters(DEFAULT_FILTERS)} style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Reset filters</button>
            </div>
          ) : (
            <SortableTable
              columns={columns as Parameters<typeof SortableTable>[0]["columns"]}
              data={filtered as unknown as Record<string, unknown>[]}
              onRowClick={(row) => router.push(`/cards/${(row as ScreenRow).id}`)}
              maxHeight={500}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
