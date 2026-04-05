"use client";

import { useState, useMemo, Fragment, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Image from "next/image";
import {
  Plus, X, Briefcase, TrendingUp, TrendingDown, BarChart3,
  Activity, Layers, Search, Edit2, Check, LogIn, ImageOff, AlertTriangle,
} from "lucide-react";
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { trpc } from "@/lib/trpc/client";
import { MetricCard } from "@/components/ui/MetricCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatCents, clr } from "@/lib/utils/formatting";

// ─── constants ────────────────────────────────────────────────────────────────

const PIE_COLORS = ["#fbbf24","#22c55e","#3b82f6","#a78bfa","#f472b6","#fb923c","#22d3ee","#34d399"];
const CONDITIONS = ["NM","LP","MP","HP","DMG"];
const PANEL: React.CSSProperties = { background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 20 };
const SECTION_LABEL: React.CSSProperties = { fontSize: 13, color: "#94a3b8", margin: "0 0 12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" };
const INPUT: React.CSSProperties = { padding: "8px 12px", borderRadius: 6, border: "1px solid #1e293b", background: "#0a0f1c", color: "#e2e8f0", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" };
const SELECT: React.CSSProperties = { ...INPUT, width: "auto" };
const fmtPct = (n: number | null) => n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

// ─── chart tooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: "#94a3b8", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
          {p.name}: {p.value.toFixed(2)}%
        </div>
      ))}
    </div>
  );
}

// ─── inline error banner ───────────────────────────────────────────────────────

function InlineError({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      background: "#ef444422",
      border: "1px solid #ef444444",
      borderRadius: 6,
      marginBottom: 12,
    }}>
      <AlertTriangle size={13} color="#ef4444" style={{ flexShrink: 0 }} />
      <span style={{ color: "#ef4444", fontSize: 12, flex: 1 }}>{message}</span>
      <button onClick={onDismiss} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 0, lineHeight: 1 }}>
        <X size={12} />
      </button>
    </div>
  );
}

// ─── add card panel ────────────────────────────────────────────────────────────

type SearchResult = { id: string; name: string; imageSmall: string | null; set: { name: string }; prices: Array<{ marketPrice: number | null }> };

