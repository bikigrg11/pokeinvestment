"use client";

import { trpc as api } from "@/lib/trpc/client";
import { MetricCard } from "@/components/ui/MetricCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatCents, formatMillions, formatNum } from "@/lib/utils/formatting";
import { Activity, DollarSign, TrendingUp, Layers, Award, Zap } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useRouter } from "next/navigation";
import Image from "next/image";

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 13,
  color: "#94a3b8",
  margin: "0 0 16px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.8px",
};

const PANEL: React.CSSProperties = {
  background: "#0c1222",
  border: "1px solid #1e293b",
  borderRadius: 8,
  padding: 20,
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
        <div key={i} style={{ color: p.color, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
          {p.name}: {typeof p.value === "number" ? `$${p.value.toFixed(2)}` : p.value}
        </div>
      ))}
    </div>
  );
}

type CardRow = {
  id: string;
  name: string;
  rarity: string | null;
  imageSmall: string | null;
  setName: string;
  marketPrice: number | null;
  volume: number | null;
  psa10Price: number | null;
};

function CardPlaceholder({ size }: { size: [number, number] }) {
  return (
    <div
      style={{
        width: size[0],
        height: size[1],
        background: "#1e293b",
        borderRadius: 3,
        flexShrink: 0,
      }}
    />
  );
}

