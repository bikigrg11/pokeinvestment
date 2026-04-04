import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, Search, Star, Plus, Minus, BarChart3, PieChart as PieIcon, Activity, Layers, Briefcase, Home, Filter, ArrowUpRight, ArrowDownRight, ChevronRight, ChevronDown, X, Eye, Zap, Shield, Award, DollarSign, Package, AlertTriangle, Clock, Grid3X3, BookOpen } from "lucide-react";

// ─── SEED DATA ────────────────────────────────────────────────────────────────

const ERAS = ["Base Era", "Neo Era", "e-Series", "EX Era", "Diamond & Pearl", "HeartGold SoulSilver", "Black & White", "XY", "Sun & Moon", "Sword & Shield", "Scarlet & Violet"];

const SETS_DATA = [
  { id: 1, name: "Base Set", release_date: "1999-01-09", era: "Base Era", avg_value: 482, roi: 8540, cards_count: 102 },
  { id: 2, name: "Jungle", release_date: "1999-06-16", era: "Base Era", avg_value: 124, roi: 2380, cards_count: 64 },
  { id: 3, name: "Fossil", release_date: "1999-10-10", era: "Base Era", avg_value: 98, roi: 1860, cards_count: 62 },
  { id: 4, name: "Team Rocket", release_date: "2000-04-24", era: "Base Era", avg_value: 112, roi: 2140, cards_count: 83 },
  { id: 5, name: "Neo Genesis", release_date: "2000-12-16", era: "Neo Era", avg_value: 156, roi: 2920, cards_count: 111 },
  { id: 6, name: "Neo Discovery", release_date: "2001-06-01", era: "Neo Era", avg_value: 89, roi: 1680, cards_count: 75 },
  { id: 7, name: "Neo Revelation", release_date: "2001-09-21", era: "Neo Era", avg_value: 134, roi: 2540, cards_count: 66 },
  { id: 8, name: "Neo Destiny", release_date: "2002-02-28", era: "Neo Era", avg_value: 198, roi: 3720, cards_count: 113 },
  { id: 9, name: "Legendary Collection", release_date: "2002-05-24", era: "e-Series", avg_value: 267, roi: 4890, cards_count: 110 },
  { id: 10, name: "Expedition", release_date: "2002-09-15", era: "e-Series", avg_value: 78, roi: 1420, cards_count: 165 },
  { id: 11, name: "Aquapolis", release_date: "2003-01-15", era: "e-Series", avg_value: 142, roi: 2680, cards_count: 182 },
  { id: 12, name: "Skyridge", release_date: "2003-05-12", era: "e-Series", avg_value: 312, roi: 5840, cards_count: 182 },
  { id: 13, name: "EX Ruby & Sapphire", release_date: "2003-07-18", era: "EX Era", avg_value: 45, roi: 780, cards_count: 109 },
  { id: 14, name: "EX Dragon", release_date: "2003-11-24", era: "EX Era", avg_value: 52, roi: 920, cards_count: 100 },
  { id: 15, name: "EX FireRed & LeafGreen", release_date: "2004-09-20", era: "EX Era", avg_value: 68, roi: 1240, cards_count: 116 },
  { id: 16, name: "Gold Star Series", release_date: "2004-11-08", era: "EX Era", avg_value: 890, roi: 12400, cards_count: 27 },
  { id: 17, name: "Diamond & Pearl", release_date: "2007-05-23", era: "Diamond & Pearl", avg_value: 32, roi: 420, cards_count: 130 },
  { id: 18, name: "HeartGold SoulSilver", release_date: "2010-02-10", era: "HeartGold SoulSilver", avg_value: 48, roi: 680, cards_count: 124 },
  { id: 19, name: "Black & White", release_date: "2011-04-25", era: "Black & White", avg_value: 28, roi: 340, cards_count: 114 },
  { id: 20, name: "XY Evolutions", release_date: "2016-11-02", era: "XY", avg_value: 86, roi: 1520, cards_count: 113 },
  { id: 21, name: "Sun & Moon Base", release_date: "2017-02-03", era: "Sun & Moon", avg_value: 22, roi: 180, cards_count: 149 },
  { id: 22, name: "Hidden Fates", release_date: "2019-08-23", era: "Sun & Moon", avg_value: 64, roi: 920, cards_count: 163 },
  { id: 23, name: "Champion's Path", release_date: "2020-09-25", era: "Sword & Shield", avg_value: 18, roi: 120, cards_count: 80 },
  { id: 24, name: "Evolving Skies", release_date: "2021-08-27", era: "Sword & Shield", avg_value: 42, roi: 340, cards_count: 237 },
  { id: 25, name: "Crown Zenith", release_date: "2023-01-20", era: "Sword & Shield", avg_value: 14, roi: 45, cards_count: 230 },
  { id: 26, name: "Obsidian Flames", release_date: "2023-08-11", era: "Scarlet & Violet", avg_value: 8, roi: 12, cards_count: 230 },
  { id: 27, name: "151", release_date: "2023-09-22", era: "Scarlet & Violet", avg_value: 24, roi: 68, cards_count: 207 },
  { id: 28, name: "Paldea Evolved", release_date: "2023-06-09", era: "Scarlet & Violet", avg_value: 6, roi: -8, cards_count: 279 },
  { id: 29, name: "Surging Sparks", release_date: "2024-11-08", era: "Scarlet & Violet", avg_value: 12, roi: 22, cards_count: 252 },
  { id: 30, name: "Prismatic Evolutions", release_date: "2025-01-17", era: "Scarlet & Violet", avg_value: 18, roi: 35, cards_count: 186 },
];

const POKEMON_NAMES = ["Charizard", "Pikachu", "Mewtwo", "Lugia", "Blastoise", "Venusaur", "Gengar", "Dragonite", "Mew", "Umbreon", "Espeon", "Rayquaza", "Ho-Oh", "Typhlosion", "Feraligatr", "Alakazam", "Arcanine", "Gyarados", "Snorlax", "Eevee", "Jolteon", "Flareon", "Vaporeon", "Lapras", "Articuno", "Zapdos", "Moltres", "Celebi", "Suicune", "Entei", "Raikou", "Tyranitar", "Scizor", "Steelix", "Ampharos", "Machamp", "Nidoking", "Ninetales", "Chansey", "Mr. Mime", "Haunter", "Kadabra", "Magikarp", "Ditto", "Sylveon", "Gardevoir", "Lucario", "Greninja", "Dialga", "Palkia"];

const RARITIES = ["Common", "Uncommon", "Rare", "Rare Holo", "Rare Holo EX", "Ultra Rare", "Secret Rare", "Illustration Rare", "Special Art Rare", "Hyper Rare", "Gold Star"];

