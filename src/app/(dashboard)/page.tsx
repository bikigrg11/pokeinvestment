"use client";

import { useMemo } from "react";
import { trpc as api } from "@/lib/trpc/client";
import { ErrorState } from "@/components/ui/ErrorState";
import { BuyScoreRing } from "@/components/ui/BuyScoreRing";
import { Sparkline } from "@/components/ui/Sparkline";
import { Pill } from "@/components/ui/Pill";
import { Panel } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/Stat";
import { CardArt } from "@/components/ui/CardArt";
import { formatCents, formatNum, clr } from "@/lib/utils/formatting";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────

type CardRow = {
  id: string;
  name: string;
  rarity: string | null;
  imageSmall: string | null;
  setName: string;
  marketPrice: number | null;
  volume: number | null;
  psa10Price: number | null;
  rawPrice: number | null;
};

type EnrichedCard = CardRow & {
  buyScore: number;
  thesis: string;
  signals: string[];
  gradingUpside: number | null;
};

// ─── Helpers ────────────────────────────────────────────────────────

/** Compute a buy score (0–99) from available data. */
function computeBuyScore(c: CardRow): number {
  let score = 40; // base
  const priceD = (c.marketPrice ?? 0) / 100;
  if (priceD > 100) score += 8;
  if (priceD > 500) score += 6;
  if ((c.volume ?? 0) > 50) score += 12;
  if ((c.volume ?? 0) > 200) score += 8;
  const gu = c.psa10Price && c.rawPrice && c.rawPrice > 0 ? c.psa10Price / c.rawPrice : 0;
  if (gu > 3) score += 10;
  if (gu > 8) score += 8;
  return Math.min(99, Math.max(12, score));
}

/** Generate a thesis from card data. */
function generateThesis(c: CardRow): string {
  const gu = c.psa10Price && c.rawPrice && c.rawPrice > 0 ? (c.psa10Price / c.rawPrice).toFixed(1) : null;
  if (gu && Number(gu) > 8) return `PSA 10 trades at ${gu}× raw — strong grading arbitrage with proven floor.`;
  if ((c.volume ?? 0) > 300) return `High liquidity with ${c.volume} monthly sales — institutional-grade demand.`;
  if (gu && Number(gu) > 3) return `Raw copies grade into ${gu}× PSA 10 value — clean arbitrage opportunity.`;
  return `${c.rarity ?? "Rare"} from ${c.setName} with solid market fundamentals.`;
}

/** Derive signals from card data. */
function deriveSignals(c: CardRow): string[] {
  const sigs: string[] = [];
  const priceD = (c.marketPrice ?? 0) / 100;
  if (priceD > 500) sigs.push("Blue Chip");
  if ((c.volume ?? 0) > 300) sigs.push("High Liquidity");
  const gu = c.psa10Price && c.rawPrice && c.rawPrice > 0 ? c.psa10Price / c.rawPrice : 0;
  if (gu > 5) sigs.push("Grading Candidate");
  if (c.rarity?.toLowerCase().includes("holo")) sigs.push("Collector Favorite");
  if (sigs.length === 0) sigs.push("Steady Gainer");
  return sigs.slice(0, 3);
}

function enrichCard(c: CardRow): EnrichedCard {
  return {
    ...c,
    buyScore: computeBuyScore(c),
    thesis: generateThesis(c),
    signals: deriveSignals(c),
    gradingUpside:
      c.psa10Price && c.rawPrice && c.rawPrice > 0
        ? +(c.psa10Price / c.rawPrice).toFixed(1)
        : null,
  };
}

// ─── Static market pulse ────────────────────────────────────────────

const MARKET_PULSE = [
  { t: "2h", tag: "BREAKOUT", text: "Alt art modern holos showing 14% volume spike across major sets" },
  { t: "5h", tag: "GRADING", text: "PSA announces faster turnaround — expect PSA 10 population spike" },
  { t: "1d", tag: "VOLUME", text: "151 sealed UPC volume up 3.2× after Japan restock confirmation" },
  { t: "2d", tag: "CATALYST", text: "Base Set PSA 10 pop drops below 200 after reholder rejects" },
  { t: "3d", tag: "INDEX", text: "Pokémon 250 crosses all-time high, led by Evolving Skies alt arts" },
];

function pulseTagColor(tag: string): string {
  if (tag === "BREAKOUT") return "var(--pos)";
  if (tag === "CATALYST") return "var(--accent)";
  return "var(--neu)";
}

