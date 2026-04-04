"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { trpc as api } from "@/lib/trpc/client";
import { SortableTable } from "@/components/ui/SortableTable";
import { ErrorState } from "@/components/ui/ErrorState";
import { MiniSparkline } from "@/components/charts/MiniSparkline";
import { formatCents } from "@/lib/utils/formatting";

const SIGNALS = [
  "Undervalued",
  "Momentum",
  "GradingCandidate",
  "HighLiquidity",
  "CollectorFavorite",
  "Breakout",
  "SteadyGainer",
  "BlueChip",
];

const SELECT_STYLE: React.CSSProperties = {
  padding: "7px 12px",
  borderRadius: 6,
  border: "1px solid #1e293b",
  background: "#0c1222",
  color: "#cbd5e1",
  fontSize: 12,
  outline: "none",
};

function TableSkeleton() {
  return (
    <div style={{ border: "1px solid #1e293b", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", background: "#0c1222", borderBottom: "2px solid #1e293b", display: "flex", gap: 16 }}>
        {["40%", "20%", "15%", "10%", "8%", "7%"].map((w, i) => (
          <div key={i} className="skeleton" style={{ height: 10, width: w, borderRadius: 3 }} />
        ))}
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{ padding: "12px 14px", borderBottom: "1px solid #1e293b22", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: "0 0 40%", display: "flex", flexDirection: "column", gap: 5 }}>
            <div className="skeleton" style={{ height: 13, width: "70%", borderRadius: 3 }} />
            <div className="skeleton" style={{ height: 10, width: "40%", borderRadius: 3 }} />
          </div>
          <div className="skeleton" style={{ height: 11, width: "20%", borderRadius: 3 }} />
          <div className="skeleton" style={{ height: 11, width: "15%", borderRadius: 3 }} />
          <div className="skeleton" style={{ height: 11, width: "10%", borderRadius: 3, marginLeft: "auto" }} />
          <div className="skeleton" style={{ height: 32, width: 80, borderRadius: 3 }} />
          <div className="skeleton" style={{ height: 11, width: "7%", borderRadius: 3 }} />
        </div>
      ))}
    </div>
  );
}

export default function CardsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterSet, setFilterSet] = useState("");
  const [filterRarity, setFilterRarity] = useState("");
  const [filterSignal, setFilterSignal] = useState("");

  const { data, isLoading, isError, refetch } = api.cards.list.useQuery({
    q: search || undefined,
    setId: filterSet || undefined,
    rarity: filterRarity || undefined,
    limit: 200,
  });

  const { data: setsData } = api.sets.list.useQuery({});

  const cards = useMemo(() => {
    const raw = data?.cards ?? [];
    if (!filterSignal) return raw;
    // Signal filtering requires metrics computation on the server — skip for now
    return raw;
  }, [data, filterSignal]);

  const uniqueRarities = useMemo(() => {
    const rarities = new Set<string>();
    (data?.cards ?? []).forEach((c) => { if (c.rarity) rarities.add(c.rarity); });
    return [...rarities].sort();
  }, [data]);

  const sets = setsData ?? [];

  type CardRow = Record<string, unknown> & {
    id: string;
    name: string;
    cardNumber: string | null;
    rarity: string | null;
    set: { name: string; series: string };
    prices: Array<{ marketPrice: number | null; date: Date }>;
  };

  const columns = [
    {
      key: "name",
      label: "Card",
      bold: true,
      render: (row: CardRow) => (
        <div>
          <span className="cell-name" style={{ fontWeight: 600, color: "#e2e8f0" }}>{row.name}</span>
          {row.cardNumber && (
            <span style={{ color: "#64748b", fontSize: 11, marginLeft: 8 }}>
              #{row.cardNumber}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "setName",
      label: "Set",
      render: (row: CardRow) => (
        <span style={{ color: "#94a3b8", fontSize: 12 }}>{row.set.name}</span>
      ),
    },
    {
      key: "rarity",
      label: "Rarity",
      render: (row: CardRow) => (
        <span style={{ color: "#94a3b8", fontSize: 12 }}>{row.rarity ?? "—"}</span>
      ),
    },
    {
      key: "marketPrice",
      label: "Price",
      align: "right" as const,
      mono: true,
      render: (row: CardRow) => {
        const latest = row.prices[0];
        const price = latest?.marketPrice ?? null;
        return price != null ? formatCents(price) : <span style={{ color: "#475569" }}>No price</span>;
      },
    },
    {
      key: "sparkline",
      label: "Trend",
      sortable: false,
      render: (row: CardRow) => {
        const sparkData = row.prices
          .slice()
          .reverse()
          .map((p) => ({ value: (p.marketPrice ?? 0) / 100 }));
        return <MiniSparkline data={sparkData} width={80} height={32} />;
      },
    },
    {
      key: "volume",
      label: "Vol",
      align: "right" as const,
      mono: true,
      render: (row: CardRow) => {
        const latest = row.prices[0] as { volume?: number | null } | undefined;
        return latest?.volume != null ? String(latest.volume) : "—";
      },
    },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: "0 0 20px" }}>
        Card Database
      </h1>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search
            size={14}
            color="#64748b"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cards or sets…"
            style={{
              width: "100%",
              padding: "8px 12px 8px 34px",
              borderRadius: 6,
              border: "1px solid #1e293b",
              background: "#0c1222",
              color: "#e2e8f0",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <select value={filterSet} onChange={(e) => setFilterSet(e.target.value)} style={SELECT_STYLE}>
          <option value="">All Sets</option>
          {sets.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select value={filterRarity} onChange={(e) => setFilterRarity(e.target.value)} style={SELECT_STYLE}>
          <option value="">All Rarities</option>
          {uniqueRarities.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <select value={filterSignal} onChange={(e) => setFilterSignal(e.target.value)} style={SELECT_STYLE}>
          <option value="">All Signals</option>
          {SIGNALS.map((s) => (
            <option key={s} value={s}>{s.replace(/([A-Z])/g, " $1").trim()}</option>
          ))}
        </select>

        <span style={{ color: "#64748b", fontSize: 12 }}>
          {isLoading ? "Loading…" : `${cards.length} results`}
        </span>
      </div>

      {isError ? (
        <ErrorState message="Failed to load cards" onRetry={() => void refetch()} />
      ) : isLoading ? (
        <TableSkeleton />
      ) : (
        <SortableTable
          columns={columns as Parameters<typeof SortableTable>[0]["columns"]}
          data={cards as Record<string, unknown>[]}
          onRowClick={(row) => router.push(`/cards/${(row as CardRow).id}`)}
          emptyMessage={search || filterSet || filterRarity ? "No cards match your filters" : "No cards found"}
        />
      )}
    </div>
  );
}