function LeaderboardPanel({
  title,
  icon: Icon,
  iconColor,
  data,
  valueFormatter,
  onCardClick,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  data: CardRow[];
  valueFormatter: (row: CardRow) => string;
  onCardClick: (id: string) => void;
}) {
  return (
    <div style={PANEL}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Icon size={14} color={iconColor} />
        <h3 style={{ ...SECTION_LABEL, margin: 0 }}>{title}</h3>
      </div>
      {data.length === 0 ? (
        <div style={{ color: "#475569", fontSize: 13, padding: "20px 0" }}>No data available</div>
      ) : (
        data.map((card, i) => (
          <div
            key={card.id}
            onClick={() => onCardClick(card.id)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 4px",
              cursor: "pointer",
              borderBottom: i < data.length - 1 ? "1px solid #1e293b44" : "none",
            }}
            onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#1e293b33"; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span style={{ color: "#475569", fontSize: 11, fontWeight: 600, width: 18, flexShrink: 0 }}>#{i + 1}</span>
              {card.imageSmall ? (
                <Image
                  src={card.imageSmall}
                  alt={card.name}
                  width={32}
                  height={44}
                  style={{ borderRadius: 3, objectFit: "contain", flexShrink: 0 }}
                />
              ) : (
                <CardPlaceholder size={[32, 44]} />
              )}
              <div style={{ minWidth: 0 }}>
                <div className="cell-name" style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{card.name}</div>
                <div style={{ color: "#64748b", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.setName} · {card.rarity ?? "—"}</div>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0, paddingLeft: 8 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>
                {valueFormatter(card)}
              </div>
              <div style={{ color: "#64748b", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                {formatCents(card.marketPrice)}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <div className="skeleton" style={{ height: 32, width: 300, borderRadius: 4, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 14, width: 240, borderRadius: 4 }} />
      </div>
      <div className="grid-4col" style={{ marginBottom: 28 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 88, borderRadius: 8 }} />
        ))}
      </div>
      <div className="grid-2col" style={{ marginBottom: 28 }}>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 240, borderRadius: 8 }} />
        ))}
      </div>
      <div className="grid-2col">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 320, borderRadius: 8 }} />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = api.analytics.dashboard.useQuery();
  const { data: indexHistory } = api.analytics.indexHistory.useQuery();

  if (isLoading) return <DashboardSkeleton />;

  if (isError) {
    return (
      <div>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Pokémon Investment Dashboard</h1>
        </div>
        <ErrorState message="Failed to load dashboard data" onRetry={() => void refetch()} />
      </div>
    );
  }

  const stats = data?.stats;
  const indexData = (indexHistory ?? []).map((d) => ({
    date: d.date instanceof Date ? d.date.toISOString().slice(0, 10) : String(d.date).slice(0, 10),
    value: Number(d.value),
  }));

  const currentIdx = indexData[indexData.length - 1];
  const prevIdx = indexData[indexData.length - 2];
  const indexChange = currentIdx && prevIdx
    ? ((currentIdx.value - prevIdx.value) / prevIdx.value) * 100
    : null;

  const seriesData = (data?.seriesPerformance ?? []).map((r) => ({
    series: r.series.length > 14 ? r.series.slice(0, 14) + "…" : r.series,
    avgMarketPrice: +(r.avgMarketPrice / 100).toFixed(2),
  }));

  const topByPrice = (data?.topByPrice ?? []) as CardRow[];
  const topByVolume = (data?.topByVolume ?? []) as CardRow[];
  const topGradingVintage = (data?.topGradingVintage ?? []) as CardRow[];
  const topGradingModern = (data?.topGradingModern ?? []) as CardRow[];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9", margin: 0, letterSpacing: "-0.5px" }}>
          Pokémon Investment Dashboard
        </h1>
        <p style={{ color: "#64748b", fontSize: 14, margin: "6px 0 0" }}>
          Real-time analytics for Pokémon card investments
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid-4col" style={{ marginBottom: 28 }}>
        <MetricCard
          label="Pokémon 250 Index"
          value={currentIdx ? formatNum(currentIdx.value, 0) : "—"}
          sub={indexChange != null ? `${indexChange >= 0 ? "+" : ""}${indexChange.toFixed(2)}%` : undefined}
          color={indexChange != null ? (indexChange > 0 ? "#22c55e" : "#ef4444") : undefined}
          icon={Activity}
        />
        <MetricCard
          label="Total Market Cap"
          value={stats?.totalMarketCap != null ? formatMillions(stats.totalMarketCap) : "—"}
          sub={`${stats?.trackedCards ?? 0} tracked cards`}
          icon={DollarSign}
        />
        <MetricCard
          label="Avg Card Price"
          value={formatCents(stats?.avgMarketPrice ?? null)}
          icon={TrendingUp}
        />
        <MetricCard
          label="Cards in DB"
          value={stats?.totalCards?.toLocaleString() ?? "—"}
          sub={`${stats?.trackedCards ?? 0} with prices`}
          icon={Layers}
        />
      </div>

      {/* Charts row */}
      <div className="grid-2col" style={{ marginBottom: 28 }}>
        <div style={PANEL}>
          <h3 style={SECTION_LABEL}>Pokémon 250 Index</h3>
          {indexData.length === 0 ? (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontSize: 13 }}>
              No index history yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={indexData}>
                <defs>
                  <linearGradient id="idxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(indexData.length / 6))} />
                <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="value" stroke="#fbbf24" fill="url(#idxGrad)" strokeWidth={2} dot={false} name="Index" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={PANEL}>
          <h3 style={SECTION_LABEL}>Avg Price by Series</h3>
          {seriesData.length === 0 ? (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontSize: 13 }}>
              No data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={seriesData}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="series" tick={{ fill: "#475569", fontSize: 9 }} tickLine={false} axisLine={false} angle={-25} textAnchor="end" height={50} />
                <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="avgMarketPrice" fill="#fbbf24" radius={[3, 3, 0, 0]} name="Avg Price $" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Leaderboards 2x2 */}
      <div className="grid-2col">
        <LeaderboardPanel
          title="Highest Market Price"
          icon={TrendingUp}
          iconColor="#22c55e"
          data={topByPrice}
          valueFormatter={(r) => formatCents(r.marketPrice)}
          onCardClick={(id) => router.push(`/cards/${id}`)}
        />
        <LeaderboardPanel
          title="Most Liquid Cards"
          icon={Zap}
          iconColor="#3b82f6"
          data={topByVolume}
          valueFormatter={(r) => (r.volume != null ? `${r.volume} sales` : "—")}
          onCardClick={(id) => router.push(`/cards/${id}`)}
        />
        <LeaderboardPanel
          title="Vintage Grading Upside (pre-2003)"
          icon={Award}
          iconColor="#a78bfa"
          data={topGradingVintage}
          valueFormatter={(r) => r.psa10Price != null && r.marketPrice != null && r.marketPrice > 0
            ? `${(r.psa10Price / r.marketPrice).toFixed(1)}×`
            : "—"}
          onCardClick={(id) => router.push(`/cards/${id}`)}
        />
        <LeaderboardPanel
          title="Modern Grading Upside (2003+)"
          icon={Award}
          iconColor="#fbbf24"
          data={topGradingModern}
          valueFormatter={(r) => r.psa10Price != null && r.marketPrice != null && r.marketPrice > 0
            ? `${(r.psa10Price / r.marketPrice).toFixed(1)}×`
            : "—"}
          onCardClick={(id) => router.push(`/cards/${id}`)}
        />
      </div>
    </div>
  );
}
