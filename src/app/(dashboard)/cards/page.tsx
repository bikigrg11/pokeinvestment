"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { trpc as api } from "@/lib/trpc/client";
import { ErrorState } from "@/components/ui/ErrorState";
import { CardArt } from "@/components/ui/CardArt";
import { Pill } from "@/components/ui/Pill";
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

const PAGE_SIZE = 40;

// Module-level cache — survives React re-mounts and page navigations
const _filterCache = {
  search: "",
  filterSet: "",
  filterRarity: "",
  filterSignal: "",
  page: 1,
};

function enrichCard(c: Record<string, unknown>) {
  const mp = (c as { prices?: Array<{ marketPrice?: number | null }> }).prices?.[0]?.marketPrice ?? 0;
  const raw = mp;
  const psa10 = (c as { prices?: Array<{ psa10Price?: number | null }> }).prices?.[0]?.psa10Price ?? 0;
  const rarity = (c as { rarity?: string }).rarity ?? "";
  const gradeUpside = raw > 0 && psa10 > raw ? +(psa10 / raw).toFixed(1) : 0;
  const signals: string[] = [];
  if (gradeUpside >= 3) signals.push("Grading Candidate");
  if (rarity && ["Rare Holo", "Illustration Rare", "Rare Secret"].includes(rarity)) signals.push("Collector Favorite");

  let score = 50;
  if (gradeUpside >= 5) score += 15;
  else if (gradeUpside >= 2) score += 8;
  if (signals.length > 0) score += 8;
  score = Math.min(99, Math.max(10, score));
  return { raw, psa10, gradeUpside, signals, buyScore: score };
}

export default function CardsPage() {
  const router = useRouter();

  const [search, setSearch] = useState(_filterCache.search);
  const [filterSet, setFilterSet] = useState(_filterCache.filterSet);
  const [filterRarity, setFilterRarity] = useState(_filterCache.filterRarity);
  const [filterSignal, setFilterSignal] = useState(_filterCache.filterSignal);
  const [page, setPage] = useState(_filterCache.page);

  const [debouncedSearch, setDebouncedSearch] = useState(_filterCache.search);
  useEffect(() => {
    _filterCache.search = search;
    setPage(1); _filterCache.page = 1;
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { _filterCache.filterSet = filterSet; setPage(1); _filterCache.page = 1; }, [filterSet]);
  useEffect(() => { _filterCache.filterRarity = filterRarity; setPage(1); _filterCache.page = 1; }, [filterRarity]);
  useEffect(() => { _filterCache.filterSignal = filterSignal; setPage(1); _filterCache.page = 1; }, [filterSignal]);
  useEffect(() => { _filterCache.page = page; }, [page]);

  const { data, isLoading, isError, refetch } = api.cards.list.useQuery({
    q: debouncedSearch || undefined,
    setId: filterSet || undefined,
    rarity: filterRarity || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const { data: setsData } = api.sets.list.useQuery({});

  const cards = useMemo(() => data?.cards ?? [], [data]);

  const uniqueRarities = useMemo(() => {
    const rarities = new Set<string>();
    cards.forEach((c) => { if (c.rarity) rarities.add(c.rarity); });
    return [...rarities].sort();
  }, [cards]);

  const sets = setsData ?? [];

  const inpStyle: React.CSSProperties = {
    padding: "9px 12px", borderRadius: "var(--radius)", border: "1px solid var(--border)",
    background: "var(--bg-panel)", color: "var(--text)", fontSize: 13, outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: "var(--display-weight)" as unknown as number, color: "var(--text)", margin: 0 }}>Card Database</h1>
        <p style={{ color: "var(--text-3)", fontSize: 14, margin: "4px 0 0" }}>
          {isLoading ? "Loading..." : `${(data?.total ?? 0).toLocaleString()} cards tracked. Click any to run full analysis.`}
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 300px" }}>
          <div style={{ position: "absolute", left: 12, top: 11, color: "var(--text-3)" }}><Search size={14} /></div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search cards by name or set..." style={{ ...inpStyle, width: "100%", paddingLeft: 34, boxSizing: "border-box" }} />
        </div>
        <select value={filterSet} onChange={(e) => setFilterSet(e.target.value)} style={inpStyle}>
          <option value="">All Sets</option>
          {sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterRarity} onChange={(e) => setFilterRarity(e.target.value)} style={inpStyle}>
          <option value="">All Rarities</option>
          {uniqueRarities.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filterSignal} onChange={(e) => setFilterSignal(e.target.value)} style={inpStyle}>
          <option value="">All Signals</option>
          {SIGNALS.map((s) => <option key={s} value={s}>{s.replace(/([A-Z])/g, " $1").trim()}</option>)}
        </select>
      </div>

      {isError ? (
        <ErrorState message="Failed to load cards" onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {[...Array(12)].map((_, i) => <div key={i} className="skeleton" style={{ height: 240, borderRadius: "var(--radius)" }} />)}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {cards.map((c) => {
            const enriched = enrichCard(c as unknown as Record<string, unknown>);
            const mp = c.prices[0]?.marketPrice ?? null;
            return (
              <div key={c.id} onClick={() => router.push(`/cards/${c.id}`)} style={{
                background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 14,
                cursor: "pointer", transition: "border-color 0.15s",
              }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                  <CardArt cardId={c.id} name={c.name} imageUrl={c.imageSmall} w={70} h={98} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>{c.set.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>#{c.cardNumber}</div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{mp != null ? formatCents(mp) : "—"}</div>
                  </div>
                  <div style={{
                    padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)",
                    color: enriched.buyScore >= 80 ? "var(--pos)" : enriched.buyScore >= 60 ? "var(--accent)" : "var(--text-3)",
                    border: `1px solid ${enriched.buyScore >= 80 ? "var(--pos)" : enriched.buyScore >= 60 ? "var(--accent)" : "var(--border)"}`,
                  }}>{enriched.buyScore}</div>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {enriched.signals.slice(0, 2).map((s: string) => <Pill key={s} label={s} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !isError && data && data.total > PAGE_SIZE && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, paddingTop: 8 }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{
              padding: "8px 18px", borderRadius: "var(--radius)", border: "1px solid var(--border)",
              background: page <= 1 ? "var(--bg-panel)" : "var(--bg-card)", color: page <= 1 ? "var(--text-3)" : "var(--text)",
              cursor: page <= 1 ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
            Page {page} of {Math.ceil(data.total / PAGE_SIZE)}
          </span>
          <button
            disabled={page >= Math.ceil(data.total / PAGE_SIZE)}
            onClick={() => setPage((p) => p + 1)}
            style={{
              padding: "8px 18px", borderRadius: "var(--radius)", border: "1px solid var(--border)",
              background: page >= Math.ceil(data.total / PAGE_SIZE) ? "var(--bg-panel)" : "var(--bg-card)", color: page >= Math.ceil(data.total / PAGE_SIZE) ? "var(--text-3)" : "var(--text)",
              cursor: page >= Math.ceil(data.total / PAGE_SIZE) ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
