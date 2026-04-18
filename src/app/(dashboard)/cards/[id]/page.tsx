"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc as api } from "@/lib/trpc/client";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { CardArt } from "@/components/ui/CardArt";
import { BuyScoreRing } from "@/components/ui/BuyScoreRing";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatCents, formatNum, clr } from "@/lib/utils/formatting";
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const RANGES = { "3M": 90, "6M": 180, "1Y": 365, ALL: 9999 };

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: "var(--text-3)", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600, fontFamily: "var(--font-mono)" }}>
          {p.name}: {p.dataKey === "price" ? formatCents(p.value) : formatNum(p.value, 0)}
        </div>
      ))}
    </div>
  );
}

function CardDetailSkeleton() {
  return (
    <div>
      <div className="skeleton" style={{ height: 14, width: 100, borderRadius: 4, marginBottom: 16 }} />
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 280px", gap: 28, marginBottom: 24 }}>
        <div className="skeleton" style={{ width: 200, height: 280, borderRadius: "var(--radius)" }} />
        <div>
          <div className="skeleton" style={{ height: 40, width: "60%", borderRadius: 4, marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 14, width: "40%", borderRadius: 4, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 80, borderRadius: "var(--radius)" }} />
        </div>
        <div>
          <div className="skeleton" style={{ height: 110, width: 110, borderRadius: "50%", marginLeft: "auto", marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 36, borderRadius: 4, marginBottom: 8 }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: 340, borderRadius: "var(--radius)", marginBottom: 20 }} />
    </div>
  );
}

