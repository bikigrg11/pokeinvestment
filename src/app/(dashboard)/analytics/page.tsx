"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Filter, RotateCcw } from "lucide-react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { trpc } from "@/lib/trpc/client";
import { SortableTable } from "@/components/ui/SortableTable";
import { SignalBadge } from "@/components/ui/SignalBadge";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatCents } from "@/lib/utils/formatting";

const PANEL: React.CSSProperties = { background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 20 };
const SECTION_LABEL: React.CSSProperties = { fontSize: 13, color: "#94a3b8", margin: "0 0 14px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" };
const INPUT_STYLE: React.CSSProperties = { padding: "7px 12px", borderRadius: 6, border: "1px solid #1e293b", background: "#0c1222", color: "#e2e8f0", fontSize: 12, width: 100, outline: "none" };
const SELECT_STYLE: React.CSSProperties = { ...INPUT_STYLE, width: "auto" };

const DIST_COLORS = ["#fbbf24","#22c55e","#3b82f6","#a78bfa","#f472b6","#fb923c","#22d3ee","#34d399","#f87171","#818cf8","#facc15"];
const SIGNALS = ["Undervalued","Momentum","GradingCandidate","HighLiquidity","CollectorFavorite","Breakout","SteadyGainer","BlueChip"];

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
    <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: "#94a3b8", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color ?? "#e2e8f0", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
          {p.name}: {typeof p.value === "number" ? (p.dataKey === "avgPrice" ? formatCents(p.value) : p.value.toLocaleString()) : p.value}
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Fetch full dataset (no filters applied server-side, we filter client-side)
  const { data: allCards, isLoading, isError, refetch } = trpc.analytics.screener.useQuery({
    minGradingUpside: 0,
    minVolume: 0,
    limit: 500,
  });

  const cards = useMemo(() => allCards ?? [], [allCards]);

  // ── Rarity distribution (from full dataset) ──
  const rarityDist = useMemo(() => {
    const map = new Map<string, number>();
    cards.forEach((c) => {
      const r = c.rarity ?? "Unknown";
      map.set(r, (map.get(r) ?? 0) + 1);
    });
    return [...map.entries()]
      .map(([name, value]) => ({ name: name.length > 14 ? name.slice(0, 14) + "…" : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [cards]);

  // ── Avg price by rarity (from full dataset) ──
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
        rarity: rarity.length > 14 ? rarity.slice(0, 14) + "…" : rarity,
        avgPrice: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
      }))
      .sort((a, b) => b.avgPrice - a.avgPrice)
      .slice(0, 12);
  }, [cards]);

  // ── Client-side filtered results ──
  const filtered = useMemo(() => {
    const maxC = filters.maxPriceDollars ? parseFloat(filters.maxPriceDollars) * 100 : null;
    const minC = filters.minPriceDollars ? parseFloat(filters.minPriceDollars) * 100 : null;

    return cards.filter((c) => {
      if (filters.minGradingUpside > 0 && (c.gradingUpside ?? 0) < filters.minGradingUpside)
        return false;
      if (filters.minVolume > 0 && (c.volume ?? 0) < filters.minVolume) return false;
      if (maxC != null && (c.marketPrice ?? 0) > maxC) return false;
      if (minC != null && (c.marketPrice ?? 0) < minC) return false;
      if (filters.signal && !c.signals.includes(filters.signal as never)) return false;
      return true;
    });
  }, [cards, filters]);

  const hasActiveFilters =
    filters.minGradingUpside > 0 ||
    filters.minVolume > 0 ||
    filters.maxPriceDollars !== "" ||
    filters.minPriceDollars !== "" ||
    filters.signal !== "";

  type ScreenRow = (typeof cards)[number] & Record<string, unknown>;

  const columns = [
    {
      key: "name",
      label: "Card",
      bold: true,
      render: (row: ScreenRow) => (
        <div>
          <span style={{ fontWeight: 600, color: "#e2e8f0" }}>{row.name}</span>
          <div style={{ fontSize: 11, color: "#64748b" }}>{row.setName}</div>
        </div>
      ),
    },
    {
      key: "rarity",
      label: "Rarity",
      render: (row: ScreenRow) => (
        <span style={{ color: "#94a3b8", fontSize: 12 }}>{row.rarity ?? "—"}</span>
      ),
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
      label: "Grade ×",
      align: "right" as const,
      mono: true,
      render: (row: ScreenRow) =>
        row.gradingUpside != null ? `${row.gradingUpside.toFixed(1)}×` : "—",
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
            ? row.signals.map((s: string) => <SignalBadge key={s} signal={s} />)
            : <span style={{ color: "#334155", fontSize: 11 }}>—</span>}
        </div>
      ),
    },
  ];

  if (isError) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: "0 0 20px" }}>Advanced Analytics</h1>
        <ErrorState message="Failed to load analytics data" onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: "0 0 20px" }}>
        Advanced Analytics
      </h1>

      {/* Charts row */}
      <div className="grid-2col" style={{ marginBottom: 24 }}>
        <div style={PANEL}>
          <h3 style={SECTION_LABEL}>Rarity Distribution</h3>
          {isLoading ? (
            <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={rarityDist}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  paddingAngle={1}
                  isAnimationActive={false}
                >
                  {rarityDist.map((_, i) => (
                    <Cell key={i} fill={DIST_COLORS[i % DIST_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 6, fontSize: 12 }}
                  labelStyle={{ color: "#94a3b8" }}
                  itemStyle={{ color: "#e2e8f0" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={PANEL}>
          <h3 style={SECTION_LABEL}>Avg Price by Rarity</h3>
          {isLoading ? (
            <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={priceByRarity} layout="vertical">
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tick={{ fill: "#475569", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
                />
                <YAxis
                  dataKey="rarity"
                  type="category"
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="avgPrice" fill="#fbbf24" radius={[0, 3, 3, 0]} name="Avg Price" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Screener */}
      <div style={{ ...PANEL, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Filter size={14} color="#fbbf24" />
            <h3 style={{ fontSize: 13, color: "#fbbf24", margin: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>
              Investment Screener
            </h3>
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 5, border: "1px solid #334155", background: "transparent", color: "#64748b", fontSize: 11, cursor: "pointer" }}
            >
              <RotateCcw size={11} /> Reset
            </button>
          )}
        </div>

        {/* Filter row */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 12, whiteSpace: "nowrap" }}>
            PSA10/Raw ≥
            <input
              type="number"
              value={filters.minGradingUpside || ""}
              placeholder="0"
              onChange={(e) => setFilters((f) => ({ ...f, minGradingUpside: parseFloat(e.target.value) || 0 }))}
              style={INPUT_STYLE}
              step="0.5"
              min="0"
            />×
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 12, whiteSpace: "nowrap" }}>
            Volume ≥
            <input
              type="number"
              value={filters.minVolume || ""}
              placeholder="0"
              onChange={(e) => setFilters((f) => ({ ...f, minVolume: parseFloat(e.target.value) || 0 }))}
              style={INPUT_STYLE}
              min="0"
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 12, whiteSpace: "nowrap" }}>
            Price $
            <input
              type="number"
              value={filters.minPriceDollars}
              placeholder="min"
              onChange={(e) => setFilters((f) => ({ ...f, minPriceDollars: e.target.value }))}
              style={{ ...INPUT_STYLE, width: 72 }}
              min="0"
            />
            –
            <input
              type="number"
              value={filters.maxPriceDollars}
              placeholder="max"
              onChange={(e) => setFilters((f) => ({ ...f, maxPriceDollars: e.target.value }))}
              style={{ ...INPUT_STYLE, width: 72 }}
              min="0"
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 12, whiteSpace: "nowrap" }}>
            Signal
            <select
              value={filters.signal}
              onChange={(e) => setFilters((f) => ({ ...f, signal: e.target.value }))}
              style={SELECT_STYLE}
            >
              <option value="">Any</option>
              {SIGNALS.map((s) => (
                <option key={s} value={s}>{s.replace(/([A-Z])/g, " $1").trim()}</option>
              ))}
            </select>
          </label>

          <span style={{ color: "#fbbf24", fontSize: 12, fontWeight: 600, marginLeft: "auto" }}>
            {isLoading ? "…" : `${filtered.length} match${filtered.length !== 1 ? "es" : ""}`}
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: "20px 0" }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 40, marginBottom: 8, borderRadius: 6 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#475569", fontSize: 13 }}>
            No cards match the current filters.{" "}
            <button onClick={() => setFilters(DEFAULT_FILTERS)} style={{ color: "#fbbf24", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
              Reset filters
            </button>
          </div>
        ) : (
          <SortableTable
            columns={columns as Parameters<typeof SortableTable>[0]["columns"]}
            data={filtered as unknown as Record<string, unknown>[]}
            onRowClick={(row) => router.push(`/cards/${(row as ScreenRow).id}`)}
            maxHeight={400}
          />
        )}
      </div>
    </div>
  );
}
