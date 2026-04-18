"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { trpc } from "@/lib/trpc/client";
import { Panel } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/Stat";
import { Pill } from "@/components/ui/Pill";
import { CardArt } from "@/components/ui/CardArt";
import { Sparkline } from "@/components/ui/Sparkline";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatCents, clr } from "@/lib/utils/formatting";
type Tab = "buy" | "momentum" | "grading" | "vintage" | "modern";

const TABS: { key: Tab; label: string }[] = [
  { key: "buy", label: "Buy Now (Ranked)" },
  { key: "momentum", label: "Momentum" },
  { key: "grading", label: "Grading Plays" },
  { key: "vintage", label: "Vintage" },
  { key: "modern", label: "Modern" },
];

type EnrichedCard = {
  id: string; name: string; imageSmall: string | null; setName: string;
  rarity: string | null; raw: number; psa10: number; gradeUpside: number;
  signals: string[]; buyScore: number; vol: number; year: number;
  [key: string]: unknown;
};

function enrichCard(c: Record<string, unknown>): EnrichedCard {
  const mp = (c.marketPrice as number | null) ?? 0;
  const raw = (c.rawPrice as number | null) ?? mp;
  const psa10 = (c.psa10Price as number | null) ?? 0;
  const vol = (c.volume as number | null) ?? 0;
  const rarity = (c.rarity as string) ?? "";
  const releaseDate = c.releaseDate ? new Date(c.releaseDate as string) : null;
  const year = releaseDate?.getFullYear() ?? 2020;

  const gradeUpside = raw > 0 && psa10 > raw ? +(psa10 / raw).toFixed(1) : 0;

  // Simple signal detection
  const signals: string[] = [];
  if (gradeUpside >= 3) signals.push("Grading Candidate");
  if (rarity && ["Rare Holo", "Illustration Rare", "Rare Secret"].includes(rarity)) signals.push("Collector Favorite");
  if (year < 2005 && raw > 5000) signals.push("Blue Chip");
  if (vol > 200) signals.push("High Liquidity");

  // Simple buy score
  let score = 50;
  if (gradeUpside >= 5) score += 15;
  else if (gradeUpside >= 2) score += 8;
  if (vol > 100) score += 10;
  if (signals.length > 0) score += 8;
  score = Math.min(99, Math.max(10, score));

  return { ...c, raw, psa10, gradeUpside, signals, buyScore: score, vol, year } as EnrichedCard;
}

