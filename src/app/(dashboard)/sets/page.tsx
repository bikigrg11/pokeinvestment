"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X, Layers, DollarSign, BookOpen, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { trpc } from "@/lib/trpc/client";
import { SortableTable } from "@/components/ui/SortableTable";
import { MetricCard } from "@/components/ui/MetricCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatCents } from "@/lib/utils/formatting";

const PANEL: React.CSSProperties = {
  background: "#0c1222",
  border: "1px solid #1e293b",
  borderRadius: 8,
  padding: 20,
};

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 13,
  color: "#94a3b8",
  margin: "0 0 16px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.8px",
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #334155",
        borderRadius: 6,
        padding: "8px 12px",
        fontSize: 12,
      }}
    >
      <div style={{ color: "#94a3b8", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div
          key={i}
          style={{
            color: p.color,
            fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {p.name}: {formatCents(p.value)}
        </div>
      ))}
    </div>
  );
}

type SetRow = Record<string, unknown> & {
  id: string;
  name: string;
  series: string;
  releaseDate: Date | null;
  totalCards: number;
  logoUrl: string | null;
  symbolUrl: string | null;
  _count: { cards: number };
};

type SetDetailCard = {
  id: string;
  name: string;
  rarity: string | null;
  cardNumber: string;
  prices: Array<{ marketPrice: number | null; psa10Price: number | null }>;
};