function AddCardPanel({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [qty, setQty] = useState("1");
  const [priceStr, setPriceStr] = useState("");
  const [condition, setCondition] = useState("NM");
  const [graded, setGraded] = useState(false);
  const [gradeCompany, setGradeCompany] = useState("PSA");
  const [gradeValue, setGradeValue] = useState("10");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [mutError, setMutError] = useState<string | null>(null);

  // Debounce the search — cancel in-flight requests from previous keystrokes
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: searchResults } = trpc.cards.search.useQuery(
    { q: debouncedQuery, limit: 8 },
    { enabled: debouncedQuery.length > 1 }
  );

  const addMutation = trpc.portfolio.addHolding.useMutation({
    onSuccess: () => {
      utils.portfolio.get.invalidate();
      onClose();
    },
    onError: (err) => {
      setMutError(err.message || "Failed to add card. Please try again.");
      setSaving(false);
    },
  });

  const handleSelect = (card: SearchResult) => {
    setSelected(card);
    const latestPrice = card.prices[0]?.marketPrice;
    if (latestPrice) setPriceStr((latestPrice / 100).toFixed(2));
    setQuery("");
    setFormError(null);
    setMutError(null);
  };

  const handleSubmit = async () => {
    if (!selected) return;
    setFormError(null);

    const parsedQty = parseInt(qty);
    if (isNaN(parsedQty) || parsedQty < 1) {
      setFormError("Quantity must be at least 1");
      return;
    }

    const priceC = Math.round(parseFloat(priceStr) * 100);
    if (isNaN(priceC) || priceC <= 0) {
      setFormError("Purchase price must be greater than $0.00");
      return;
    }

    setSaving(true);
    try {
      await addMutation.mutateAsync({
        cardId: selected.id,
        purchasePriceC: priceC,
        quantity: parsedQty,
        condition,
        graded,
        gradeCompany: graded ? gradeCompany : undefined,
        gradeValue: graded ? gradeValue : undefined,
        purchaseDate: new Date(purchaseDate),
        notes: notes || undefined,
      });
    } catch {
      // onError handles the error state
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ ...PANEL, border: "1px solid #fbbf2444", marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontWeight: 700, color: "#fbbf24", fontSize: 14 }}>Add Card to Portfolio</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}><X size={16} /></button>
      </div>

      {mutError && <InlineError message={mutError} onDismiss={() => setMutError(null)} />}

      {!selected ? (
        /* Step 1: search */
        <div>
          <div style={{ position: "relative" }}>
            <Search size={13} color="#64748b" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a card…"
              style={{ ...INPUT, paddingLeft: 34 }}
            />
          </div>
          {searchResults && searchResults.length > 0 && (
            <div style={{ marginTop: 8, border: "1px solid #1e293b", borderRadius: 6, overflow: "hidden" }}>
              {searchResults.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c as SearchResult)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #1e293b22" }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#1e293b55"; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                >
                  {(c as SearchResult).imageSmall ? (
                    <Image src={(c as SearchResult).imageSmall!} alt={c.name} width={28} height={38} style={{ borderRadius: 2, objectFit: "contain", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 28, height: 38, background: "#1e293b", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <ImageOff size={12} color="#334155" />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="cell-name" style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                    <span style={{ color: "#64748b", fontSize: 11, marginLeft: 8 }}>{(c as SearchResult).set.name}</span>
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#94a3b8", fontSize: 12, flexShrink: 0 }}>
                    {formatCents((c as SearchResult).prices[0]?.marketPrice ?? null)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {query.length > 1 && searchResults?.length === 0 && (
            <div style={{ color: "#475569", fontSize: 12, marginTop: 8, paddingLeft: 4 }}>No cards found</div>
          )}
        </div>
      ) : (
        /* Step 2: form */
        <div>
          {/* Selected card header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#0a0f1c", borderRadius: 6, marginBottom: 16 }}>
            {selected.imageSmall ? (
              <Image src={selected.imageSmall} alt={selected.name} width={32} height={44} style={{ borderRadius: 3, objectFit: "contain", flexShrink: 0 }} />
            ) : (
              <div style={{ width: 32, height: 44, background: "#1e293b", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ImageOff size={14} color="#334155" />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="cell-name" style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14 }}>{selected.name}</div>
              <div style={{ color: "#64748b", fontSize: 11 }}>{selected.set.name}</div>
            </div>
            <button onClick={() => { setSelected(null); setPriceStr(""); setFormError(null); }} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 11 }}>
              change
            </button>
          </div>

          {formError && <InlineError message={formError} onDismiss={() => setFormError(null)} />}

          <div className="grid-3col" style={{ marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.6px" }}>Quantity</label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => { setQty(e.target.value); setFormError(null); }}
                style={{ ...INPUT, borderColor: formError && (parseInt(qty) < 1 || isNaN(parseInt(qty))) ? "#ef4444" : "#1e293b" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.6px" }}>Cost per card ($)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={priceStr}
                onChange={(e) => { setPriceStr(e.target.value); setFormError(null); }}
                style={{ ...INPUT, borderColor: formError && (parseFloat(priceStr) <= 0 || isNaN(parseFloat(priceStr))) ? "#ef4444" : "#1e293b" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.6px" }}>Purchase date</label>
              <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} style={INPUT} />
            </div>
          </div>

          <div className="grid-3col" style={{ marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.6px" }}>Condition</label>
              <select value={condition} onChange={(e) => setCondition(e.target.value)} style={{ ...SELECT, width: "100%" }}>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 20 }}>
              <input type="checkbox" id="graded" checked={graded} onChange={(e) => setGraded(e.target.checked)} style={{ accentColor: "#fbbf24", width: 14, height: 14 }} />
              <label htmlFor="graded" style={{ fontSize: 13, color: "#94a3b8", cursor: "pointer" }}>Graded card</label>
            </div>
            {graded && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.6px" }}>Company</label>
                  <select value={gradeCompany} onChange={(e) => setGradeCompany(e.target.value)} style={{ ...SELECT, width: "100%" }}>
                    {["PSA","BGS","CGC","SGC"].map((g) => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.6px" }}>Grade</label>
                  <select value={gradeValue} onChange={(e) => setGradeValue(e.target.value)} style={{ ...SELECT, width: "100%" }}>
                    {["10","9.5","9","8.5","8","7","6","5"].map((g) => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.6px" }}>Notes (optional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. bought at PTCGO tournament" style={INPUT} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: "1px solid #fbbf24", background: "#fbbf2418", color: "#fbbf24", fontSize: 13, fontWeight: 600, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "Saving…" : <><Check size={14} style={{ display: "inline", marginRight: 6 }} />Add to Portfolio</>}
            </button>
            <button onClick={() => { setSelected(null); setPriceStr(""); setFormError(null); }} style={{ padding: "9px 16px", borderRadius: 6, border: "1px solid #1e293b", background: "transparent", color: "#64748b", fontSize: 13, cursor: "pointer" }}>
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── edit row panel ────────────────────────────────────────────────────────────

type HoldingRow = {
  id: string;
  quantity: number;
  purchasePriceC: number;
  condition: string;
  graded: boolean;
  gradeCompany: string | null;
  gradeValue: string | null;
  notes: string | null;
  card: { id: string; name: string; set: { name: string }; prices: Array<{ marketPrice: number | null }> };
};

function EditRow({ holding, onClose }: { holding: HoldingRow; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [qty, setQty] = useState(String(holding.quantity));
  const [priceStr, setPriceStr] = useState((holding.purchasePriceC / 100).toFixed(2));
  const [condition, setCondition] = useState(holding.condition);
  const [notes, setNotes] = useState(holding.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateMutation = trpc.portfolio.updateHolding.useMutation({
    onSuccess: () => { utils.portfolio.get.invalidate(); onClose(); },
    onError: (err) => {
      setSaveError(err.message || "Failed to save changes");
      setSaving(false);
    },
  });

  const handleSave = async () => {
    const parsedQty = parseInt(qty);
    if (isNaN(parsedQty) || parsedQty < 1) {
      setSaveError("Quantity must be at least 1");
      return;
    }
    const priceC = Math.round(parseFloat(priceStr) * 100);
    if (isNaN(priceC) || priceC <= 0) {
      setSaveError("Price must be greater than $0.00");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await updateMutation.mutateAsync({
        id: holding.id,
        quantity: parsedQty,
        purchasePriceC: priceC,
        condition,
        notes: notes || null,
      });
    } catch {
      // onError handles it
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr style={{ background: "#0a0f1c" }}>
      <td colSpan={9} style={{ padding: "12px 16px" }}>
        {saveError && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "#ef444422", border: "1px solid #ef444444", borderRadius: 5, marginBottom: 8, fontSize: 12, color: "#ef4444" }}>
            <AlertTriangle size={12} style={{ flexShrink: 0 }} /> {saveError}
          </div>
        )}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.6px" }}>Qty</label>
            <input type="number" min="1" value={qty} onChange={(e) => { setQty(e.target.value); setSaveError(null); }}
              style={{ ...INPUT, width: 70 }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.6px" }}>Cost/card ($)</label>
            <input type="number" min="0.01" step="0.01" value={priceStr} onChange={(e) => { setPriceStr(e.target.value); setSaveError(null); }}
              style={{ ...INPUT, width: 100 }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.6px" }}>Condition</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} style={{ ...SELECT }}>
              {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.6px" }}>Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...INPUT, minWidth: 180 }} />
          </div>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #22c55e", background: "#22c55e22", color: "#22c55e", fontSize: 12, fontWeight: 600, cursor: saving ? "wait" : "pointer", whiteSpace: "nowrap", opacity: saving ? 0.7 : 1 }}>
            {saving ? "…" : "Save"}
          </button>
          <button onClick={onClose}
            style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #1e293b", background: "transparent", color: "#64748b", fontSize: 12, cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── main page ─────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const router = useRouter();
  const { status } = useSession();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const { data: portfolio, isLoading, isError, refetch } = trpc.portfolio.get.useQuery(undefined, {
    enabled: status === "authenticated",
  });
  const { data: indexHistory } = trpc.analytics.indexHistory.useQuery(undefined, {
    enabled: status === "authenticated",
  });
  const utils = trpc.useUtils();

  const removeMutation = trpc.portfolio.removeHolding.useMutation({
    onSuccess: () => utils.portfolio.get.invalidate(),
    onError: (err) => setRemoveError(err.message || "Failed to remove card. Please try again."),
  });

  // ── computed holdings ──
  const holdings = useMemo(() => {
    if (!portfolio?.holdings) return [];
    return portfolio.holdings.map((h) => {
      const latestPrice = h.card.prices[0]?.marketPrice ?? null;
      const currentValueC = latestPrice != null ? latestPrice * h.quantity : null;
      const costBasisC = h.purchasePriceC * h.quantity;
      const pnlC = currentValueC != null ? currentValueC - costBasisC : null;
      const pnlPct = pnlC != null && costBasisC > 0 ? (pnlC / costBasisC) * 100 : null;
      return { ...h, latestPrice, currentValueC, costBasisC, pnlC, pnlPct };
    });
  }, [portfolio]);

  // ── summary stats ──
  const totalValueC = holdings.reduce((s, h) => s + (h.currentValueC ?? h.costBasisC), 0);
  const totalCostC = holdings.reduce((s, h) => s + h.costBasisC, 0);
  const totalPnlC = totalValueC - totalCostC;
  const totalPnlPct = totalCostC > 0 ? (totalPnlC / totalCostC) * 100 : 0;
  const totalQty = holdings.reduce((s, h) => s + h.quantity, 0);

  // ── index return (1Y) ──
  const indexReturn = useMemo(() => {
    if (!indexHistory || indexHistory.length < 2) return null;
    const first = Number(indexHistory[0]?.value ?? 0);
    const last = Number(indexHistory[indexHistory.length - 1]?.value ?? 0);
    return first > 0 ? ((last - first) / first) * 100 : null;
  }, [indexHistory]);

  const vsIndex = indexReturn != null ? totalPnlPct - indexReturn : null;

  // ── portfolio vs index line chart ──
  const lineChartData = useMemo(() => {
    if (!indexHistory || indexHistory.length === 0) return [];
    const pts = indexHistory.slice(-12);
    const baseIdx = Number(pts[0]?.value ?? 1);
    return pts.map((d, i) => ({
      date: (d.date instanceof Date ? d.date : new Date(d.date)).toISOString().slice(0, 7),
      index: Number(d.value) / baseIdx * 100 - 100,
      portfolio: totalPnlPct * ((i + 1) / pts.length),
    }));
  }, [indexHistory, totalPnlPct]);

  // ── allocation pie ──
  const pieData = holdings
    .slice()
    .sort((a, b) => (b.currentValueC ?? 0) - (a.currentValueC ?? 0))
    .slice(0, 8)
    .map((h) => ({
      name: h.card.name.length > 15 ? h.card.name.slice(0, 15) + "…" : h.card.name,
      value: h.currentValueC ?? h.costBasisC,
    }));

  // ── table columns ──
  type Row = typeof holdings[number];
  const columns = [
    {
      key: "card",
      label: "Card",
      bold: true,
      render: (row: Row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {row.card.imageSmall ? (
            <Image src={row.card.imageSmall} alt={row.card.name} width={28} height={38}
              style={{ borderRadius: 2, objectFit: "contain", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 28, height: 38, background: "#1e293b", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ImageOff size={12} color="#334155" />
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div className="cell-name" style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 13 }}>{row.card.name}</div>
            <div style={{ fontSize: 11, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.card.set.name}</div>
          </div>
        </div>
      ),
    },
    { key: "quantity", label: "Qty", align: "right" as const, mono: true, render: (row: Row) => String(row.quantity) },
    {
      key: "condition", label: "Cond", render: (row: Row) => (
        <span style={{ fontSize: 11, color: "#94a3b8", background: "#1e293b", padding: "2px 7px", borderRadius: 4, fontWeight: 600, whiteSpace: "nowrap" as const }}>
          {row.graded && row.gradeCompany ? `${row.gradeCompany} ${row.gradeValue}` : row.condition}
        </span>
      ),
    },
    { key: "purchasePriceC", label: "Cost/ea", align: "right" as const, mono: true, render: (row: Row) => formatCents(row.purchasePriceC) },
    {
      key: "latestPrice", label: "Current", align: "right" as const, mono: true,
      render: (row: Row) => row.latestPrice != null ? formatCents(row.latestPrice) : <span style={{ color: "#475569" }}>No price</span>,
    },
    { key: "currentValueC", label: "Value", align: "right" as const, mono: true, render: (row: Row) => formatCents(row.currentValueC ?? row.costBasisC) },
    {
      key: "pnlC",
      label: "P&L",
      align: "right" as const,
      mono: true,
      color: (row: Row) => clr(row.pnlC),
      render: (row: Row) =>
        row.pnlC != null
          ? `${formatCents(row.pnlC)} (${fmtPct(row.pnlPct)})`
          : "—",
    },
    {
      key: "purchaseDate",
      label: "Bought",
      render: (row: Row) =>
        (row.purchaseDate instanceof Date ? row.purchaseDate : new Date(row.purchaseDate))
          .toISOString()
          .slice(0, 10),
    },
    {
      key: "actions",
      label: "",
      sortable: false,
      render: (row: Row) => (
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={(e) => { e.stopPropagation(); setEditingId((id) => id === row.id ? null : row.id); }}
            style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}
            title="Edit"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Remove ${row.card.name} from portfolio?`)) {
                setRemoveError(null);
                removeMutation.mutate({ id: row.id });
              }
            }}
            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4 }}
            title="Remove"
          >
            <X size={13} />
          </button>
        </div>
      ),
    },
  ];

  // ── unauthenticated ──
  if (status === "unauthenticated") {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <Briefcase size={48} color="#334155" style={{ marginBottom: 16, display: "block", margin: "0 auto 16px" }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: "0 0 8px" }}>Sign in to track your portfolio</h2>
        <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 24px" }}>Your holdings are stored securely and synced across devices.</p>
        <button
          onClick={() => signIn()}
          style={{ padding: "10px 28px", borderRadius: 6, border: "1px solid #fbbf24", background: "#fbbf2418", color: "#fbbf24", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <LogIn size={14} /> Sign in
        </button>
      </div>
    );
  }

  if (status === "loading" || isLoading) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div className="skeleton" style={{ height: 28, width: 180, borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 34, width: 100, borderRadius: 6 }} />
        </div>
        <div className="grid-4col" style={{ marginBottom: 24 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 88, borderRadius: 8 }} />
          ))}
        </div>
        <div className="grid-2col" style={{ marginBottom: 24 }}>
          <div className="skeleton" style={{ height: 240, borderRadius: 8 }} />
          <div className="skeleton" style={{ height: 240, borderRadius: 8 }} />
        </div>
        <div className="skeleton" style={{ height: 400, borderRadius: 8 }} />
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: "0 0 20px" }}>Portfolio Tracker</h1>
        <ErrorState message="Failed to load portfolio" onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Portfolio Tracker</h1>
        <button
          onClick={() => setShowAdd((v) => !v)}
          style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #fbbf24", background: "#fbbf2418", color: "#fbbf24", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={14} /> Add Card
        </button>
      </div>

      {showAdd && <AddCardPanel onClose={() => setShowAdd(false)} />}

      {removeError && <InlineError message={removeError} onDismiss={() => setRemoveError(null)} />}

      {/* Summary metrics */}
      <div className="grid-4col" style={{ marginBottom: 24 }}>
        <MetricCard label="Portfolio Value" value={formatCents(totalValueC)} icon={Briefcase} />
        <MetricCard
          label="Total P&L"
          value={formatCents(totalPnlC)}
          color={clr(totalPnlC)}
          icon={totalPnlC >= 0 ? TrendingUp : TrendingDown}
        />
        <MetricCard
          label="Return"
          value={fmtPct(totalPnlPct)}
          color={clr(totalPnlPct)}
          icon={BarChart3}
        />
        <MetricCard
          label="vs Index"
          value={fmtPct(vsIndex)}
          color={clr(vsIndex)}
          sub={indexReturn != null ? `Index: ${fmtPct(indexReturn)}` : "No index data"}
          icon={Activity}
        />
        <MetricCard
          label="Holdings"
          value={holdings.length}
          sub={`${totalQty} total cards`}
          icon={Layers}
        />
      </div>

      {/* Charts + empty state */}
      {holdings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#475569" }}>
          <Briefcase size={40} style={{ marginBottom: 12, opacity: 0.4, display: "block", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 15, fontWeight: 500, margin: "0 0 6px" }}>Your portfolio is empty</p>
          <p style={{ fontSize: 13, margin: 0 }}>Click <strong style={{ color: "#fbbf24" }}>Add Card</strong> to start tracking your investments</p>
        </div>
      ) : (
        <>
          {/* Portfolio vs Index + Allocation */}
          <div className="grid-2col" style={{ marginBottom: 24 }}>
            <div style={PANEL}>
              <h3 style={SECTION_LABEL}>Portfolio vs Index (% return)</h3>
              {lineChartData.length < 2 ? (
                <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontSize: 13 }}>
                  No index history — run seed-history.ts
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={lineChartData}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} unit="%" />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine y={0} stroke="#334155" />
                    <Line type="monotone" dataKey="portfolio" stroke="#fbbf24" strokeWidth={2} dot={false} name="Portfolio %" isAnimationActive={false} />
                    <Line type="monotone" dataKey="index" stroke="#64748b" strokeWidth={1.5} dot={false} name="Index %" strokeDasharray="4 4" isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={PANEL}>
              <h3 style={SECTION_LABEL}>Allocation</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatCents(v)}
                    contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 6, fontSize: 12 }}
                    labelStyle={{ color: "#94a3b8" }}
                    itemStyle={{ color: "#e2e8f0" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Holdings table — custom render to splice in edit row */}
          <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #1e293b" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} style={{ padding: "10px 14px", background: "#0c1222", borderBottom: "2px solid #1e293b", color: "#64748b", textAlign: col.align ?? "left", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.8px", whiteSpace: "nowrap" }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdings.map((row) => (
                  <Fragment key={row.id}>
                    <tr
                      onClick={() => router.push(`/cards/${row.card.id}`)}
                      style={{ cursor: "pointer", borderBottom: "1px solid #1e293b22" }}
                      onMouseOver={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#1e293b44"; }}
                      onMouseOut={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                    >
                      {columns.map((col) => (
                        <td key={col.key} style={{ padding: "10px 14px", color: col.color ? col.color(row as unknown as Row) : "#cbd5e1", textAlign: col.align ?? "left", fontFamily: col.mono ? "'JetBrains Mono', monospace" : "inherit", fontWeight: col.bold ? 600 : 400, whiteSpace: "nowrap" }}>
                          {col.render ? col.render(row as unknown as Row) : String((row as Record<string, unknown>)[col.key] ?? "—")}
                        </td>
                      ))}
                    </tr>
                    {editingId === row.id && (
                      <EditRow holding={row as unknown as HoldingRow} onClose={() => setEditingId(null)} />
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