// ─── Chart tooltip ──────────────────────────────────────────────────

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
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
      }}
    >
      <div style={{ color: "var(--text-3)", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600, fontFamily: "var(--font-mono)" }}>
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="skeleton" style={{ height: 220, borderRadius: "var(--radius)" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 80, borderRadius: "var(--radius)" }} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        <div className="skeleton" style={{ height: 360, borderRadius: "var(--radius)" }} />
        <div className="skeleton" style={{ height: 360, borderRadius: "var(--radius)" }} />
      </div>
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = api.analytics.dashboard.useQuery();
  const { data: indexHistory } = api.analytics.indexHistory.useQuery();

  const indexData = useMemo(
    () =>
      (indexHistory ?? []).map((d) => ({
        date: d.date instanceof Date ? d.date.toISOString().slice(0, 10) : String(d.date).slice(0, 10),
        value: Number(d.value),
      })),
    [indexHistory]
  );

  // Enrich cards with computed fields
  const topByPrice = useMemo(
    () => ((data?.topByPrice ?? []) as CardRow[]).map(enrichCard),
    [data?.topByPrice]
  );
  const topGradingVintage = useMemo(
    () => ((data?.topGradingVintage ?? []) as CardRow[]).map(enrichCard),
    [data?.topGradingVintage]
  );
  const topGradingModern = useMemo(
    () => ((data?.topGradingModern ?? []) as CardRow[]).map(enrichCard),
    [data?.topGradingModern]
  );

  if (isLoading) return <DashboardSkeleton />;

  if (isError) {
    return (
      <div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 32,
            fontWeight: 800,
            color: "var(--text)",
            margin: 0,
          }}
        >
          Dashboard
        </h1>
        <ErrorState message="Failed to load dashboard data" onRetry={() => void refetch()} />
      </div>
    );
  }

  const stats = data?.stats;
  const topBuy = topByPrice[0];
  const buyNowList = topByPrice.slice(1, 5);
  const gradingPlays = [...topGradingVintage, ...topGradingModern]
    .filter((c) => c.gradingUpside != null)
    .sort((a, b) => (b.gradingUpside ?? 0) - (a.gradingUpside ?? 0))
    .slice(0, 4);

  const currentIdx = indexData[indexData.length - 1];
  const prevIdx = indexData[indexData.length - 2];
  const indexChange =
    currentIdx && prevIdx
      ? ((currentIdx.value - prevIdx.value) / prevIdx.value) * 100
      : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ─── Hero: Today's Top Buy ─── */}
      {topBuy && (
        <div
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border-hi)",
            borderRadius: "var(--radius)",
            padding: 28,
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 28,
            alignItems: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Accent glow */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: 300,
              background: "radial-gradient(circle at 90% 50%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 60%)",
              pointerEvents: "none",
            }}
          />

          <CardArt cardId={topBuy.id} name={topBuy.name} imageUrl={topBuy.imageSmall} w={130} h={182} />

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span
                style={{
                  fontSize: 10,
                  color: "var(--accent)",
                  fontWeight: 700,
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                }}
              >
                ● Today&apos;s Top Buy Signal
              </span>
              <span style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.8px" }}>
                Updated 4 min ago
              </span>
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 36,
                fontWeight: "var(--display-weight)" as unknown as number,
                color: "var(--text)",
                margin: "0 0 4px",
                letterSpacing: "-0.5px",
              }}
            >
              {topBuy.name}
            </h2>
            <div style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 14 }}>
              {topBuy.setName} · {topBuy.rarity ?? "Rare"}
            </div>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                color: "var(--text)",
                lineHeight: 1.4,
                margin: "0 0 16px",
                maxWidth: 620,
                fontWeight: 500,
                fontStyle: "italic",
              }}
            >
              &ldquo;{topBuy.thesis}&rdquo;
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {topBuy.signals.map((s) => (
                <Pill key={s} label={s} />
              ))}
            </div>
          </div>

          <div
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <BuyScoreRing score={topBuy.buyScore} size={100} />
            <div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: "var(--text)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {formatCents(topBuy.marketPrice)}
              </div>
            </div>
            <button
              onClick={() => router.push(`/cards/${topBuy.id}`)}
              style={{
                padding: "10px 22px",
                borderRadius: "var(--radius)",
                border: "1px solid var(--accent)",
                background: "var(--accent)",
                color: "var(--bg-page)",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.3px",
              }}
            >
              View full analysis →
            </button>
          </div>
        </div>
      )}

      {/* ─── 4-Stat Strip ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <Stat
          label="Pokémon 250 Index"
          value={currentIdx ? formatNum(currentIdx.value, 0) : "—"}
          sub={indexChange != null ? `${indexChange >= 0 ? "+" : ""}${indexChange.toFixed(2)}% today` : undefined}
          color={indexChange != null ? clr(indexChange) : undefined}
        />
        <Stat label="Market Sentiment" value="Bullish" sub="72% of tracked up 7d" color="var(--pos)" />
        <Stat
          label="Total Market Cap"
          value={
            stats?.totalMarketCap != null
              ? `$${((stats.totalMarketCap / 100) / 1_000_000).toFixed(1)}M`
              : "—"
          }
          sub={`${stats?.trackedCards ?? 0} tracked cards`}
        />
        <Stat
          label="Active Signals"
          value={String(stats?.trackedCards ?? 0)}
          sub="across all tracked"
          color="var(--accent)"
        />
      </div>

      {/* ─── Buy Now + Market Pulse ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        <Panel
          title="Buy Now — Ranked by Score"
          action={
            <button
              onClick={() => router.push("/market")}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              See all →
            </button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {buyNowList.map((c, i) => (
              <div
                key={c.id}
                onClick={() => router.push(`/cards/${c.id}`)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "28px 56px 1fr 100px 100px 60px",
                  gap: 14,
                  alignItems: "center",
                  padding: "12px 4px",
                  borderBottom: i < buyNowList.length - 1 ? "1px solid var(--border)" : "none",
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "color-mix(in srgb, var(--accent) 4%, transparent)";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "transparent";
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-3)",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  #{i + 2}
                </span>
                <CardArt cardId={c.id} name={c.name} imageUrl={c.imageSmall} w={52} h={72} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-3)" }}>{c.setName}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-2)",
                      fontStyle: "italic",
                      marginTop: 3,
                      lineHeight: 1.3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.thesis.length > 75 ? c.thesis.slice(0, 72) + "…" : c.thesis}
                  </div>
                </div>
                <Sparkline
                  data={[100, 105, 98, 110, 107, 115, 120, 118, 125, 130]}
                  width={80}
                  height={32}
                />
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text)",
                    }}
                  >
                    {formatCents(c.marketPrice)}
                  </div>
                </div>
                <BuyScoreRing score={c.buyScore} size={48} showLabel={false} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Market Pulse" padding={0}>
          <div style={{ padding: "4px 0" }}>
            {MARKET_PULSE.map((p, i) => (
              <div
                key={i}
                style={{
                  padding: "12px 18px",
                  borderBottom: i < MARKET_PULSE.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Pill label={p.tag} color={pulseTagColor(p.tag)} />
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-3)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {p.t} ago
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.4 }}>{p.text}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ─── Index Chart + Grading Arbitrage ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20 }}>
        <Panel title="Pokémon 250 Index · 5Y">
          {indexData.length > 1 ? (
            <>
              <div style={{ marginBottom: 8 }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 32,
                    fontWeight: 700,
                    color: "var(--accent)",
                  }}
                >
                  {currentIdx ? formatNum(currentIdx.value, 0) : "—"}
                </span>
                {indexChange != null && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 14,
                      color: clr(indexChange),
                      marginLeft: 12,
                    }}
                  >
                    {indexChange >= 0 ? "+" : ""}
                    {indexChange.toFixed(2)}% today
                  </span>
                )}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={indexData}>
                  <defs>
                    <linearGradient id="idxGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--text-3)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.max(0, Math.floor(indexData.length / 6))}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-3)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--accent)"
                    fill="url(#idxGrad)"
                    strokeWidth={2}
                    dot={false}
                    name="Index"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div
              style={{
                height: 260,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-3)",
                fontSize: 13,
              }}
            >
              No index history yet — run seed-history.ts
            </div>
          )}
        </Panel>

        <Panel
          title="Grading Arbitrage · Best Spreads"
          action={
            <button
              onClick={() => router.push("/grading")}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Full list →
            </button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {gradingPlays.length === 0 && (
              <div style={{ color: "var(--text-3)", fontSize: 13, padding: "20px 0" }}>
                No grading data available
              </div>
            )}
            {gradingPlays.map((c) => (
              <div
                key={c.id}
                onClick={() => router.push(`/cards/${c.id}`)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr auto",
                  gap: 12,
                  alignItems: "center",
                  padding: 10,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent)";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
                }}
              >
                <CardArt cardId={c.id} name={c.name} imageUrl={c.imageSmall} w={40} h={56} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>{c.setName}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--accent)",
                    }}
                  >
                    {c.gradingUpside}×
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--text-3)",
                    }}
                  >
                    {formatCents(c.rawPrice)} → {formatCents(c.psa10Price)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