const SIGNALS = ["Undervalued", "Momentum", "Grading Candidate", "High Liquidity", "Collector Favorite", "Breakout", "Steady Gainer", "Blue Chip"];
const SIGNAL_COLORS = {
  "Undervalued": "#22d3ee", "Momentum": "#f59e0b", "Grading Candidate": "#a78bfa",
  "High Liquidity": "#34d399", "Collector Favorite": "#f472b6", "Breakout": "#fb923c",
  "Steady Gainer": "#60a5fa", "Blue Chip": "#fbbf24"
};

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function generatePriceHistory(basePrice, months = 36, seed = 1) {
  const rng = seededRandom(seed);
  const data = [];
  let price = basePrice * (0.3 + rng() * 0.4);
  const now = new Date();
  for (let i = months; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const trend = 1 + (rng() - 0.35) * 0.12;
    const noise = 1 + (rng() - 0.5) * 0.08;
    price = Math.max(price * trend * noise, 0.5);
    data.push({
      date: d.toISOString().slice(0, 7),
      price: Math.round(price * 100) / 100,
      volume: Math.floor(rng() * 500 + 50),
    });
  }
  return data;
}

function generateCards(count = 250) {
  const rng = seededRandom(42);
  const cards = [];
  for (let i = 0; i < count; i++) {
    const set = SETS_DATA[Math.floor(rng() * SETS_DATA.length)];
    const pokemon = POKEMON_NAMES[Math.floor(rng() * POKEMON_NAMES.length)];
    const rarity = RARITIES[Math.floor(rng() * RARITIES.length)];
    const basePrice = rarity.includes("Secret") || rarity.includes("Gold") ? 200 + rng() * 2000
      : rarity.includes("Ultra") || rarity.includes("Special") ? 80 + rng() * 600
      : rarity.includes("Holo") || rarity.includes("Illustration") ? 20 + rng() * 200
      : 1 + rng() * 30;
    const market_price = Math.round(basePrice * 100) / 100;
    const psa10Mult = 2 + rng() * 8;
    const psa9Mult = 1.3 + rng() * 3;
    const psa10_price = Math.round(market_price * psa10Mult * 100) / 100;
    const psa9_price = Math.round(market_price * psa9Mult * 100) / 100;
    const release_price = Math.round(market_price / (1 + rng() * 10) * 100) / 100;
    const roi = Math.round(((market_price - release_price) / release_price) * 10000) / 100;
    const volume = Math.floor(rng() * 800 + 10);
    const change24h = Math.round((rng() - 0.45) * 20 * 100) / 100;
    const change7d = Math.round((rng() - 0.42) * 35 * 100) / 100;
    const change30d = Math.round((rng() - 0.40) * 60 * 100) / 100;
    const volatility = Math.round(rng() * 50 * 100) / 100;
    const liquidity = Math.round((volume / 800) * 100);
    const gradingUpside = Math.round(psa10Mult * 100) / 100;
    const numSignals = 1 + Math.floor(rng() * 3);
    const cardSignals = [];
    for (let s = 0; s < numSignals; s++) {
      const sig = SIGNALS[Math.floor(rng() * SIGNALS.length)];
      if (!cardSignals.includes(sig)) cardSignals.push(sig);
    }
    const priceHistory = generatePriceHistory(market_price, 36, i * 7 + 13);
    const yearDates = Math.max(0, priceHistory.length - 13);
    const yearAgoPrice = priceHistory[yearDates]?.price || release_price;
    const annualizedReturn = Math.round(((market_price / yearAgoPrice) - 1) * 10000) / 100;
    cards.push({
      id: i + 1, name: `${pokemon}`, pokemon, set_name: set.name, set_id: set.id,
      rarity, release_date: set.release_date, card_number: `${Math.floor(rng() * 200) + 1}/${set.cards_count}`,
      market_price, psa10_price, psa9_price, raw_price: market_price, release_price,
      roi, volume, change24h, change7d, change30d, volatility, liquidity, gradingUpside,
      signals: cardSignals, priceHistory, annualizedReturn,
      cagr: Math.round(roi / Math.max(1, (2026 - parseInt(set.release_date.slice(0, 4)))) * 100) / 100,
    });
  }
  return cards;
}

function generateIndexHistory() {
  const data = [];
  let value = 1000;
  const now = new Date();
  const rng = seededRandom(999);
  for (let i = 60; i >= 0; i--) {
    const d = new Date(now); d.setMonth(d.getMonth() - i);
    value *= 1 + (rng() - 0.38) * 0.06;
    data.push({ date: d.toISOString().slice(0, 7), value: Math.round(value * 100) / 100 });
  }
  return data;
}

function generateSealedProducts() {
  const rng = seededRandom(77);
  const types = ["Booster Box", "ETB", "Blister Pack", "Collection Box", "Tin", "Premium Box"];
  return SETS_DATA.slice(0, 20).flatMap((set, i) => {
    const n = 1 + Math.floor(rng() * 3);
    return Array.from({ length: n }, (_, j) => {
      const type = types[Math.floor(rng() * types.length)];
      const releasePrice = type === "Booster Box" ? 90 + rng() * 60 : type === "ETB" ? 35 + rng() * 15 : 15 + rng() * 25;
      const mult = 1 + rng() * (set.roi / 500);
      const currentPrice = Math.round(releasePrice * mult * 100) / 100;
      return {
        id: i * 3 + j + 1, name: `${set.name} ${type}`, set_id: set.id, set_name: set.name,
        type, release_price: Math.round(releasePrice * 100) / 100, price: currentPrice,
        roi: Math.round(((currentPrice - releasePrice) / releasePrice) * 10000) / 100,
        release_date: set.release_date,
      };
    });
  });
}

const ALL_CARDS = generateCards(250);
const INDEX_HISTORY = generateIndexHistory();
const SEALED_PRODUCTS = generateSealedProducts();

const PORTFOLIO_KEY = "pokeinvest-portfolio";

// ─── UTILITY ──────────────────────────────────────────────────────────────────

const fmt = (n, d = 2) => typeof n === "number" ? n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }) : "—";
const fmtUsd = (n) => typeof n === "number" ? `$${fmt(n)}` : "—";
const fmtPct = (n) => typeof n === "number" ? `${n >= 0 ? "+" : ""}${fmt(n)}%` : "—";
const clr = (n) => n > 0 ? "#22c55e" : n < 0 ? "#ef4444" : "#94a3b8";

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

