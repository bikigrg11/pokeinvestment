"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Award, ImageOff, TrendingUp, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { SortableTable } from "@/components/ui/SortableTable";
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

type Tab = "vintage" | "modern";

function TableSkeleton() {
  return (
    <div style={{ border: "1px solid #1e293b", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", background: "#0c1222", borderBottom: "2px solid #1e293b", display: "flex", gap: 16 }}>
        {["5%", "30%", "20%", "12%", "12%", "12%", "9%"].map((w, i) => (
          <div key={i} className="skeleton" style={{ height: 10, width: w, borderRadius: 3 }} />
        ))}
      </div>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{ padding: "12px 14px", borderBottom: "1px solid #1e293b22", display: "flex", alignItems: "center", gap: 16 }}>
          <div className="skeleton" style={{ height: 11, width: "5%", borderRadius: 3 }} />
          <div style={{ flex: "0 0 30%", display: "flex", gap: 10, alignItems: "center" }}>
            <div className="skeleton" style={{ width: 32, height: 44, borderRadius: 3, flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
              <div className="skeleton" style={{ height: 13, width: "80%", borderRadius: 3 }} />
              <div className="skeleton" style={{ height: 10, width: "55%", borderRadius: 3 }} />
            </div>
          </div>
          {["20%", "12%", "12%", "12%", "9%"].map((w, j) => (
            <div key={j} className="skeleton" style={{ height: 11, width: w, borderRadius: 3 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function GradingPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("vintage");

  const { data, isLoading, isError, refetch } = trpc.analytics.gradingLeaderboard.useQuery();

  const rows = useMemo(() => {
    const list = tab === "vintage" ? (data?.vintage ?? []) : (data?.modern ?? []);
    return list.map((r, i) => ({ ...r, rank: i + 1 }) as typeof r & Record<string, unknown>);
  }, [data, tab]);

  type GradingRow = (typeof rows)[number];

  const columns = [
    {
      key: "rank",
      label: "#",
      sortable: false,
      render: (row: GradingRow) => (
        <span style={{ color: "#475569", fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
          {(row as GradingRow & { rank: number }).rank}
        </span>
      ),
    },
    {
      key: "name",
      label: "Card",
      bold: true,
      render: (row: GradingRow) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {row.imageSmall ? (
            <Image src={row.imageSmall} alt={row.name} width={32} height={44}
              style={{ borderRadius: 3, objectFit: "contain", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 32, height: 44, background: "#1e293b", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ImageOff size={14} color="#334155" />
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div className="cell-name" style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 13 }}>{row.name}</div>
            <div style={{ color: "#64748b", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.setName}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "rarity",
      label: "Rarity",
      render: (row: GradingRow) => (
        <span style={{ color: "#94a3b8", fontSize: 12 }}>{row.rarity ?? "—"}</span>
      ),
    },
    {
      key: "rawPrice",
      label: "Raw Price",
      align: "right" as const,
      mono: true,
      render: (row: GradingRow) => formatCents(row.rawPrice),
    },
    {
      key: "psa10Price",
      label: "PSA 10",
      align: "right" as const,
      mono: true,
      render: (row: GradingRow) => (
        <span style={{ color: "#22c55e" }}>{formatCents(row.psa10Price)}</span>
      ),
    },
    {
      key: "gradingUpside",
      label: "Upside",
      align: "right" as const,
      mono: true,
      render: (row: GradingRow) => {
        const val = row.gradingUpside;
        if (val == null) return <span style={{ color: "#475569" }}>—</span>;
        const color = val >= 10 ? "#fbbf24" : val >= 5 ? "#22c55e" : "#94a3b8";
        return <span style={{ color, fontWeight: 700 }}>{val.toFixed(1)}×</span>;
      },
    },
    {
      key: "marketPrice",
      label: "Market",
      align: "right" as const,
      mono: true,
      render: (row: GradingRow) => formatCents(row.marketPrice),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>
            Top 100 Grading Upside
          </h1>
          <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>
            Cards with the highest PSA 10 / raw price multiplier — best grading candidates
          </p>
        </div>

        {/* Era toggle */}
        <div style={{ display: "flex", background: "#0a0f1c", border: "1px solid #1e293b", borderRadius: 8, padding: 3, gap: 3 }}>
          {(["vintage", "modern"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "6px 18px",
                borderRadius: 6,
                border: "none",
                background: tab === t ? "#fbbf2420" : "transparent",
                color: tab === t ? "#fbbf24" : "#64748b",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
                outline: tab === t ? "1px solid #fbbf2440" : "none",
              }}
            >
              {t === "vintage" ? "Vintage (pre-2003)" : "Modern (2003+)"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      {!isLoading && !isError && (
        <div className="grid-4col" style={{ marginBottom: 24 }}>
          {[
            {
              label: "Cards Listed",
              value: rows.length,
              icon: Award,
              color: "#fbbf24",
            },
            {
              label: "Avg Upside",
              value: rows.length
                ? `${(rows.reduce((s, r) => s + (r.gradingUpside ?? 0), 0) / rows.length).toFixed(1)}×`
                : "—",
              icon: TrendingUp,
              color: "#22c55e",
            },
            {
              label: "Best Upside",
              value: rows[0]?.gradingUpside != null ? `${rows[0].gradingUpside.toFixed(1)}×` : "—",
              icon: Award,
              color: "#a78bfa",
            },
            {
              label: "Avg PSA 10",
              value: rows.length
                ? formatCents(Math.round(rows.reduce((s, r) => s + (r.psa10Price ?? 0), 0) / rows.length))
                : "—",
              icon: Zap,
              color: "#3b82f6",
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} style={{ ...PANEL, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={16} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px" }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={PANEL}>
        <h3 style={SECTION_LABEL}>
          {tab === "vintage" ? "Vintage Cards — Pre-2003" : "Modern Cards — 2003 and Later"}
        </h3>

        {isError ? (
          <ErrorState message="Failed to load grading data" onRetry={() => void refetch()} />
        ) : isLoading ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#475569", fontSize: 13 }}>
            No grading data yet — run sync-ebay to populate PSA10 prices.
          </div>
        ) : (
          <SortableTable
            columns={columns as Parameters<typeof SortableTable>[0]["columns"]}
            data={rows as unknown as Record<string, unknown>[]}
            onRowClick={(row) => router.push(`/cards/${(row as GradingRow).id}`)}
            maxHeight={700}
          />
        )}
      </div>
    </div>
  );
}
