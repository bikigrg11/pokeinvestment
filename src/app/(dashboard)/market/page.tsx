"use client";

import { useMemo } from "react";
import { Activity, TrendingUp, DollarSign, Layers } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { trpc } from "@/lib/trpc/client";
import { MetricCard } from "@/components/ui/MetricCard";
import { SortableTable } from "@/components/ui/SortableTable";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatCents } from "@/lib/utils/formatting";
import Image from "next/image";
import { ImageOff } from "lucide-react";

const PANEL: React.CSSProperties = { background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 20 };
const SECTION_LABEL: React.CSSProperties = { fontSize: 13, color: "#94a3b8", margin: "0 0 14px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" };

type CardRow = {
  id: string;
  name: string;
  rarity: string | null;
  imageSmall: string | null;
  setName: string;
  marketPrice: number | null;
  volume: number | null;
};

function CardTable({ rows }: { rows: CardRow[] }) {
  const columns = [
    {
      key: "name",
      label: "Card",
      bold: true,
      render: (row: Record<string, unknown>) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {(row as CardRow).imageSmall ? (
            <Image
              src={(row as CardRow).imageSmall!}
              alt={(row as CardRow).name}
              width={22}
              height={30}
              style={{ borderRadius: 2, objectFit: "contain", flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: 22, height: 30, background: "#1e293b", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ImageOff size={10} color="#334155" />
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div className="cell-name" style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 12 }}>{(row as CardRow).name}</div>
            <div style={{ fontSize: 10, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(row as CardRow).setName}</div>
          </div>
        </div>
      ),
    },
    {
      key: "rarity",
      label: "Rarity",
      render: (row: Record<string, unknown>) => (
        <span style={{ color: "#64748b", fontSize: 11 }}>{(row as CardRow).rarity ?? "—"}</span>
      ),
    },
    {
      key: "marketPrice",
      label: "Price",
      align: "right" as const,
      mono: true,
      render: (row: Record<string, unknown>) => formatCents((row as CardRow).marketPrice),
    },
    {
      key: "volume",
      label: "Volume",
      align: "right" as const,
      mono: true,
      render: (row: Record<string, unknown>) =>
        (row as CardRow).volume != null ? String((row as CardRow).volume) : "—",
    },
  ];

  return (
    <SortableTable
      columns={columns}
      data={rows as unknown as Record<string, unknown>[]}
      maxHeight={280}
    />
  );
}

export default function MarketPage() {
  const { data: dashboard, isLoading, isError, refetch } = trpc.analytics.dashboard.useQuery();
  const { data: indexHistory } = trpc.analytics.indexHistory.useQuery();

  const indexData = useMemo(
    () =>
      (indexHistory ?? []).map((s) => ({
        date: new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: (s.value / 100).toFixed(2),
      })),
    [indexHistory]
  );

  const seriesData = useMemo(
    () =>
      (dashboard?.seriesPerformance ?? []).map((s) => ({
        series: s.series.length > 12 ? s.series.slice(0, 12) + "…" : s.series,
        avgPrice: (s.avgMarketPrice / 100).toFixed(2),
        cardCount: s.cardCount,
      })),
    [dashboard]
  );

  const stats = dashboard?.stats;

  if (isError) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: "0 0 20px" }}>Market Overview</h1>
        <ErrorState message="Failed to load market data" onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: "0 0 20px" }}>
        Market Overview
      </h1>

      {/* Stats */}
      <div className="grid-4col" style={{ marginBottom: 24 }}>
        {isLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 88, borderRadius: 8 }} />
            ))}
          </>
        ) : (
          <>
            <MetricCard
              label="Cards Tracked"
              value={stats ? stats.trackedCards.toLocaleString() : "—"}
              sub={stats ? `of ${stats.totalCards.toLocaleString()} total` : undefined}
              icon={Layers}
            />
            <MetricCard
              label="Avg Card Price"
              value={stats?.avgMarketPrice ? formatCents(stats.avgMarketPrice) : "—"}
              icon={DollarSign}
            />
            <MetricCard
              label="Market Cap"
              value={
                stats?.totalMarketCap
                  ? `$${(stats.totalMarketCap / 10000).toFixed(1)}M`
                  : "—"
              }
              icon={TrendingUp}
            />
            <MetricCard
              label="Index Points"
              value={
                indexData.length > 0 ? `${indexData[indexData.length - 1].value}` : "—"
              }
              icon={Activity}
            />
          </>
        )}
      </div>

      {/* Index chart + Series BarChart */}
      <div className="grid-2col" style={{ marginBottom: 24 }}>
        <div style={PANEL}>
          <h3 style={SECTION_LABEL}>Pokémon 250 Index</h3>
          {isLoading ? (
            <div className="skeleton" style={{ height: 240, borderRadius: 8 }} />
          ) : indexData.length === 0 ? (
            <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontSize: 13 }}>
              No index history yet — run seed-history.ts
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={indexData}>
                <defs>
                  <linearGradient id="idxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#475569", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.max(0, Math.floor(indexData.length / 6))}
                />
                <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 6, fontSize: 12 }}
                  labelStyle={{ color: "#94a3b8" }}
                  itemStyle={{ color: "#fbbf24", fontFamily: "'JetBrains Mono', monospace" }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#fbbf24"
                  fill="url(#idxGrad)"
                  strokeWidth={2}
                  dot={false}
                  name="Index"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={PANEL}>
          <h3 style={SECTION_LABEL}>Avg Price by Series</h3>
          {isLoading ? (
            <div className="skeleton" style={{ height: 240, borderRadius: 8 }} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={seriesData} layout="vertical">
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tick={{ fill: "#475569", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <YAxis
                  dataKey="series"
                  type="category"
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={90}
                />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 6, fontSize: 12 }}
                  labelStyle={{ color: "#94a3b8" }}
                  itemStyle={{ color: "#fbbf24", fontFamily: "'JetBrains Mono', monospace" }}
                />
                <Bar dataKey="avgPrice" fill="#fbbf24" radius={[0, 3, 3, 0]} name="Avg $" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top movers tables */}
      <div className="grid-2col" style={{ marginBottom: 24 }}>
        <div style={PANEL}>
          <h3 style={SECTION_LABEL}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <TrendingUp size={13} color="#22c55e" />
              Highest Price
            </span>
          </h3>
          {isLoading ? (
            <div className="skeleton" style={{ height: 240, borderRadius: 8 }} />
          ) : (
            <CardTable rows={(dashboard?.topByPrice ?? []) as CardRow[]} />
          )}
        </div>

        <div style={PANEL}>
          <h3 style={SECTION_LABEL}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Activity size={13} color="#3b82f6" />
              Highest Volume
            </span>
          </h3>
          {isLoading ? (
            <div className="skeleton" style={{ height: 240, borderRadius: 8 }} />
          ) : (
            <CardTable rows={(dashboard?.topByVolume ?? []) as CardRow[]} />
          )}
        </div>
      </div>

      <div className="grid-2col">
        <div style={PANEL}>
          <h3 style={SECTION_LABEL}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Activity size={13} color="#a78bfa" />
              Best Grading Upside
            </span>
          </h3>
          {isLoading ? (
            <div className="skeleton" style={{ height: 240, borderRadius: 8 }} />
          ) : (
            <SortableTable
              columns={[
                {
                  key: "name",
                  label: "Card",
                  bold: true,
                  render: (row) => (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {(row.imageSmall as string | null) ? (
                        <Image src={row.imageSmall as string} alt={row.name as string} width={22} height={30} style={{ borderRadius: 2, objectFit: "contain", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 22, height: 30, background: "#1e293b", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <ImageOff size={10} color="#334155" />
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div className="cell-name" style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 12 }}>{row.name as string}</div>
                        <div style={{ fontSize: 10, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.setName as string}</div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "rawPrice",
                  label: "Raw $",
                  align: "right" as const,
                  mono: true,
                  render: (row) => formatCents(row.rawPrice as number | null),
                },
                {
                  key: "psa10Price",
                  label: "PSA 10",
                  align: "right" as const,
                  mono: true,
                  render: (row) => formatCents(row.psa10Price as number | null),
                },
                {
                  key: "gradingUpside",
                  label: "Upside",
                  align: "right" as const,
                  mono: true,
                  render: (row) => {
                    const r = row.rawPrice as number | null;
                    const p = row.psa10Price as number | null;
                    if (!r || !p) return "—";
                    return `${(p / r).toFixed(1)}×`;
                  },
                },
              ]}
              data={(dashboard?.topGrading ?? []) as unknown as Record<string, unknown>[]}
              maxHeight={240}
            />
          )}
        </div>

        <div style={PANEL}>
          <h3 style={SECTION_LABEL}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Activity size={13} color="#f472b6" />
              Vintage Holos
            </span>
          </h3>
          {isLoading ? (
            <div className="skeleton" style={{ height: 240, borderRadius: 8 }} />
          ) : (
            <CardTable rows={(dashboard?.vintageHolos ?? []) as CardRow[]} />
          )}
        </div>
      </div>
    </div>
  );
}
