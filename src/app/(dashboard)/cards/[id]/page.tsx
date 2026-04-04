"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, TrendingUp, BarChart3, Activity, Zap, Award, Shield, ImageOff } from "lucide-react";
import { trpc as api } from "@/lib/trpc/client";
import { MetricCard } from "@/components/ui/MetricCard";
import { SignalBadge } from "@/components/ui/SignalBadge";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatCents, formatNum, clr } from "@/lib/utils/formatting";
import {
  ComposedChart,
  Area,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

const RANGES = { "3M": 90, "6M": 180, "1Y": 365, ALL: 9999 };

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
      <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
        <div className="skeleton" style={{ width: 80, height: 112, borderRadius: 6, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 32, width: "50%", borderRadius: 4, marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 14, width: "35%", borderRadius: 4, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 20, width: 80, borderRadius: 4 }} />
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="skeleton" style={{ height: 36, width: 120, borderRadius: 4, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 14, width: 80, borderRadius: 4, marginLeft: "auto" }} />
        </div>
      </div>
      <div className="grid-4col" style={{ marginBottom: 20 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 88, borderRadius: 8 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 340, borderRadius: 8, marginBottom: 20 }} />
      <div className="grid-2col">
        <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
      </div>
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
        <button
          onClick={() => router.push("/cards")}
          style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 16 }}
        >
          ← Back to Cards
        </button>
        <ErrorState message="Failed to load card" onRetry={() => void refetch()} />
      </div>
    );
  }

  if (!card) {
    return (
      <div>
        <button
          onClick={() => router.push("/cards")}
          style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 16 }}
        >
          ← Back to Cards
        </button>
        <div style={{ color: "#ef4444", fontSize: 14, padding: "40px 0" }}>Card not found.</div>
      </div>
    );
  }

  // All variants, sorted so ones with price data come first
  const allVariantEntries = Object.entries(card.latestByVariant).sort(
    ([, a], [, b]) => (b.marketPrice ?? 0) - (a.marketPrice ?? 0)
  );
  const activeVariantKey = selectedVariant ?? allVariantEntries[0]?.[0] ?? null;
  const activeVariantData = activeVariantKey ? card.latestByVariant[activeVariantKey] : null;

  // Build chart data filtered to the selected variant
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
  const priceColor = rangeReturn >= 0 ? "#22c55e" : "#ef4444";

  // ROI = total % return over the selected range
  const roi = chartData.length >= 2 && startPrice > 0 ? rangeReturn : null;

  // CAGR = annualised return over the selected range
  const rangeDays = RANGES[range] === 9999 ? chartData.length * 7 : RANGES[range];
  const rangeYears = rangeDays / 365;
  const cagr =
    roi != null && rangeYears > 0 && startPrice > 0
      ? (Math.pow(endPrice / startPrice, 1 / rangeYears) - 1) * 100
      : null;

  // Volatility = annualised std-dev of period-over-period returns
  const periodReturns = chartData.slice(1).map((d, i) => {
    const prev = chartData[i].price;
    return prev > 0 ? (d.price - prev) / prev : 0;
  });
  const avgR = periodReturns.length > 0
    ? periodReturns.reduce((s, r) => s + r, 0) / periodReturns.length
    : 0;
  const variance = periodReturns.length > 1
    ? periodReturns.reduce((s, r) => s + (r - avgR) ** 2, 0) / periodReturns.length
    : 0;
  // Assume weekly data points → multiply by √52 to annualise
  const volatility = periodReturns.length >= 4 ? Math.sqrt(variance * 52) * 100 : null;

  const marketPrice = activeVariantData?.marketPrice ?? null;
  const rawPrice = activeVariantData?.rawPrice ?? marketPrice;
  const volume = activeVariantData?.volume ?? null;

  // Sanity-check PSA10: graded cards should be worth MORE than raw.
  // If eBay returned a PSA10 price below the raw/market price, the data is bad — hide it.
  const psa10PriceRaw = activeVariantData?.psa10Price ?? null;
  const referencePrice = rawPrice ?? marketPrice;
  const psa10Price =
    psa10PriceRaw != null && referencePrice != null && psa10PriceRaw > referencePrice
      ? psa10PriceRaw
      : null;

  const gradingUpside =
    psa10Price != null && rawPrice != null && rawPrice > 0
      ? psa10Price / rawPrice
      : null;

  const psaSpread =
    psa10Price != null && marketPrice != null ? psa10Price - marketPrice : null;

  // Investment score bars
  const scoreData = [
    { metric: "Liquidity", score: volume != null ? Math.min(100, Math.round((volume / 500) * 100)) : 0 },
    { metric: "Grading", score: gradingUpside != null ? Math.min(100, Math.round(gradingUpside * 10)) : 0 },
    { metric: "Stability", score: volatility != null ? Math.max(0, Math.round(100 - volatility)) : 50 },
    { metric: "Momentum", score: rangeReturn > 0 ? Math.min(100, Math.round(50 + rangeReturn)) : Math.max(0, Math.round(50 + rangeReturn)) },
  ];

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => router.push("/cards")}
        style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 16, display: "flex", alignItems: "center", gap: 4 }}
      >
        ← Back to Cards
      </button>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          {card.imageSmall ? (
            <Image
              src={card.imageSmall}
              alt={card.name}
              width={80}
              height={112}
              style={{ borderRadius: 6, border: "1px solid #1e293b", objectFit: "contain", flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: 80,
                height: 112,
                background: "#0c1222",
                border: "1px solid #1e293b",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ImageOff size={20} color="#334155" />
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9", margin: 0, wordBreak: "break-word" }}>{card.name}</h1>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
              <span style={{ color: "#94a3b8", fontSize: 13 }}>
                {card.set.name} · {card.cardNumber ?? "—"} · {card.rarity ?? "—"}
              </span>
            </div>
            {allVariantEntries.length > 1 && (
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {allVariantEntries.map(([vKey, vData]) => (
                  <button
                    key={vKey}
                    onClick={() => setSelectedVariant(vKey)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 4,
                      border: activeVariantKey === vKey ? "1px solid #fbbf24" : "1px solid #1e293b",
                      background: activeVariantKey === vKey ? "#fbbf2418" : "#1e293b",
                      color: activeVariantKey === vKey ? "#fbbf24" : vData.marketPrice != null ? "#94a3b8" : "#475569",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {vKey}
                    {vData.marketPrice != null && (
                      <span style={{ marginLeft: 6, fontFamily: "'JetBrains Mono', monospace", color: activeVariantKey === vKey ? "#fbbf24" : "#64748b" }}>
                        ${(vData.marketPrice / 100).toFixed(0)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {card.supertype && <SignalBadge signal={card.supertype} />}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: marketPrice != null ? "#e2e8f0" : "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
            {marketPrice != null ? formatCents(marketPrice) : "No price data"}
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 4 }}>
            <span style={{ color: clr(rangeReturn), fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>
              {range} {rangeReturn >= 0 ? "+" : ""}{rangeReturn.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Metric grid */}
      <div className="grid-4col" style={{ marginBottom: 20 }}>
        <MetricCard
          label={`ROI (${range})`}
          value={roi != null ? `${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%` : "—"}
          sub={roi != null ? (roi >= 0 ? "Positive return" : "Negative return") : "Need history"}
          color={roi != null ? clr(roi) : undefined}
          icon={TrendingUp}
        />
        <MetricCard
          label="CAGR"
          value={cagr != null ? `${cagr >= 0 ? "+" : ""}${cagr.toFixed(1)}%` : "—"}
          sub={cagr != null ? "Annualised" : "Need history"}
          color={cagr != null ? clr(cagr) : undefined}
          icon={BarChart3}
        />
        <MetricCard
          label="Volatility"
          value={volatility != null ? `${volatility.toFixed(1)}%` : "—"}
          sub={volatility != null ? "Annualised" : undefined}
          icon={Activity}
        />
        <MetricCard
          label="Liquidity"
          value={volume != null ? `${Math.min(100, Math.round((volume / 500) * 100))}%` : "—"}
          sub={volume != null ? `${volume} sales/mo` : undefined}
          icon={Zap}
        />
        <MetricCard
          label="Grading Upside"
          value={gradingUpside != null ? `${formatNum(gradingUpside, 1)}x` : "—"}
          color="#a78bfa"
          icon={Award}
        />
        <MetricCard
          label="PSA 10 Spread"
          value={formatCents(psaSpread)}
          sub={psa10Price != null ? `PSA10: ${formatCents(psa10Price)}` : undefined}
          icon={Shield}
        />
      </div>

      {/* Price history chart */}
      <div style={{ ...PANEL, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div>
            <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>Price History</span>
            <span style={{ fontSize: 13, color: clr(rangeReturn), fontFamily: "'JetBrains Mono', monospace", marginLeft: 12 }}>
              {rangeReturn >= 0 ? "+" : ""}{rangeReturn.toFixed(2)}%
            </span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {(Object.keys(RANGES) as Array<keyof typeof RANGES>).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 4,
                  border: range === r ? "1px solid #fbbf24" : "1px solid #1e293b",
                  background: range === r ? "#fbbf2418" : "transparent",
                  color: range === r ? "#fbbf24" : "#64748b",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {chartData.length < 2 ? (
          <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontSize: 13 }}>
            Only {chartData.length === 1 ? "1 data point" : "no data"} for this period.
            Run <code style={{ background: "#1e293b", padding: "1px 6px", borderRadius: 3, margin: "0 4px" }}>npx tsx prisma/seed-history.ts</code> to generate history.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={priceColor} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={priceColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="price" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
              <YAxis yAxisId="vol" orientation="right" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar yAxisId="vol" dataKey="volume" fill="#334155" radius={[2, 2, 0, 0]} name="Volume" isAnimationActive={false} />
              <Area yAxisId="price" type="monotone" dataKey="price" stroke={priceColor} fill="url(#cardGrad)" strokeWidth={2} dot={false} name="Price $" isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Price breakdown + investment score */}
      <div className="grid-2col" style={{ marginBottom: 20 }}>
        <div style={PANEL}>
          <h3 style={SECTION_LABEL}>Price Breakdown</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {[
              { label: "Market / Raw", value: marketPrice },
              { label: "PSA 10", value: psa10Price },
              { label: "PSA 10 Spread", value: psaSpread },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e293b44" }}>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>{label}</span>
                <span style={{ color: "#e2e8f0", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                  {value != null ? formatCents(value) : <span style={{ color: "#475569" }}>No data</span>}
                </span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
              <span style={{ color: "#94a3b8", fontSize: 13 }}>Volume (monthly)</span>
              <span style={{ color: "#e2e8f0", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                {volume != null ? volume : "—"}
              </span>
            </div>
          </div>
        </div>

        <div style={PANEL}>
          <h3 style={SECTION_LABEL}>Investment Score</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={scoreData} layout="vertical">
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis dataKey="metric" type="category" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
              <Bar dataKey="score" fill="#fbbf24" radius={[0, 3, 3, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => router.push("/portfolio")}
          style={{
            padding: "10px 24px",
            borderRadius: 6,
            border: "1px solid #fbbf24",
            background: "#fbbf2418",
            color: "#fbbf24",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Plus size={14} /> Add to Portfolio
        </button>
        {card.tcgplayerUrl && (
          <a
            href={card.tcgplayerUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "10px 24px",
              borderRadius: 6,
              border: "1px solid #1e293b",
              background: "transparent",
              color: "#94a3b8",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Buy on TCGPlayer ↗
          </a>
        )}
      </div>
    </div>
  );
}
