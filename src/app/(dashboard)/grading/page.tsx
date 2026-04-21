"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Panel } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/Stat";
import { CardArt } from "@/components/ui/CardArt";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatCents } from "@/lib/utils/formatting";

type Tab = "vintage" | "modern";

export default function GradingPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("vintage");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 16;

  const { data, isLoading, isError, refetch } = trpc.analytics.gradingLeaderboard.useQuery();

  const rows = useMemo(() => {
    const list = tab === "vintage" ? (data?.vintage ?? []) : (data?.modern ?? []);
    return list;
  }, [data, tab]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: "var(--display-weight)" as unknown as number, color: "var(--text)", margin: 0 }}>Grading Arbitrage</h1>
          <p style={{ color: "var(--text-3)", fontSize: 14, margin: "4px 0 0" }}>Cards where a PSA 10 grade pays for itself many times over. Assumes $25 grading cost.</p>
        </div>

        {/* Era toggle */}
        <div style={{ display: "flex", background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 3, gap: 3 }}>
          {(["vintage", "modern"] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setPage(1); }} style={{
              padding: "6px 18px", borderRadius: "calc(var(--radius) - 4px)", border: "none",
              background: tab === t ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent",
              color: tab === t ? "var(--accent)" : "var(--text-3)",
              fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
              outline: tab === t ? "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" : "none",
            }}>
              {t === "vintage" ? "Vintage (pre-2003)" : "Modern (2003+)"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      {!isLoading && !isError && (
        <div className="grid-4col">
          <Stat label="Opportunities" value={rows.length} sub="with >2x spread" color="var(--accent)" />
          <Stat label="Best Spread" value={rows[0] ? formatCents((rows[0].psa10Price ?? 0) - (rows[0].marketPrice ?? rows[0].rawPrice ?? 0)) : "—"} sub={rows[0]?.name ?? ""} color="var(--pos)" />
          <Stat label="Avg Upside" value={rows.length ? `${(rows.reduce((s, r) => s + ((r.marketPrice ?? r.rawPrice ?? 0) > 0 && (r.psa10Price ?? 0) > (r.marketPrice ?? r.rawPrice ?? 0) ? (r.psa10Price ?? 0) / (r.marketPrice ?? r.rawPrice ?? 0) : 0), 0) / rows.length).toFixed(1)}x` : "—"} />
          <Stat label="Grading Cost" value="$25" sub="PSA Value Bulk" />
        </div>
      )}

      {isError ? (
        <ErrorState message="Failed to load grading data" onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="grid-2col">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: 160, borderRadius: "var(--radius)" }} />)}
        </div>
      ) : rows.length === 0 ? (
        <Panel style={{ padding: "40px 20px", textAlign: "center" }}>
          <p style={{ color: "var(--text-3)", fontSize: 13 }}>No grading data yet — run sync-ebay to populate PSA10 prices.</p>
        </Panel>
      ) : (
        <div className="grid-grading">
          {rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((c) => {
            const raw = c.marketPrice ?? c.rawPrice ?? 0;
            const cost = raw + 2500; // $25 in cents
            const profit = (c.psa10Price ?? 0) - cost;
            const ev = profit * 0.4; // 40% chance PSA 10
            const upside = raw > 0 && (c.psa10Price ?? 0) > raw ? +((c.psa10Price ?? 0) / raw).toFixed(1) : 0;
            return (
              <div key={c.id} onClick={() => router.push(`/cards/${c.id}`)} style={{
                display: "grid", gridTemplateColumns: "80px 1fr auto", gap: 16,
                padding: 16, background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "var(--radius)", cursor: "pointer",
              }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}>
                <CardArt cardId={c.id} name={c.name} imageUrl={c.imageSmall} w={80} h={112} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 10 }}>{c.setName} · {c.rarity ?? ""}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11, fontFamily: "var(--font-mono)" }}>
                    <div style={{ color: "var(--text-3)" }}>Raw: <span style={{ color: "var(--text)" }}>{formatCents(raw)}</span></div>
                    <div style={{ color: "var(--text-3)" }}>PSA 10: <span style={{ color: "var(--text)" }}>{formatCents(c.psa10Price)}</span></div>
                    <div style={{ color: "var(--text-3)" }}>Cost: <span style={{ color: "var(--text)" }}>{formatCents(cost)}</span></div>
                    <div style={{ color: "var(--text-3)" }}>Spread: <span style={{ color: "var(--pos)" }}>{formatCents(profit)}</span></div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "1px" }}>Profit if 10</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--pos)", fontFamily: "var(--font-mono)" }}>+{formatCents(profit)}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginTop: 4 }}>EV: {formatCents(ev)}</div>
                  <div style={{
                    marginTop: 10, padding: "3px 10px", borderRadius: 999,
                    background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                    color: upside >= 10 ? "var(--accent)" : upside >= 5 ? "var(--pos)" : "var(--text-2)",
                    fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)",
                  }}>{upside.toFixed(1)}x</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {rows.length > PAGE_SIZE && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, padding: "8px 0" }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{
            padding: "8px 20px", borderRadius: "var(--radius)", border: "1px solid var(--border)",
            background: page === 1 ? "transparent" : "var(--bg-panel)", color: page === 1 ? "var(--text-3)" : "var(--text)",
            fontSize: 12, fontWeight: 600, cursor: page === 1 ? "default" : "pointer", opacity: page === 1 ? 0.4 : 1,
          }}>← Prev</button>
          <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
            Page {page} of {Math.ceil(rows.length / PAGE_SIZE)} · {rows.length} cards
          </span>
          <button onClick={() => setPage((p) => Math.min(Math.ceil(rows.length / PAGE_SIZE), p + 1))} disabled={page >= Math.ceil(rows.length / PAGE_SIZE)} style={{
            padding: "8px 20px", borderRadius: "var(--radius)", border: "1px solid var(--border)",
            background: page >= Math.ceil(rows.length / PAGE_SIZE) ? "transparent" : "var(--bg-panel)", color: page >= Math.ceil(rows.length / PAGE_SIZE) ? "var(--text-3)" : "var(--text)",
            fontSize: 12, fontWeight: 600, cursor: page >= Math.ceil(rows.length / PAGE_SIZE) ? "default" : "pointer", opacity: page >= Math.ceil(rows.length / PAGE_SIZE) ? 0.4 : 1,
          }}>Next →</button>
        </div>
      )}
    </div>
  );
}