const SignalBadge = ({ signal }) => (
  <span style={{ background: `${SIGNAL_COLORS[signal] || "#64748b"}22`, color: SIGNAL_COLORS[signal] || "#94a3b8", border: `1px solid ${SIGNAL_COLORS[signal] || "#64748b"}44`, padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", whiteSpace: "nowrap" }}>{signal}</span>
);

const Metric = ({ label, value, sub, color, icon: Icon }) => (
  <div style={{ padding: "16px 20px", background: "#0c1222", border: "1px solid #1e293b", borderRadius: "8px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
      {Icon && <Icon size={13} color="#64748b" />}
      <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>{label}</span>
    </div>
    <div style={{ fontSize: 22, fontWeight: 700, color: color || "#e2e8f0", fontFamily: "'JetBrains Mono', 'SF Mono', monospace" }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: color || "#64748b", marginTop: 4, fontWeight: 500 }}>{sub}</div>}
  </div>
);

const MiniChart = ({ data, dataKey = "price", color = "#22c55e", h = 40, w = 120 }) => (
  <ResponsiveContainer width={w} height={h}>
    <AreaChart data={data.slice(-12)}>
      <defs><linearGradient id={`mc-${color}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.3} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
      <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#mc-${color})`} strokeWidth={1.5} dot={false} />
    </AreaChart>
  </ResponsiveContainer>
);

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: "#94a3b8", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600, fontFamily: "monospace" }}>{p.name}: {typeof p.value === "number" ? (p.name?.includes("$") || p.dataKey === "price" || p.dataKey === "value" ? fmtUsd(p.value) : fmt(p.value)) : p.value}</div>
      ))}
    </div>
  );
};

