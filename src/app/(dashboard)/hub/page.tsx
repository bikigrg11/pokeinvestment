"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ImageOff, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { ErrorState } from "@/components/ui/ErrorState";
import { VoteControl } from "@/components/hub/VoteControl";
import { AddEntryModal } from "@/components/hub/AddEntryModal";

const PANEL = { background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 20 };

const CATEGORIES = [
  "YOUTUBER", "SOCIAL_CREATOR", "STREAMER_BREAKER", "INVESTOR_X", "PODCAST",
  "MARKETPLACE", "LGS", "GROUP_BREAK", "GRADING", "AUTHENTICATION",
  "TOOL_SITE", "NEWS_BLOG", "COMMUNITY",
] as const;
type Category = (typeof CATEGORIES)[number];
const labelFor = (c: string) => c.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());

function heatColor(h: number) {
  return h >= 75 ? "#fbbf24" : h >= 50 ? "#22c55e" : "#94a3b8";
}

export default function HubPage() {
  const [category, setCategory] = useState<Category | "">("");
  const [sort, setSort] = useState<"heat" | "votes" | "newest">("heat");
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading, isError, refetch } = trpc.creators.list.useQuery({
    category: category || undefined,
    sort,
  });
  const entries = useMemo(() => data ?? [], [data]);

  return (
    <div className="main-content" style={{ maxWidth: 1440, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Creator Hub</h1>
          <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>
            People &amp; resources across the Pokémon hobby — ranked by community Heat.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6, background: "#fbbf24",
            color: "#0a0f1c", border: "none", borderRadius: 6, padding: "8px 14px",
            fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}
        >
          <Plus size={15} /> Add entry
        </button>
      </div>

      <div style={{ ...PANEL, marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | "")}
          style={{ background: "#0a0f1c", color: "#f1f5f9", border: "1px solid #1e293b", borderRadius: 6, padding: "6px 10px" }}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{labelFor(c)}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          style={{ background: "#0a0f1c", color: "#f1f5f9", border: "1px solid #1e293b", borderRadius: 6, padding: "6px 10px" }}
        >
          <option value="heat">Sort: Heat</option>
          <option value="votes">Sort: Votes</option>
          <option value="newest">Sort: Newest</option>
        </select>
      </div>

      {isError ? (
        <ErrorState message="Failed to load the directory." onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div style={PANEL}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 6 }} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div style={{ ...PANEL, textAlign: "center", color: "#64748b" }}>
          No entries yet — be the first to add one.
        </div>
      ) : (
        <div style={{ ...PANEL, padding: 0 }}>
          {entries.map((e) => (
            <div
              key={e.id}
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
                borderBottom: "1px solid #1e293b",
              }}
            >
              {e.avatarUrl ? (
                <Image src={e.avatarUrl} alt={e.name} width={40} height={40} style={{ borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ImageOff size={20} color="#334155" />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/hub/${e.slug}`} style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                  {e.name}
                </Link>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  {labelFor(e.category)}
                  {e.links.length > 0 && ` · ${e.links.map((l) => l.platform).join(", ")}`}
                </div>
              </div>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700,
                  color: heatColor(e.heatScore), background: `${heatColor(e.heatScore)}15`,
                  padding: "3px 8px", borderRadius: 4,
                }}
              >
                {Math.round(e.heatScore)}
              </span>
              <VoteControl entryId={e.id} initialScore={e.voteScore} />
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddEntryModal onClose={() => setShowAdd(false)} onSubmitted={() => { setShowAdd(false); void refetch(); }} />}
    </div>
  );
}