export default function MarketPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("buy");

  const { data: dashboard, isLoading, isError, refetch } = trpc.analytics.dashboard.useQuery();
  const { data: indexHistory } = trpc.analytics.indexHistory.useQuery();

  const indexData = useMemo(
    () => (indexHistory ?? []).map((s) => ({
      date: new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: +(s.value / 100).toFixed(2),
    })),
    [indexHistory]
  );

  const indexVal = indexData.length > 0 ? indexData[indexData.length - 1].value : 0;
  const indexStart = indexData.length > 0 ? indexData[0].value : 0;
  const totalRet = indexStart > 0 ? ((indexVal - indexStart) / indexStart) * 100 : 0;

  // Combine all card sources and enrich
  const allCards = useMemo(() => {
    if (!dashboard) return [];
    const combined = [
      ...(dashboard.topByPrice ?? []),
      ...(dashboard.topByVolume ?? []),
      ...(dashboard.topGradingVintage ?? []),
      ...(dashboard.topGradingModern ?? []),
      ...(dashboard.vintageHolos ?? []),
    ];
    const unique = new Map<string, Record<string, unknown>>();
    combined.forEach((c) => unique.set(c.id, c as Record<string, unknown>));
    return [...unique.values()].map(enrichCard);
  }, [dashboard]);

  const data = useMemo(() => {
    const list = [...allCards];
    if (tab === "buy") list.sort((a, b) => b.buyScore - a.buyScore);
    if (tab === "momentum") list.sort((a, b) => (b.vol ?? 0) - (a.vol ?? 0));
    if (tab === "grading") list.sort((a, b) => b.gradeUpside - a.gradeUpside);
    if (tab === "vintage") return list.filter((c) => c.year < 2005).sort((a, b) => b.raw - a.raw);
    if (tab === "modern") return list.filter((c) => c.year >= 2019).sort((a, b) => b.buyScore - a.buyScore);
    return list.slice(0, 30);
  }, [allCards, tab]);

  const stats = dashboard?.stats;

  if (isError) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: "var(--display-weight)" as unknown as number, color: "var(--text)", margin: 0 }}>Market</h1>
        <ErrorState message="Failed to load market data" onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: "var(--display-weight)" as unknown as number, color: "var(--text)", margin: 0 }}>Market</h1>
        <p style={{ color: "var(--text-3)", fontSize: 14, margin: "4px 0 0" }}>Every tracked card, ranked every way that matters.</p>
      </div>

      {/* Top stats */}
      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: "var(--radius)" }} />)}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12 }}>
          <Panel padding={18}>
            <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 6 }}>Pokemon 250 Index</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 10 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color: "var(--accent)" }}>{indexVal.toLocaleString()}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: clr(totalRet) }}>{totalRet >= 0 ? "+" : ""}{totalRet.toFixed(1)}% 5Y</span>
            </div>
            <Sparkline data={indexData.map((p) => p.value)} width={380} height={42} />
          </Panel>
          <Stat label="Total Market Cap" value={stats?.totalMarketCap ? `$${(stats.totalMarketCap / 10000).toFixed(1)}M` : "—"} sub="+2.1% today" color="var(--pos)" />
          <Stat label="Cards Tracked" value={stats?.trackedCards?.toLocaleString() ?? "—"} sub={`of ${stats?.totalCards?.toLocaleString() ?? "—"} total`} />
          <Stat label="Avg Card Price" value={stats?.avgMarketPrice ? formatCents(stats.avgMarketPrice) : "—"} color="var(--accent)" />
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, background: "var(--bg-panel-2)", padding: 4, borderRadius: "var(--radius)", width: "fit-content" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "8px 16px", borderRadius: "calc(var(--radius) - 4px)", border: "none",
            background: tab === t.key ? "var(--bg-panel)" : "transparent",
            color: tab === t.key ? "var(--accent)" : "var(--text-3)",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            boxShadow: tab === t.key ? "var(--glow)" : "none",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Market table */}
      <Panel padding={0}>
        {isLoading ? (
          <div style={{ padding: 20 }}>
            {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: 52, marginBottom: 8, borderRadius: 6 }} />)}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg-panel-2)" }}>
                  {["#", "Card", "Price", "Grade Up", "Volume", "Signals", "", "Score"].map((h, i) => (
                    <th key={i} style={{ padding: "12px 14px", color: "var(--text-3)", fontSize: 10, fontWeight: 700, textAlign: i > 1 && i < 6 ? "right" : "left", textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 30).map((c, i) => (
                  <tr key={c.id as string} onClick={() => router.push(`/cards/${c.id}`)} style={{ cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                    onMouseOver={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 5%, transparent)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}>
                    <td style={{ padding: "10px 14px", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{i + 1}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <CardArt cardId={c.id as string} name={c.name as string} imageUrl={c.imageSmall as string | null} w={36} h={50} />
                        <div>
                          <div style={{ color: "var(--text)", fontWeight: 600 }}>{c.name as string}</div>
                          <div style={{ color: "var(--text-3)", fontSize: 11 }}>{(c.setName as string) ?? ""} · {(c.rarity as string) ?? ""}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", textAlign: "right", color: "var(--text)" }}>{formatCents(c.raw)}</td>
                    <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", textAlign: "right", color: "var(--text-2)" }}>{c.gradeUpside}x</td>
                    <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", textAlign: "right", color: "var(--text-2)" }}>{c.vol ?? "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 180 }}>
                        {c.signals.slice(0, 2).map((s: string) => <Pill key={s} label={s} />)}
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px" }}><Sparkline data={[c.raw * 0.9, c.raw * 0.95, c.raw * 1.02, c.raw * 0.98, c.raw]} width={80} height={26} /></td>
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>
                      <span style={{
                        fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700,
                        color: c.buyScore >= 80 ? "var(--pos)" : c.buyScore >= 60 ? "var(--accent)" : "var(--text-2)",
                        padding: "3px 8px", borderRadius: 999,
                        border: `1px solid ${c.buyScore >= 80 ? "var(--pos)" : c.buyScore >= 60 ? "var(--accent)" : "var(--border)"}`,
                      }}>{c.buyScore}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Index chart */}
      <Panel title="Pokemon 250 Index · History">
        {indexData.length < 2 ? (
          <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: 13 }}>
            No index history yet — run seed-history.ts
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 32, fontWeight: 700, color: "var(--accent)" }}>{indexVal.toLocaleString()}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: clr(totalRet), marginLeft: 12 }}>{totalRet >= 0 ? "+" : ""}{totalRet.toFixed(1)}%</span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={indexData}>
                <defs>
                  <linearGradient id="idxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "var(--text-3)", fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(indexData.length / 6))} />
                <YAxis tick={{ fill: "var(--text-3)", fontSize: 10 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} labelStyle={{ color: "var(--text-3)" }} itemStyle={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }} />
                <Area type="monotone" dataKey="value" stroke="var(--accent)" fill="url(#idxGrad)" strokeWidth={2} dot={false} name="Index" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </Panel>
    </div>
  );
}