const SortableTable = ({ columns, data, onRowClick, maxH = 600, stickyHeader = true }) => {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("desc");
  const sorted = useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [data, sortCol, sortDir]);
  const toggleSort = (col) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("desc"); } };
  return (
    <div style={{ overflowY: "auto", maxHeight: maxH, borderRadius: 8, border: "1px solid #1e293b" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead style={stickyHeader ? { position: "sticky", top: 0, zIndex: 2 } : {}}>
          <tr>{columns.map(c => (
            <th key={c.key} onClick={() => c.sortable !== false && toggleSort(c.key)}
              style={{ padding: "10px 14px", background: "#0c1222", borderBottom: "2px solid #1e293b", color: "#64748b", textAlign: c.align || "left", cursor: c.sortable !== false ? "pointer" : "default", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.8px", userSelect: "none", whiteSpace: "nowrap" }}>
              {c.label} {sortCol === c.key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
            </th>
          ))}</tr>
        </thead>
        <tbody>{sorted.map((row, ri) => (
          <tr key={ri} onClick={() => onRowClick?.(row)} style={{ cursor: onRowClick ? "pointer" : "default", borderBottom: "1px solid #1e293b0a" }}
            onMouseOver={e => e.currentTarget.style.background = "#1e293b44"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
            {columns.map(c => (
              <td key={c.key} style={{ padding: "10px 14px", color: c.color?.(row) || "#cbd5e1", textAlign: c.align || "left", fontFamily: c.mono ? "'JetBrains Mono', monospace" : "inherit", fontWeight: c.bold ? 600 : 400, fontSize: 13, whiteSpace: "nowrap" }}>
                {c.render ? c.render(row) : row[c.key]}
              </td>
            ))}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
};

// ─── PAGES ────────────────────────────────────────────────────────────────────

const HomePage = ({ navigate, cards }) => {
  const topROI = useMemo(() => [...cards].sort((a, b) => b.roi - a.roi).slice(0, 5), [cards]);
  const topMovers = useMemo(() => [...cards].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h)).slice(0, 5), [cards]);
  const topLiquid = useMemo(() => [...cards].sort((a, b) => b.volume - a.volume).slice(0, 5), [cards]);
  const topGrading = useMemo(() => [...cards].sort((a, b) => b.gradingUpside - a.gradingUpside).slice(0, 5), [cards]);
  const indexData = INDEX_HISTORY;
  const currentIndex = indexData[indexData.length - 1]?.value || 0;
  const prevIndex = indexData[indexData.length - 2]?.value || 0;
  const indexChange = ((currentIndex - prevIndex) / prevIndex) * 100;
  const totalMarketCap = cards.reduce((s, c) => s + c.market_price * c.volume, 0);
  const avgROI = cards.reduce((s, c) => s + c.roi, 0) / cards.length;

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9", margin: 0, letterSpacing: "-0.5px" }}>Pokémon Investment Dashboard</h1>
        <p style={{ color: "#64748b", fontSize: 14, margin: "6px 0 0" }}>Real-time analytics for Pokémon card investments</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 28 }}>
        <Metric label="Pokémon 250 Index" value={fmt(currentIndex, 0)} sub={fmtPct(Math.round(indexChange * 100) / 100)} color={clr(indexChange)} icon={Activity} />
        <Metric label="Total Market Cap" value={`$${(totalMarketCap / 1e6).toFixed(1)}M`} sub="250 tracked cards" icon={DollarSign} />
        <Metric label="Avg ROI" value={fmtPct(Math.round(avgROI))} color={clr(avgROI)} icon={TrendingUp} />
        <Metric label="Cards Tracked" value="250" sub="across 30 sets" icon={Layers} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
        <div style={{ background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>Pokémon 250 Index</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={indexData}>
              <defs><linearGradient id="idxGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fbbf24" stopOpacity={0.25} /><stop offset="100%" stopColor="#fbbf24" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} interval={11} />
              <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#fbbf24" fill="url(#idxGrad)" strokeWidth={2} dot={false} name="Index $" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>Top ROI by Era</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ERAS.map(era => ({ era: era.slice(0, 12), roi: SETS_DATA.filter(s => s.era === era).reduce((a, s) => a + s.roi, 0) / Math.max(1, SETS_DATA.filter(s => s.era === era).length) }))}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="era" tick={{ fill: "#475569", fontSize: 9 }} tickLine={false} axisLine={false} angle={-25} textAnchor="end" height={50} />
              <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="roi" fill="#fbbf24" radius={[3, 3, 0, 0]} name="Avg ROI %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {[
          { title: "Highest ROI Cards", data: topROI, valKey: "roi", valFmt: fmtPct, icon: TrendingUp, color: "#22c55e" },
          { title: "Biggest 24h Movers", data: topMovers, valKey: "change24h", valFmt: fmtPct, icon: Zap, color: "#f59e0b" },
          { title: "Most Liquid Cards", data: topLiquid, valKey: "volume", valFmt: (v) => `${v} sales`, icon: Activity, color: "#3b82f6" },
          { title: "Top Grading Upside", data: topGrading, valKey: "gradingUpside", valFmt: (v) => `${fmt(v)}x`, icon: Award, color: "#a78bfa" },
        ].map(({ title, data: d, valKey, valFmt: vf, icon: Ico, color: c }) => (
          <div key={title} style={{ background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Ico size={14} color={c} />
              <h3 style={{ fontSize: 12, color: "#94a3b8", margin: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>{title}</h3>
            </div>
            {d.map((card, i) => (
              <div key={card.id} onClick={() => navigate("card", card.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 4px", cursor: "pointer", borderBottom: i < d.length - 1 ? "1px solid #1e293b44" : "none" }}
                onMouseOver={e => e.currentTarget.style.background = "#1e293b33"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#475569", fontSize: 11, fontWeight: 600, width: 18 }}>#{i + 1}</span>
                  <div>
                    <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{card.name}</div>
                    <div style={{ color: "#64748b", fontSize: 11 }}>{card.set_name} · {card.rarity}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600, color: clr(card[valKey]) }}>{vf(card[valKey])}</div>
                  <div style={{ color: "#64748b", fontSize: 11, fontFamily: "monospace" }}>{fmtUsd(card.market_price)}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const MarketPage = ({ navigate, cards }) => {
  const [tab, setTab] = useState("trending");
  const indexData = INDEX_HISTORY;
  const currentVal = indexData[indexData.length - 1]?.value;
  const startVal = indexData[0]?.value;
  const totalReturn = ((currentVal - startVal) / startVal) * 100;

  const tabs = {
    trending: { label: "Trending", data: [...cards].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h)).slice(0, 100) },
    roi: { label: "Highest ROI", data: [...cards].sort((a, b) => b.roi - a.roi).slice(0, 100) },
    liquid: { label: "Most Liquid", data: [...cards].sort((a, b) => b.volume - a.volume).slice(0, 100) },
    grading: { label: "Grading Upside", data: [...cards].sort((a, b) => b.gradingUpside - a.gradingUpside).slice(0, 100) },
  };

  const columns = [
    { key: "rank", label: "#", sortable: false, render: (_, i) => <span style={{ color: "#475569" }}>{tabs[tab].data.indexOf(_) + 1}</span> },
    { key: "name", label: "Card", bold: true, render: (r) => <div><div style={{ fontWeight: 600, color: "#e2e8f0" }}>{r.name}</div><div style={{ fontSize: 11, color: "#64748b" }}>{r.set_name}</div></div> },
    { key: "rarity", label: "Rarity" },
    { key: "market_price", label: "Price", mono: true, align: "right", render: (r) => fmtUsd(r.market_price) },
    { key: "change24h", label: "24h", mono: true, align: "right", color: (r) => clr(r.change24h), render: (r) => fmtPct(r.change24h) },
    { key: "change7d", label: "7d", mono: true, align: "right", color: (r) => clr(r.change7d), render: (r) => fmtPct(r.change7d) },
    { key: "roi", label: "ROI", mono: true, align: "right", color: (r) => clr(r.roi), render: (r) => fmtPct(r.roi) },
    { key: "volume", label: "Volume", mono: true, align: "right" },
    { key: "gradingUpside", label: "PSA10/Raw", mono: true, align: "right", render: (r) => `${fmt(r.gradingUpside)}x` },
    { key: "signals", label: "Signals", sortable: false, render: (r) => <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{r.signals.slice(0, 2).map(s => <SignalBadge key={s} signal={s} />)}</div> },
    { key: "chart", label: "", sortable: false, render: (r) => <MiniChart data={r.priceHistory} color={r.change30d >= 0 ? "#22c55e" : "#ef4444"} /> },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Market Overview</h1>
        <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>Pokémon 250 Index · Top {tabs[tab].data.length} Cards</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 }}>
        <div style={{ background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 22, fontWeight: 700, color: "#fbbf24", fontFamily: "monospace" }}>{fmt(currentVal, 0)}</span>
              <span style={{ fontSize: 13, color: clr(totalReturn), marginLeft: 10, fontFamily: "monospace" }}>{fmtPct(Math.round(totalReturn))}</span>
            </div>
            <span style={{ fontSize: 11, color: "#64748b" }}>5-Year Performance</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={indexData}>
              <defs><linearGradient id="idxG2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fbbf24" stopOpacity={0.2} /><stop offset="100%" stopColor="#fbbf24" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} interval={11} />
              <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#fbbf24" fill="url(#idxG2)" strokeWidth={2} dot={false} name="Index $" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "grid", gridTemplateRows: "1fr 1fr 1fr", gap: 10 }}>
          <Metric label="Index Value" value={fmt(currentVal, 0)} icon={Activity} />
          <Metric label="Total Return" value={fmtPct(Math.round(totalReturn))} color={clr(totalReturn)} icon={TrendingUp} />
          <Metric label="Cards in Index" value="250" sub="Equal-weight basket" icon={Layers} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {Object.entries(tabs).map(([k, v]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ padding: "7px 16px", borderRadius: 6, border: tab === k ? "1px solid #fbbf24" : "1px solid #1e293b", background: tab === k ? "#fbbf2418" : "transparent", color: tab === k ? "#fbbf24" : "#94a3b8", fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: "0.3px" }}>
            {v.label}
          </button>
        ))}
      </div>

      <SortableTable columns={columns} data={tabs[tab].data} onRowClick={(r) => navigate("card", r.id)} />
    </div>
  );
};

const CardsPage = ({ navigate, cards }) => {
  const [search, setSearch] = useState("");
  const [filterSet, setFilterSet] = useState("");
  const [filterRarity, setFilterRarity] = useState("");
  const [filterSignal, setFilterSignal] = useState("");

  const filtered = useMemo(() => {
    return cards.filter(c => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.set_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterSet && c.set_name !== filterSet) return false;
      if (filterRarity && c.rarity !== filterRarity) return false;
      if (filterSignal && !c.signals.includes(filterSignal)) return false;
      return true;
    });
  }, [cards, search, filterSet, filterRarity, filterSignal]);

  const uniqueSets = [...new Set(cards.map(c => c.set_name))].sort();
  const uniqueRarities = [...new Set(cards.map(c => c.rarity))].sort();

  const selectStyle = { padding: "7px 12px", borderRadius: 6, border: "1px solid #1e293b", background: "#0c1222", color: "#cbd5e1", fontSize: 12, outline: "none" };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: "0 0 20px" }}>Card Database</h1>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search size={14} color="#64748b" style={{ position: "absolute", left: 12, top: 10 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cards or sets..."
            style={{ width: "100%", padding: "8px 12px 8px 34px", borderRadius: 6, border: "1px solid #1e293b", background: "#0c1222", color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
        <select value={filterSet} onChange={e => setFilterSet(e.target.value)} style={selectStyle}>
          <option value="">All Sets</option>{uniqueSets.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterRarity} onChange={e => setFilterRarity(e.target.value)} style={selectStyle}>
          <option value="">All Rarities</option>{uniqueRarities.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filterSignal} onChange={e => setFilterSignal(e.target.value)} style={selectStyle}>
          <option value="">All Signals</option>{SIGNALS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ color: "#64748b", fontSize: 12 }}>{filtered.length} results</span>
      </div>
      <SortableTable columns={[
        { key: "name", label: "Card", bold: true, render: r => <div><span style={{ fontWeight: 600, color: "#e2e8f0" }}>{r.name}</span><span style={{ color: "#64748b", fontSize: 11, marginLeft: 8 }}>{r.card_number}</span></div> },
        { key: "set_name", label: "Set" },
        { key: "rarity", label: "Rarity" },
        { key: "market_price", label: "Raw Price", mono: true, align: "right", render: r => fmtUsd(r.market_price) },
        { key: "psa10_price", label: "PSA 10", mono: true, align: "right", render: r => fmtUsd(r.psa10_price) },
        { key: "change24h", label: "24h", mono: true, align: "right", color: r => clr(r.change24h), render: r => fmtPct(r.change24h) },
        { key: "roi", label: "ROI", mono: true, align: "right", color: r => clr(r.roi), render: r => fmtPct(r.roi) },
        { key: "volume", label: "Vol", mono: true, align: "right" },
        { key: "liquidity", label: "Liq", mono: true, align: "right", render: r => `${r.liquidity}%` },
        { key: "signals", label: "Signals", sortable: false, render: r => <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{r.signals.map(s => <SignalBadge key={s} signal={s} />)}</div> },
      ]} data={filtered} onRowClick={r => navigate("card", r.id)} />
    </div>
  );
};

const CardDetailPage = ({ cardId, cards, navigate, portfolio, setPortfolio }) => {
  const card = cards.find(c => c.id === cardId);
  const [chartRange, setChartRange] = useState("1Y");
  if (!card) return <div style={{ color: "#94a3b8", padding: 40 }}>Card not found.</div>;

  const ranges = { "3M": 3, "6M": 6, "1Y": 12, "2Y": 24, "ALL": 999 };
  const chartData = card.priceHistory.slice(-(ranges[chartRange] || 999));
  const startPrice = chartData[0]?.price || 0;
  const endPrice = chartData[chartData.length - 1]?.price || 0;
  const rangeReturn = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;

  const inPortfolio = portfolio.find(p => p.card_id === card.id);
  const addToPortfolio = () => {
    const qty = parseInt(prompt("Quantity:", "1")) || 1;
    const price = parseFloat(prompt("Purchase price:", card.market_price.toString())) || card.market_price;
    setPortfolio(prev => [...prev, { card_id: card.id, purchase_price: price, quantity: qty, purchase_date: new Date().toISOString().slice(0, 10) }]);
  };

  return (
    <div>
      <button onClick={() => navigate("cards")} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 16, display: "flex", alignItems: "center", gap: 4 }}>
        ← Back to Cards
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>{card.name}</h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
            <span style={{ color: "#94a3b8", fontSize: 13 }}>{card.set_name} · {card.card_number} · {card.rarity}</span>
            {card.signals.map(s => <SignalBadge key={s} signal={s} />)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#e2e8f0", fontFamily: "monospace" }}>{fmtUsd(card.market_price)}</div>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 4 }}>
            <span style={{ color: clr(card.change24h), fontSize: 13, fontFamily: "monospace" }}>24h {fmtPct(card.change24h)}</span>
            <span style={{ color: clr(card.change7d), fontSize: 13, fontFamily: "monospace" }}>7d {fmtPct(card.change7d)}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 20 }}>
        <Metric label="ROI" value={fmtPct(card.roi)} color={clr(card.roi)} icon={TrendingUp} />
        <Metric label="CAGR" value={fmtPct(card.cagr)} color={clr(card.cagr)} icon={BarChart3} />
        <Metric label="Volatility" value={`${fmt(card.volatility)}%`} icon={Activity} />
        <Metric label="Liquidity" value={`${card.liquidity}%`} sub={`${card.volume} sales/mo`} icon={Zap} />
        <Metric label="Grading Upside" value={`${fmt(card.gradingUpside)}x`} color="#a78bfa" icon={Award} />
        <Metric label="PSA 10 Spread" value={fmtUsd(card.psa10_price - card.market_price)} sub={`PSA10: ${fmtUsd(card.psa10_price)}`} icon={Shield} />
      </div>

      <div style={{ background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>Price History</span>
            <span style={{ fontSize: 13, color: clr(rangeReturn), fontFamily: "monospace", marginLeft: 12 }}>{fmtPct(Math.round(rangeReturn * 100) / 100)}</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {Object.keys(ranges).map(r => (
              <button key={r} onClick={() => setChartRange(r)}
                style={{ padding: "4px 10px", borderRadius: 4, border: chartRange === r ? "1px solid #fbbf24" : "1px solid #1e293b", background: chartRange === r ? "#fbbf2418" : "transparent", color: chartRange === r ? "#fbbf24" : "#64748b", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData}>
            <defs><linearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={rangeReturn >= 0 ? "#22c55e" : "#ef4444"} stopOpacity={0.15} /><stop offset="100%" stopColor={rangeReturn >= 0 ? "#22c55e" : "#ef4444"} stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="price" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
            <YAxis yAxisId="vol" orientation="right" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar yAxisId="vol" dataKey="volume" fill="#334155" radius={[2, 2, 0, 0]} name="Volume" />
            <Area yAxisId="price" type="monotone" dataKey="price" stroke={rangeReturn >= 0 ? "#22c55e" : "#ef4444"} fill="url(#cardGrad)" strokeWidth={2} dot={false} name="Price $" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>Price Breakdown</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {[
              { label: "Raw/Market", value: card.market_price },
              { label: "PSA 9", value: card.psa9_price },
              { label: "PSA 10", value: card.psa10_price },
              { label: "Release Price", value: card.release_price },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e293b44" }}>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>{label}</span>
                <span style={{ color: "#e2e8f0", fontSize: 13, fontFamily: "monospace", fontWeight: 600 }}>{fmtUsd(value)}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>Investment Score</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={[
              { metric: "ROI", score: Math.min(100, Math.max(0, card.roi / 100)) },
              { metric: "Liquidity", score: card.liquidity },
              { metric: "Grading", score: Math.min(100, card.gradingUpside * 10) },
              { metric: "Stability", score: Math.max(0, 100 - card.volatility * 2) },
              { metric: "Momentum", score: Math.min(100, Math.max(0, 50 + card.change30d)) },
            ]} layout="vertical">
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis dataKey="metric" type="category" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
              <Bar dataKey="score" fill="#fbbf24" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <button onClick={addToPortfolio} style={{ padding: "10px 24px", borderRadius: 6, border: "1px solid #fbbf24", background: inPortfolio ? "#22c55e22" : "#fbbf2418", color: inPortfolio ? "#22c55e" : "#fbbf24", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
        {inPortfolio ? <><Star size={14} /> In Portfolio</> : <><Plus size={14} /> Add to Portfolio</>}
      </button>
    </div>
  );
};

const SetsPage = ({ navigate, cards }) => {
  const [selectedSet, setSelectedSet] = useState(null);
  const setsWithMetrics = useMemo(() => SETS_DATA.map(set => {
    const setCards = cards.filter(c => c.set_id === set.id);
    const avgPrice = setCards.length ? setCards.reduce((s, c) => s + c.market_price, 0) / setCards.length : 0;
    const avgROI = setCards.length ? setCards.reduce((s, c) => s + c.roi, 0) / setCards.length : set.roi;
    return { ...set, tracked: setCards.length, avg_price: avgPrice, avg_roi: avgROI };
  }), [cards]);

  const detail = selectedSet ? setsWithMetrics.find(s => s.id === selectedSet) : null;
  const detailCards = selectedSet ? cards.filter(c => c.set_id === selectedSet) : [];

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: "0 0 20px" }}>Set Performance</h1>

      <div style={{ background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>Set ROI Comparison</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={setsWithMetrics.slice(0, 16)}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 9 }} tickLine={false} axisLine={false} angle={-35} textAnchor="end" height={70} interval={0} />
            <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="roi" name="ROI %" radius={[3, 3, 0, 0]}>
              {setsWithMetrics.slice(0, 16).map((s, i) => <Cell key={i} fill={s.roi > 2000 ? "#fbbf24" : s.roi > 500 ? "#22c55e" : "#3b82f6"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <SortableTable columns={[
        { key: "name", label: "Set", bold: true, render: r => <span style={{ fontWeight: 600, color: "#e2e8f0" }}>{r.name}</span> },
        { key: "era", label: "Era" },
        { key: "release_date", label: "Released" },
        { key: "cards_count", label: "Cards", align: "right", mono: true },
        { key: "tracked", label: "Tracked", align: "right", mono: true },
        { key: "avg_value", label: "Avg Value", align: "right", mono: true, render: r => fmtUsd(r.avg_value) },
        { key: "roi", label: "ROI", align: "right", mono: true, color: r => clr(r.roi), render: r => fmtPct(r.roi) },
      ]} data={setsWithMetrics} onRowClick={r => setSelectedSet(r.id === selectedSet ? null : r.id)} />

      {detail && (
        <div style={{ marginTop: 20, background: "#0c1222", border: "1px solid #fbbf2444", borderRadius: 8, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fbbf24", margin: 0 }}>{detail.name}</h3>
            <button onClick={() => setSelectedSet(null)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}><X size={16} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
            <Metric label="Era" value={detail.era} icon={Clock} />
            <Metric label="Total Cards" value={detail.cards_count} icon={Layers} />
            <Metric label="Avg Value" value={fmtUsd(detail.avg_value)} icon={DollarSign} />
            <Metric label="ROI" value={fmtPct(detail.roi)} color={clr(detail.roi)} icon={TrendingUp} />
          </div>
          {detailCards.length > 0 && (
            <SortableTable columns={[
              { key: "name", label: "Card", bold: true },
              { key: "rarity", label: "Rarity" },
              { key: "market_price", label: "Price", mono: true, align: "right", render: r => fmtUsd(r.market_price) },
              { key: "roi", label: "ROI", mono: true, align: "right", color: r => clr(r.roi), render: r => fmtPct(r.roi) },
              { key: "gradingUpside", label: "Grade Upside", mono: true, align: "right", render: r => `${fmt(r.gradingUpside)}x` },
            ]} data={detailCards} onRowClick={r => navigate("card", r.id)} maxH={300} />
          )}
        </div>
      )}
    </div>
  );
};

const SealedPage = ({ cards }) => {
  const [sortKey, setSortKey] = useState("roi");
  const sorted = useMemo(() => [...SEALED_PRODUCTS].sort((a, b) => b[sortKey] - a[sortKey]), [sortKey]);
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: "0 0 20px" }}>Sealed Products</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        <Metric label="Products Tracked" value={SEALED_PRODUCTS.length} icon={Package} />
        <Metric label="Avg ROI" value={fmtPct(Math.round(SEALED_PRODUCTS.reduce((s, p) => s + p.roi, 0) / SEALED_PRODUCTS.length))} color="#22c55e" icon={TrendingUp} />
        <Metric label="Best Performer" value={sorted[0]?.name?.slice(0, 24)} sub={fmtPct(sorted[0]?.roi)} icon={Award} />
      </div>
      <SortableTable columns={[
        { key: "name", label: "Product", bold: true, render: r => <span style={{ fontWeight: 600, color: "#e2e8f0" }}>{r.name}</span> },
        { key: "type", label: "Type" },
        { key: "set_name", label: "Set" },
        { key: "release_date", label: "Released" },
        { key: "release_price", label: "Release $", mono: true, align: "right", render: r => fmtUsd(r.release_price) },
        { key: "price", label: "Current $", mono: true, align: "right", render: r => fmtUsd(r.price) },
        { key: "roi", label: "ROI", mono: true, align: "right", color: r => clr(r.roi), render: r => fmtPct(r.roi) },
      ]} data={sorted} />
    </div>
  );
};

const PortfolioPage = ({ cards, portfolio, setPortfolio, navigate }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [addSearch, setAddSearch] = useState("");

  const holdings = useMemo(() => portfolio.map(p => {
    const card = cards.find(c => c.id === p.card_id);
    if (!card) return null;
    const currentValue = card.market_price * p.quantity;
    const costBasis = p.purchase_price * p.quantity;
    const pnl = currentValue - costBasis;
    const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
    return { ...p, card, currentValue, costBasis, pnl, pnlPct };
  }).filter(Boolean), [portfolio, cards]);

  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalCost = holdings.reduce((s, h) => s + h.costBasis, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const indexReturn = INDEX_HISTORY.length > 12 ? ((INDEX_HISTORY[INDEX_HISTORY.length - 1].value / INDEX_HISTORY[INDEX_HISTORY.length - 13].value) - 1) * 100 : 0;

  const removeHolding = (idx) => setPortfolio(prev => prev.filter((_, i) => i !== idx));

  const searchResults = addSearch.length > 1 ? cards.filter(c => c.name.toLowerCase().includes(addSearch.toLowerCase()) || c.set_name.toLowerCase().includes(addSearch.toLowerCase())).slice(0, 8) : [];

  const addCard = (card) => {
    const qty = parseInt(prompt("Quantity:", "1")) || 1;
    const price = parseFloat(prompt("Purchase price:", card.market_price.toString())) || card.market_price;
    setPortfolio(prev => [...prev, { card_id: card.id, purchase_price: price, quantity: qty, purchase_date: new Date().toISOString().slice(0, 10) }]);
    setShowAdd(false);
    setAddSearch("");
  };

  const pieData = holdings.slice(0, 8).map(h => ({ name: h.card.name.slice(0, 15), value: h.currentValue }));
  const PIE_COLORS = ["#fbbf24", "#22c55e", "#3b82f6", "#a78bfa", "#f472b6", "#fb923c", "#22d3ee", "#34d399"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Portfolio Tracker</h1>
        <button onClick={() => setShowAdd(!showAdd)} style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #fbbf24", background: "#fbbf2418", color: "#fbbf24", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> Add Card
        </button>
      </div>

      {showAdd && (
        <div style={{ background: "#0c1222", border: "1px solid #fbbf2444", borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <input value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder="Search for a card to add..."
            style={{ width: "100%", padding: "10px 14px", borderRadius: 6, border: "1px solid #1e293b", background: "#0a0f1c", color: "#e2e8f0", fontSize: 13, outline: "none", marginBottom: 10, boxSizing: "border-box" }} autoFocus />
          {searchResults.map(c => (
            <div key={c.id} onClick={() => addCard(c)} style={{ display: "flex", justifyContent: "space-between", padding: "8px 8px", cursor: "pointer", borderRadius: 4 }}
              onMouseOver={e => e.currentTarget.style.background = "#1e293b55"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
              <div><span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 13 }}>{c.name}</span><span style={{ color: "#64748b", fontSize: 11, marginLeft: 8 }}>{c.set_name}</span></div>
              <span style={{ fontFamily: "monospace", color: "#94a3b8", fontSize: 13 }}>{fmtUsd(c.market_price)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 24 }}>
        <Metric label="Portfolio Value" value={fmtUsd(totalValue)} icon={Briefcase} />
        <Metric label="Total P&L" value={fmtUsd(totalPnl)} color={clr(totalPnl)} icon={totalPnl >= 0 ? TrendingUp : TrendingDown} />
        <Metric label="Return" value={fmtPct(Math.round(totalPnlPct * 100) / 100)} color={clr(totalPnlPct)} icon={BarChart3} />
        <Metric label="vs Index" value={fmtPct(Math.round((totalPnlPct - indexReturn) * 100) / 100)} color={clr(totalPnlPct - indexReturn)} sub={`Index: ${fmtPct(Math.round(indexReturn * 100) / 100)}`} icon={Activity} />
        <Metric label="Holdings" value={holdings.length} sub={`${portfolio.reduce((s, p) => s + p.quantity, 0)} total cards`} icon={Layers} />
      </div>

      {holdings.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 }}>
          <div style={{ background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 20 }}>
            <h3 style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>Portfolio vs Index</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={INDEX_HISTORY.slice(-12).map((d, i) => ({
                date: d.date,
                index: Math.round(((d.value / INDEX_HISTORY[INDEX_HISTORY.length - 13]?.value || 1) - 1) * 10000) / 100,
                portfolio: Math.round(totalPnlPct * (i + 1) / 12 * 100) / 100,
              }))}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={0} stroke="#334155" />
                <Line type="monotone" dataKey="portfolio" stroke="#fbbf24" strokeWidth={2} dot={false} name="Portfolio %" />
                <Line type="monotone" dataKey="index" stroke="#64748b" strokeWidth={1.5} dot={false} name="Index %" strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 20 }}>
            <h3 style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>Allocation</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {holdings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#475569" }}>
          <Briefcase size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontSize: 15, fontWeight: 500 }}>Your portfolio is empty</p>
          <p style={{ fontSize: 13 }}>Add cards to start tracking your investments</p>
        </div>
      ) : (
        <SortableTable columns={[
          { key: "name", label: "Card", bold: true, render: r => <div><span style={{ fontWeight: 600, color: "#e2e8f0" }}>{r.card.name}</span><div style={{ fontSize: 11, color: "#64748b" }}>{r.card.set_name}</div></div> },
          { key: "quantity", label: "Qty", align: "right", mono: true },
          { key: "purchase_price", label: "Cost Basis", align: "right", mono: true, render: r => fmtUsd(r.purchase_price) },
          { key: "currentPrice", label: "Current", align: "right", mono: true, render: r => fmtUsd(r.card.market_price) },
          { key: "currentValue", label: "Value", align: "right", mono: true, render: r => fmtUsd(r.currentValue) },
          { key: "pnl", label: "P&L", align: "right", mono: true, color: r => clr(r.pnl), render: r => `${fmtUsd(r.pnl)} (${fmtPct(Math.round(r.pnlPct * 100) / 100)})` },
          { key: "purchase_date", label: "Bought" },
          { key: "actions", label: "", sortable: false, render: (r, i) => <button onClick={(e) => { e.stopPropagation(); removeHolding(portfolio.indexOf(portfolio.find(p => p.card_id === r.card_id && p.purchase_price === r.purchase_price))); }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4 }}><X size={14} /></button> },
        ]} data={holdings} onRowClick={r => navigate("card", r.card.id)} />
      )}
    </div>
  );
};

const AnalyticsPage = ({ cards, navigate }) => {
  const [filters, setFilters] = useState({ minGradingUpside: 3, minROI: 50, minVolume: 100, priceBelow: "" });
  const filtered = useMemo(() => cards.filter(c => {
    if (c.gradingUpside < filters.minGradingUpside) return false;
    if (c.roi < filters.minROI) return false;
    if (c.volume < filters.minVolume) return false;
    if (filters.priceBelow && c.market_price >= parseFloat(filters.priceBelow)) return false;
    return true;
  }), [cards, filters]);

  const rarityDist = useMemo(() => {
    const map = {};
    cards.forEach(c => { map[c.rarity] = (map[c.rarity] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name: name.slice(0, 12), value }));
  }, [cards]);

  const roiByRarity = useMemo(() => {
    const map = {};
    cards.forEach(c => { if (!map[c.rarity]) map[c.rarity] = []; map[c.rarity].push(c.roi); });
    return Object.entries(map).map(([rarity, rois]) => ({ rarity: rarity.slice(0, 12), avgROI: Math.round(rois.reduce((s, r) => s + r, 0) / rois.length) }));
  }, [cards]);

  const DIST_COLORS = ["#fbbf24", "#22c55e", "#3b82f6", "#a78bfa", "#f472b6", "#fb923c", "#22d3ee", "#34d399", "#f87171", "#818cf8", "#facc15"];
  const inputStyle = { padding: "7px 12px", borderRadius: 6, border: "1px solid #1e293b", background: "#0c1222", color: "#e2e8f0", fontSize: 12, width: 100, outline: "none" };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: "0 0 20px" }}>Advanced Analytics</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <div style={{ background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 14px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>Rarity Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={rarityDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={1} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {rarityDist.map((_, i) => <Cell key={i} fill={DIST_COLORS[i % DIST_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 14px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>Average ROI by Rarity</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={roiByRarity} layout="vertical">
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis dataKey="rarity" type="category" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} width={90} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="avgROI" fill="#fbbf24" radius={[0, 3, 3, 0]} name="Avg ROI %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Filter size={14} color="#fbbf24" />
          <h3 style={{ fontSize: 13, color: "#fbbf24", margin: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>Investment Screener</h3>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 12 }}>
            PSA10/Raw ≥ <input type="number" value={filters.minGradingUpside} onChange={e => setFilters(f => ({ ...f, minGradingUpside: parseFloat(e.target.value) || 0 }))} style={inputStyle} step="0.5" />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 12 }}>
            ROI ≥ <input type="number" value={filters.minROI} onChange={e => setFilters(f => ({ ...f, minROI: parseFloat(e.target.value) || 0 }))} style={inputStyle} />%
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 12 }}>
            Volume ≥ <input type="number" value={filters.minVolume} onChange={e => setFilters(f => ({ ...f, minVolume: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 12 }}>
            Price ≤ $ <input type="number" value={filters.priceBelow} onChange={e => setFilters(f => ({ ...f, priceBelow: e.target.value }))} style={inputStyle} placeholder="any" />
          </label>
          <span style={{ color: "#fbbf24", fontSize: 12, fontWeight: 600, alignSelf: "center" }}>{filtered.length} matches</span>
        </div>
        <SortableTable columns={[
          { key: "name", label: "Card", bold: true, render: r => <span style={{ fontWeight: 600, color: "#e2e8f0" }}>{r.name}</span> },
          { key: "set_name", label: "Set" },
          { key: "rarity", label: "Rarity" },
          { key: "market_price", label: "Price", mono: true, align: "right", render: r => fmtUsd(r.market_price) },
          { key: "psa10_price", label: "PSA 10", mono: true, align: "right", render: r => fmtUsd(r.psa10_price) },
          { key: "gradingUpside", label: "Grade Mult", mono: true, align: "right", render: r => `${fmt(r.gradingUpside)}x` },
          { key: "roi", label: "ROI", mono: true, align: "right", color: r => clr(r.roi), render: r => fmtPct(r.roi) },
          { key: "volume", label: "Volume", mono: true, align: "right" },
          { key: "signals", label: "Signals", sortable: false, render: r => <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{r.signals.map(s => <SignalBadge key={s} signal={s} />)}</div> },
        ]} data={filtered} onRowClick={r => navigate("card", r.id)} maxH={400} />
      </div>
    </div>
  );
};

// ─── APP SHELL ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "market", label: "Market", icon: Activity },
  { id: "cards", label: "Cards", icon: Grid3X3 },
  { id: "sets", label: "Sets", icon: BookOpen },
  { id: "sealed", label: "Sealed", icon: Package },
  { id: "portfolio", label: "Portfolio", icon: Briefcase },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

export default function PokeInvest() {
  const [page, setPage] = useState("home");
  const [cardId, setCardId] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("pokeinvest-portfolio");
        if (res?.value) setPortfolio(JSON.parse(res.value));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try { await window.storage.set("pokeinvest-portfolio", JSON.stringify(portfolio)); } catch {}
    })();
  }, [portfolio, loaded]);

  const navigate = useCallback((pg, id) => {
    setPage(pg === "card" ? "card" : pg);
    if (pg === "card") setCardId(id);
    window.scrollTo?.(0, 0);
  }, []);

  const renderPage = () => {
    switch (page) {
      case "home": return <HomePage navigate={navigate} cards={ALL_CARDS} />;
      case "market": return <MarketPage navigate={navigate} cards={ALL_CARDS} />;
      case "cards": return <CardsPage navigate={navigate} cards={ALL_CARDS} />;
      case "card": return <CardDetailPage cardId={cardId} cards={ALL_CARDS} navigate={navigate} portfolio={portfolio} setPortfolio={setPortfolio} />;
      case "sets": return <SetsPage navigate={navigate} cards={ALL_CARDS} />;
      case "sealed": return <SealedPage cards={ALL_CARDS} />;
      case "portfolio": return <PortfolioPage cards={ALL_CARDS} portfolio={portfolio} setPortfolio={setPortfolio} navigate={navigate} />;
      case "analytics": return <AnalyticsPage cards={ALL_CARDS} navigate={navigate} />;
      default: return <HomePage navigate={navigate} cards={ALL_CARDS} />;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080d19", color: "#cbd5e1", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0c1222; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #334155; }
        input::placeholder { color: #475569; }
        select { appearance: auto; }
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: "1px solid #1e293b", background: "#0a0f1cee", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50, padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, maxWidth: 1440, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #fbbf24, #f59e0b)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#0a0f1c" }}>P</span>
            </div>
            <span style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.5px" }}>Poké<span style={{ color: "#fbbf24" }}>Invest</span></span>
            <span style={{ fontSize: 9, color: "#475569", background: "#1e293b", padding: "2px 6px", borderRadius: 3, fontWeight: 600, marginLeft: 4 }}>BETA</span>
          </div>
          <nav style={{ display: "flex", gap: 2 }}>
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => navigate(id)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 6, border: "none", background: (page === id || (id === "cards" && page === "card")) ? "#fbbf2415" : "transparent", color: (page === id || (id === "cards" && page === "card")) ? "#fbbf24" : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                <Icon size={14} />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: 1440, margin: "0 auto", padding: "28px 24px 60px" }}>
        {renderPage()}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #1e293b", padding: "20px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 11, color: "#334155" }}>PokeInvest · Pokémon Card Investment Analytics · Data is simulated for demonstration purposes</p>
      </footer>
    </div>
  );
}
