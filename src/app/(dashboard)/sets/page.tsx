"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { SortableTable } from "@/components/ui/SortableTable";
import { Panel } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/Stat";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatCents } from "@/lib/utils/formatting";

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

const SET_CARD_LIMIT = 50;

export default function SetsPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cardPage, setCardPage] = useState(1);

  const { data: sets, isLoading, isError, refetch } = trpc.sets.list.useQuery({});
  const { data: perf } = trpc.sets.performance.useQuery();
  const { data: detail } = trpc.sets.byId.useQuery(
    { id: selectedId!, cardLimit: SET_CARD_LIMIT, cardPage },
    { enabled: !!selectedId }
  );

  const setRows = (sets ?? []) as SetRow[];
  const selectedSet = selectedId ? setRows.find((s) => s.id === selectedId) : null;

  // Build performance data for horizontal bar display
  const perfData = (perf ?? []).slice(0, 20);
  const maxAvg = perfData.length > 0 ? Math.max(...perfData.map((s) => s.avgMarketPrice)) : 1;

  const columns = [
    {
      key: "name",
      label: "Set",
      bold: true,
      render: (row: SetRow) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {row.logoUrl ? (
            <Image src={row.logoUrl} alt={row.name} width={48} height={20} style={{ objectFit: "contain", flexShrink: 0 }} />
          ) : row.symbolUrl ? (
            <Image src={row.symbolUrl} alt="" width={20} height={20} style={{ objectFit: "contain", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 48, height: 20, background: "var(--bg-panel-2)", borderRadius: 3, flexShrink: 0 }} />
          )}
          <span style={{ fontWeight: 600, color: "var(--text)" }}>{row.name}</span>
        </div>
      ),
    },
    {
      key: "series",
      label: "Series",
      render: (row: SetRow) => <span style={{ color: "var(--text-2)", fontSize: 12 }}>{row.series}</span>,
    },
    {
      key: "releaseDate",
      label: "Released",
      render: (row: SetRow) => row.releaseDate ? new Date(row.releaseDate).toISOString().slice(0, 10) : "—",
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
          <span style={{ fontWeight: 600, color: "var(--text)" }}>{row.name}</span>
          <span style={{ color: "var(--text-3)", fontSize: 11, marginLeft: 8 }}>#{row.cardNumber}</span>
        </div>
      ),
    },
    {
      key: "rarity",
      label: "Rarity",
      render: (row: SetDetailCard) => <span style={{ color: "var(--text-2)", fontSize: 12 }}>{row.rarity ?? "—"}</span>,
    },
    {
      key: "marketPrice",
      label: "Price",
      align: "right" as const,
      mono: true,
      render: (row: SetDetailCard) => formatCents(row.prices[0]?.marketPrice ?? null),
    },
    {
      key: "psa10Price",
      label: "PSA 10",
      align: "right" as const,
      mono: true,
      render: (row: SetDetailCard) => formatCents(row.prices[0]?.psa10Price ?? null),
    },
  ];

  if (isError) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: "var(--display-weight)" as unknown as number, color: "var(--text)", margin: 0 }}>Sets</h1>
        <ErrorState message="Failed to load sets" onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: "var(--display-weight)" as unknown as number, color: "var(--text)", margin: 0 }}>Sets</h1>
        <p style={{ color: "var(--text-3)", fontSize: 14, margin: "4px 0 0" }}>Which sets have the best ROI? Which ones are heating up right now?</p>
      </div>

      {/* Set performance horizontal bars */}
      {perfData.length > 0 && (
        <Panel title="Set Performance · Sorted by Avg Price">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {perfData.map((s) => (
              <div key={s.id} style={{ display: "grid", gridTemplateColumns: "260px 1fr 140px 100px", gap: 16, alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{s.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>{Number(s.cardCount)} cards</div>
                </div>
                <div style={{ position: "relative", height: 22, background: "var(--bg-panel-2)", borderRadius: 4 }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(s.avgMarketPrice / maxAvg) * 100}%`, background: `linear-gradient(90deg, color-mix(in srgb, var(--accent) 30%, transparent), var(--accent))`, borderRadius: 4 }} />
                  <div style={{ position: "absolute", right: 10, top: 0, bottom: 0, display: "flex", alignItems: "center", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text)", fontWeight: 600 }}>{formatCents(s.avgMarketPrice)}</div>
                </div>
                <div style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{formatCents(s.avgMarketPrice)}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>avg card</div>
                </div>
                <button onClick={() => { setSelectedId(s.id); setCardPage(1); }} style={{ padding: "6px 12px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "transparent", color: "var(--text-2)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Browse →</button>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Sets table */}
      {isLoading ? (
        <Panel>
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8, borderRadius: 6 }} />)}
        </Panel>
      ) : (
        <SortableTable
          columns={columns as Parameters<typeof SortableTable>[0]["columns"]}
          data={setRows as Record<string, unknown>[]}
          onRowClick={(row) => {
            const r = row as SetRow;
            setSelectedId((prev) => (prev === r.id ? null : r.id)); setCardPage(1);
          }}
        />
      )}

      {/* Expanded set detail */}
      {selectedSet && (
        <Panel style={{ border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {selectedSet.logoUrl && (
                <Image src={selectedSet.logoUrl} alt={selectedSet.name} width={80} height={32} style={{ objectFit: "contain" }} />
              )}
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)", margin: 0 }}>{selectedSet.name}</h3>
            </div>
            <button onClick={() => setSelectedId(null)} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer" }}>
              <X size={16} />
            </button>
          </div>

          <div className="grid-4col" style={{ marginBottom: 16 }}>
            <Stat label="Series" value={selectedSet.series} />
            <Stat label="Total Cards" value={selectedSet.totalCards} />
            <Stat label="Tracked" value={selectedSet._count.cards} sub="with prices" />
            <Stat label="Released" value={selectedSet.releaseDate ? new Date(selectedSet.releaseDate).toISOString().slice(0, 10) : "—"} />
          </div>

          {detail && detail.cards.length > 0 ? (
            <>
              <SortableTable
                columns={detailCardColumns as Parameters<typeof SortableTable>[0]["columns"]}
                data={detail.cards as unknown as Record<string, unknown>[]}
                onRowClick={(row) => router.push(`/cards/${(row as SetDetailCard).id}`)}
                maxHeight={400}
              />
              {detail.total > SET_CARD_LIMIT && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, paddingTop: 12 }}>
                  <button
                    disabled={cardPage <= 1}
                    onClick={() => setCardPage((p) => Math.max(1, p - 1))}
                    style={{
                      padding: "6px 14px", borderRadius: "var(--radius)", border: "1px solid var(--border)",
                      background: cardPage <= 1 ? "var(--bg-panel)" : "var(--bg-card)", color: cardPage <= 1 ? "var(--text-3)" : "var(--text)",
                      cursor: cardPage <= 1 ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600,
                    }}
                  >
                    ← Prev
                  </button>
                  <span style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
                    Page {cardPage} of {Math.ceil(detail.total / SET_CARD_LIMIT)}
                  </span>
                  <button
                    disabled={cardPage >= Math.ceil(detail.total / SET_CARD_LIMIT)}
                    onClick={() => setCardPage((p) => p + 1)}
                    style={{
                      padding: "6px 14px", borderRadius: "var(--radius)", border: "1px solid var(--border)",
                      background: cardPage >= Math.ceil(detail.total / SET_CARD_LIMIT) ? "var(--bg-panel)" : "var(--bg-card)", color: cardPage >= Math.ceil(detail.total / SET_CARD_LIMIT) ? "var(--text-3)" : "var(--text)",
                      cursor: cardPage >= Math.ceil(detail.total / SET_CARD_LIMIT) ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600,
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ color: "var(--text-3)", fontSize: 13, padding: "20px 0" }}>
              {detail ? "No cards with price data in this set." : "Loading cards..."}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