export default function SetsPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: sets, isLoading, isError, refetch } = trpc.sets.list.useQuery({});
  const { data: perf } = trpc.sets.performance.useQuery();
  const { data: detail } = trpc.sets.byId.useQuery(
    { id: selectedId!, cardLimit: 100 },
    { enabled: !!selectedId }
  );

  const setRows = (sets ?? []) as SetRow[];
  const selectedSet = selectedId ? setRows.find((s) => s.id === selectedId) : null;

  // Bar chart data — top 16 sets by avg price
  const chartData = (perf ?? [])
    .slice(0, 16)
    .map((r) => ({
      name: r.name.length > 16 ? r.name.slice(0, 16) + "…" : r.name,
      avgMarketPrice: Math.round(r.avgMarketPrice),
      cardCount: Number(r.cardCount),
    }));

  const columns = [
    {
      key: "name",
      label: "Set",
      bold: true,
      render: (row: SetRow) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {row.logoUrl ? (
            <Image
              src={row.logoUrl}
              alt={row.name}
              width={48}
              height={20}
              style={{ objectFit: "contain", flexShrink: 0 }}
            />
          ) : row.symbolUrl ? (
            <Image
              src={row.symbolUrl}
              alt=""
              width={20}
              height={20}
              style={{ objectFit: "contain", flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: 48,
                height: 20,
                background: "#1e293b",
                borderRadius: 3,
                flexShrink: 0,
              }}
            />
          )}
          <span style={{ fontWeight: 600, color: "#e2e8f0" }}>{row.name}</span>
        </div>
      ),
    },
    {
      key: "series",
      label: "Series",
      render: (row: SetRow) => (
        <span style={{ color: "#94a3b8", fontSize: 12 }}>{row.series}</span>
      ),
    },
    {
      key: "releaseDate",
      label: "Released",
      render: (row: SetRow) =>
        row.releaseDate
          ? new Date(row.releaseDate).toISOString().slice(0, 10)
          : "—",
    },
    {
      key: "totalCards",
      label: "Cards",
      align: "right" as const,
      mono: true,
      render: (row: SetRow) => String(row.totalCards),
    },
    {
      key: "tracked",
      label: "Tracked",
      align: "right" as const,
      mono: true,
      render: (row: SetRow) => String(row._count.cards),
    },
  ];

  const detailCardColumns = [
    {
      key: "name",
      label: "Card",
      bold: true,
      render: (row: SetDetailCard) => (
        <div>
          <span style={{ fontWeight: 600, color: "#e2e8f0" }}>{row.name}</span>
          <span style={{ color: "#475569", fontSize: 11, marginLeft: 8 }}>
            #{row.cardNumber}
          </span>
        </div>
      ),
    },
    {
      key: "rarity",
      label: "Rarity",
      render: (row: SetDetailCard) => (
        <span style={{ color: "#94a3b8", fontSize: 12 }}>{row.rarity ?? "—"}</span>
      ),
    },
    {
      key: "marketPrice",
      label: "Price",
      align: "right" as const,
      mono: true,
      render: (row: SetDetailCard) =>
        formatCents(row.prices[0]?.marketPrice ?? null),
    },
    {
      key: "psa10Price",
      label: "PSA 10",
      align: "right" as const,
      mono: true,
      render: (row: SetDetailCard) =>
        formatCents(row.prices[0]?.psa10Price ?? null),
    },
  ];

  if (isError) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: "0 0 20px" }}>Set Performance</h1>
        <ErrorState message="Failed to load sets" onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: "#f1f5f9",
          margin: "0 0 20px",
        }}
      >
        Set Performance
      </h1>

      {/* Bar chart — top sets by avg price */}
      <div style={{ ...PANEL, marginBottom: 24 }}>
        <h3 style={SECTION_LABEL}>Top Sets by Avg Market Price</h3>
        {chartData.length === 0 ? (
          <div
            style={{
              height: 220,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#475569",
              fontSize: 13,
            }}
          >
            No price data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#475569", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                angle={-35}
                textAnchor="end"
                height={70}
                interval={0}
              />
              <YAxis
                tick={{ fill: "#475569", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="avgMarketPrice"
                name="Avg Price"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              >
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.avgMarketPrice > 5000
                        ? "#fbbf24"
                        : entry.avgMarketPrice > 1000
                        ? "#22c55e"
                        : "#3b82f6"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Sets table */}
      {isLoading ? (
        <div style={{ ...PANEL }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8, borderRadius: 6 }} />
          ))}
        </div>
      ) : (
        <SortableTable
          columns={columns as Parameters<typeof SortableTable>[0]["columns"]}
          data={setRows as Record<string, unknown>[]}
          onRowClick={(row) => {
            const r = row as SetRow;
            setSelectedId((prev) => (prev === r.id ? null : r.id));
          }}
        />
      )}

      {/* Expanded set detail */}
      {selectedSet && (
        <div
          style={{
            marginTop: 20,
            background: "#0c1222",
            border: "1px solid #fbbf2444",
            borderRadius: 8,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {selectedSet.logoUrl && (
                <Image
                  src={selectedSet.logoUrl}
                  alt={selectedSet.name}
                  width={80}
                  height={32}
                  style={{ objectFit: "contain" }}
                />
              )}
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#fbbf24",
                  margin: 0,
                }}
              >
                {selectedSet.name}
              </h3>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              style={{
                background: "none",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid-4col" style={{ marginBottom: 16 }}>
            <MetricCard
              label="Series"
              value={selectedSet.series}
              icon={BookOpen}
              mono={false}
            />
            <MetricCard
              label="Total Cards"
              value={selectedSet.totalCards}
              icon={Layers}
            />
            <MetricCard
              label="Tracked"
              value={selectedSet._count.cards}
              sub="with prices"
              icon={TrendingUp}
            />
            <MetricCard
              label="Released"
              value={
                selectedSet.releaseDate
                  ? new Date(selectedSet.releaseDate).toISOString().slice(0, 10)
                  : "—"
              }
              icon={DollarSign}
              mono={false}
            />
          </div>

          {detail && detail.cards.length > 0 ? (
            <SortableTable
              columns={
                detailCardColumns as Parameters<typeof SortableTable>[0]["columns"]
              }
              data={detail.cards as unknown as Record<string, unknown>[]}
              onRowClick={(row) =>
                router.push(`/cards/${(row as SetDetailCard).id}`)
              }
              maxHeight={300}
            />
          ) : (
            <div style={{ color: "#475569", fontSize: 13, padding: "20px 0" }}>
              {detail ? "No cards with price data in this set." : "Loading cards…"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