export default function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [range, setRange] = useState<keyof typeof RANGES>("1Y");
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  const { data: card, isLoading, isError, refetch } = api.cards.byId.useQuery({ id });

  if (isLoading) return <CardDetailSkeleton />;

  if (isError) {
    return (
      <div>
        <button onClick={() => router.push("/cards")} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 16 }}>
          ← Back to Cards
        </button>
        <ErrorState message="Failed to load card" onRetry={() => void refetch()} />
      </div>
    );
  }

  if (!card) {
    return (
      <div>
        <button onClick={() => router.push("/cards")} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 16 }}>
          ← Back to Cards
        </button>
        <div style={{ color: "var(--neg)", fontSize: 14, padding: "40px 0" }}>Card not found.</div>
      </div>
    );
  }

  const allVariantEntries = Object.entries(card.latestByVariant).sort(
    ([, a], [, b]) => (b.marketPrice ?? 0) - (a.marketPrice ?? 0)
  );
  const activeVariantKey = selectedVariant ?? allVariantEntries[0]?.[0] ?? null;
  const activeVariantData = activeVariantKey ? card.latestByVariant[activeVariantKey] : null;

  const cutoffMs = Date.now() - RANGES[range] * 86400 * 1000;
  const chartData = card.prices
    .filter((p) => p.variant === activeVariantKey && new Date(p.date).getTime() >= cutoffMs)
    .map((p) => ({
      date: new Date(p.date).toISOString().slice(0, 10),
      price: (p.marketPrice ?? 0) / 100,
      volume: p.volume ?? 0,
    }));

  const startPrice = chartData[0]?.price ?? 0;
  const endPrice = chartData[chartData.length - 1]?.price ?? 0;
  const rangeReturn = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;
  const priceColor = rangeReturn >= 0 ? "var(--pos)" : "var(--neg)";

  const roi = chartData.length >= 2 && startPrice > 0 ? rangeReturn : null;
  const rangeDays = RANGES[range] === 9999 ? chartData.length * 7 : RANGES[range];
  const rangeYears = rangeDays / 365;
  const cagr = roi != null && rangeYears > 0 && startPrice > 0
    ? (Math.pow(endPrice / startPrice, 1 / rangeYears) - 1) * 100
    : null;

  const periodReturns = chartData.slice(1).map((d, i) => {
    const prev = chartData[i].price;
    return prev > 0 ? (d.price - prev) / prev : 0;
  });
  const avgR = periodReturns.length > 0 ? periodReturns.reduce((s, r) => s + r, 0) / periodReturns.length : 0;
  const variance = periodReturns.length > 1 ? periodReturns.reduce((s, r) => s + (r - avgR) ** 2, 0) / periodReturns.length : 0;
  const volatility = periodReturns.length >= 4 ? Math.sqrt(variance * 52) * 100 : null;

  const marketPrice = activeVariantData?.marketPrice ?? null;
  const ebayRawPrice = activeVariantData?.rawPrice ?? null;
  const rawPrice = ebayRawPrice ?? marketPrice;
  const volume = activeVariantData?.volume ?? null;

  const priceIsSuspicious = ebayRawPrice != null && marketPrice != null && marketPrice > ebayRawPrice * 5 && ebayRawPrice > 200;

  const psa10PriceRaw = activeVariantData?.psa10Price ?? null;
  const referencePrice = rawPrice ?? marketPrice;
  const psa10Price = psa10PriceRaw != null && referencePrice != null && psa10PriceRaw > referencePrice ? psa10PriceRaw : null;
  const gradingUpside = psa10Price != null && rawPrice != null && rawPrice > 0 ? psa10Price / rawPrice : null;
  const psaSpread = psa10Price != null && marketPrice != null ? psa10Price - marketPrice : null;

  // Investment score breakdown
  const scores = [
    { label: "Momentum", v: Math.max(0, Math.min(100, 50 + rangeReturn)) },
    { label: "Liquidity", v: volume != null ? Math.min(100, Math.round((volume / 500) * 100)) : 0 },
    { label: "Grading Upside", v: gradingUpside != null ? Math.min(100, Math.round(gradingUpside * 10)) : 0 },
    { label: "Stability", v: volatility != null ? Math.max(0, Math.round(100 - volatility)) : 50 },
    { label: "Collector Demand", v: 60 },
  ];

  const overallScore = Math.round(scores.reduce((s, x) => s + x.v, 0) / scores.length);

  // Thesis generation
  const thesisSignals: string[] = [];
  if (gradingUpside != null && gradingUpside > 3) thesisSignals.push(`${gradingUpside.toFixed(1)}x grading spread`);
  if (roi != null && roi > 20) thesisSignals.push(`${roi.toFixed(0)}% ROI over selected period`);
  if (card.rarity && ["Rare Holo", "Rare Secret", "Illustration Rare"].includes(card.rarity)) thesisSignals.push(`${card.rarity} collectibility`);
  const thesis = thesisSignals.length > 0
    ? `Strong investment candidate based on ${thesisSignals.join(", ")}.`
    : "Monitor for emerging catalysts. Check grading spread and recent sales volume.";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <button onClick={() => router.push("/cards")} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 13, padding: 0, alignSelf: "flex-start" }}>
        ← Back to Cards
      </button>

      {/* Hero header — 3 column */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 280px", gap: 28, alignItems: "flex-start" }}>
        <CardArt cardId={card.id} name={card.name} imageUrl={card.imageSmall ?? card.imageLarge} w={200} h={280} />

        <div>
          <div style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>{card.set.name} · {card.rarity ?? "—"} · #{card.cardNumber ?? "—"}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: "var(--display-weight)" as unknown as number, color: "var(--text)", margin: "0 0 12px", letterSpacing: "-0.5px", lineHeight: 1.05 }}>{card.name}</h1>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
            {card.supertype && <Pill label={card.supertype} />}
            {allVariantEntries.length > 1 && allVariantEntries.map(([vKey]) => (
              <button key={vKey} onClick={() => setSelectedVariant(vKey)} style={{
                padding: "4px 10px", borderRadius: "var(--radius)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                border: activeVariantKey === vKey ? "1px solid var(--accent)" : "1px solid var(--border)",
                background: activeVariantKey === vKey ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "var(--bg-panel-2)",
                color: activeVariantKey === vKey ? "var(--accent)" : "var(--text-3)",
              }}>{vKey}</button>
            ))}
          </div>
          {/* Thesis card */}
          <div style={{
            padding: 16, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
            borderLeft: "3px solid var(--accent)",
          }}>
            <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>PokeInvest Thesis</div>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text)", margin: 0, lineHeight: 1.5 }}>&ldquo;{thesis}&rdquo;</p>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <BuyScoreRing score={overallScore} size={110} />
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: priceIsSuspicious ? "var(--accent)" : "var(--text)", fontFamily: "var(--font-mono)", lineHeight: 1 }}>
            {marketPrice != null ? formatCents(marketPrice) : "No price"}
          </div>
          {priceIsSuspicious && ebayRawPrice != null && (
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
              eBay: <span style={{ color: "var(--text)", fontWeight: 600 }}>{formatCents(ebayRawPrice)}</span>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 12 }}>
            <span style={{ color: clr(rangeReturn) }}>{range} {rangeReturn >= 0 ? "+" : ""}{rangeReturn.toFixed(2)}%</span>
          </div>
          {card.tcgplayerUrl && (
            <a href={card.tcgplayerUrl} target="_blank" rel="noopener noreferrer" style={{
              marginTop: 18, padding: "12px 22px", borderRadius: "var(--radius)", border: "1px solid var(--accent)",
              background: "var(--accent)", color: "var(--bg-page)", fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%",
              display: "inline-block", textDecoration: "none", textAlign: "center",
            }}>Buy on TCGPlayer →</a>
          )}
        </div>
      </div>

      {/* Stale price warning */}
      {priceIsSuspicious && ebayRawPrice != null && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius: "var(--radius)", fontSize: 13, color: "var(--text-2)" }}>
          <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 15 }}>⚠</span>
          <span>
            TCGPlayer price <strong style={{ color: "var(--text)" }}>{formatCents(marketPrice)}</strong> is significantly higher than recent eBay sales <strong style={{ color: "var(--text)" }}>{formatCents(ebayRawPrice)}</strong>. The TCGPlayer listing may be stale.
          </span>
        </div>
      )}

      {/* Price chart */}
      <Panel title="Price History" action={
        <div style={{ display: "flex", gap: 4 }}>
          {[{ l: "3M", v: "3M" as const }, { l: "6M", v: "6M" as const }, { l: "1Y", v: "1Y" as const }, { l: "ALL", v: "ALL" as const }].map((r) => (
            <button key={r.l} onClick={() => setRange(r.v)} style={{
              padding: "4px 10px", borderRadius: "var(--radius)", border: range === r.v ? "1px solid var(--accent)" : "1px solid var(--border)",
              background: range === r.v ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
              color: range === r.v ? "var(--accent)" : "var(--text-3)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-mono)",
            }}>{r.l}</button>
          ))}
        </div>
      }>
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: clr(rangeReturn) }}>{rangeReturn >= 0 ? "+" : ""}{rangeReturn.toFixed(2)}% this period</span>
        </div>
        {chartData.length < 2 ? (
          <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: 13 }}>
            Only {chartData.length === 1 ? "1 data point" : "no data"} for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={priceColor} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={priceColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: "var(--text-3)", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="price" tick={{ fill: "var(--text-3)", fontSize: 10 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
              <YAxis yAxisId="vol" orientation="right" tick={{ fill: "var(--text-3)", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar yAxisId="vol" dataKey="volume" fill="var(--border)" radius={[2, 2, 0, 0]} name="Volume" isAnimationActive={false} />
              <Area yAxisId="price" type="monotone" dataKey="price" stroke={priceColor} fill="url(#cardGrad)" strokeWidth={2} dot={false} name="Price $" isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* Metrics + Investment Score */}
      <div className="grid-2col">
        <Panel title="Investment Metrics">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { l: "Total ROI", v: roi != null ? `${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%` : "—", c: clr(roi) },
              { l: "CAGR", v: cagr != null ? `${cagr >= 0 ? "+" : ""}${cagr.toFixed(1)}%` : "—", c: clr(cagr) },
              { l: "Volatility", v: volatility != null ? `${volatility.toFixed(1)}%` : "—" },
              { l: "Liquidity", v: volume != null ? `${Math.min(100, Math.round((volume / 500) * 100))}/100` : "—", s: volume != null ? `${volume} sales/mo` : undefined },
              { l: "PSA 10 / Raw", v: gradingUpside != null ? `${formatNum(gradingUpside, 1)}x` : "—", c: "var(--accent)", s: psaSpread != null ? `${formatCents(psaSpread)} spread` : undefined },
              { l: "PSA 10 Price", v: formatCents(psa10Price) },
            ].map((m) => (
              <div key={m.l} style={{ padding: 12, background: "var(--bg-panel-2)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>{m.l}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: m.c || "var(--text)", fontFamily: "var(--font-mono)" }}>{m.v}</div>
                {m.s && <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{m.s}</div>}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Investment Score Breakdown">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {scores.map((s) => (
              <div key={s.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                  <span style={{ color: "var(--text-2)" }}>{s.label}</span>
                  <span style={{ color: "var(--text)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{Math.round(s.v)}/100</span>
                </div>
                <div style={{ height: 8, background: "var(--bg-panel-2)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${s.v}%`, height: "100%", background: s.v >= 70 ? "var(--pos)" : s.v >= 40 ? "var(--accent)" : "var(--neg)", borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Price breakdown */}
      <Panel title="Price Breakdown">
        {[
          { l: "Raw / NM", v: marketPrice },
          { l: "PSA 10", v: psa10Price },
          { l: "PSA 10 Spread", v: psaSpread, c: "var(--accent)" },
          { l: "Volume (monthly)", v: volume, raw: true },
        ].map((r, i) => (
          <div key={r.l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 3 ? "1px solid var(--border)" : "none" }}>
            <span style={{ color: "var(--text-2)", fontSize: 13 }}>{r.l}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: r.c || "var(--text)", fontSize: 14 }}>
              {r.raw ? (r.v != null ? String(r.v) : "—") : formatCents(r.v as number | null)}
            </span>
          </div>
        ))}
        {gradingUpside != null && rawPrice != null && (
          <div style={{ marginTop: 12, padding: 12, background: "color-mix(in srgb, var(--accent) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius: "var(--radius)", fontSize: 12, color: "var(--text-2)", lineHeight: 1.4 }}>
            <strong style={{ color: "var(--accent)" }}>Grading math:</strong> Buy raw at {formatCents(rawPrice)}, grade for ~$25. PSA 10 sells for {formatCents(psa10Price)} ({gradingUpside.toFixed(1)}x).
          </div>
        )}
      </Panel>
    </div>
  );
}
