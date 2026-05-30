"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { ErrorState } from "@/components/ui/ErrorState";

const PANEL = { background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "var(--radius)" };
const MONO = { fontFamily: "var(--font-mono)" };

const CATEGORY_LABELS: Record<string, string> = {
  YOUTUBER: "YouTuber", SOCIAL_CREATOR: "Social", STREAMER_BREAKER: "Breaker",
  INVESTOR_X: "Investor", PODCAST: "Podcast", MARKETPLACE: "Marketplace",
  LGS: "Local Shop", GROUP_BREAK: "Group Break", GRADING: "Grading",
  AUTHENTICATION: "Authentication", TOOL_SITE: "Tool", NEWS_BLOG: "News", COMMUNITY: "Community",
};
const labelFor = (c: string) => CATEGORY_LABELS[c] ?? c;

function formatSubs(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K`;
  return String(n);
}

const TABS = [
  { key: "subs", label: "Top Subscribers" },
  { key: "votes", label: "Most Voted" },
  { key: "heat", label: "Trending" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

type Entry = {
  id: string;
  slug: string;
  name: string;
  category: string;
  avatarUrl: string | null;
  heatScore: number;
  voteScore: number;
  ytSubscribers: number | null;
};

export default function RankingsPage() {
  const [tab, setTab] = useState<TabKey>("subs");
  const { data, isLoading, isError, refetch } = trpc.creators.list.useQuery({});
  const entries = useMemo(() => (data ?? []) as Entry[], [data]);

  const ranked = useMemo(() => {
    const arr = [...entries];
    const cmp: Record<TabKey, (a: Entry, b: Entry) => number> = {
      subs: (a, b) => (b.ytSubscribers ?? -1) - (a.ytSubscribers ?? -1),
      votes: (a, b) => b.voteScore - a.voteScore,
      heat: (a, b) => b.heatScore - a.heatScore,
    };
    return arr.sort(cmp[tab]);
  }, [entries, tab]);

  const col = (key: TabKey) =>
    tab === key ? { color: "var(--accent)", fontWeight: 700 } : { color: "var(--text-3)" };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", margin: 0 }}>Rankings</h1>
      <p style={{ color: "var(--text-3)", fontSize: 13, margin: "4px 0 20px" }}>
        Every creator &amp; resource in the Hub, ranked every way that matters.
      </p>

      {/* Tabs */}
      <div
        style={{
          display: "inline-flex", gap: 4, padding: 4, marginBottom: 16,
          background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 999,
          flexWrap: "wrap",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "6px 16px", borderRadius: 999, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700,
              background: tab === t.key ? "var(--bg-panel)" : "transparent",
              color: tab === t.key ? "var(--accent)" : "var(--text-3)",
              boxShadow: tab === t.key ? "var(--glow)" : "none",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isError ? (
        <ErrorState message="Failed to load rankings." onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div style={{ ...PANEL, padding: 16 }}>
          {[...Array(10)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 44, marginBottom: 8, borderRadius: 6 }} />
          ))}
        </div>
      ) : (
        <div style={{ ...PANEL, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ ...TH, width: 48, textAlign: "center" }}>#</th>
                  <th style={{ ...TH, textAlign: "left" }}>Creator</th>
                  <th style={{ ...TH, textAlign: "left" }}>Category</th>
                  <th style={{ ...TH, textAlign: "right", ...col("subs") }}>Subscribers</th>
                  <th style={{ ...TH, textAlign: "right", ...col("votes") }}>Votes</th>
                  <th style={{ ...TH, textAlign: "right", ...col("heat") }}>Heat</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((e, idx) => {
                  const rank = idx + 1;
                  const top = rank <= 3;
                  return (
                    <tr key={e.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ ...TD, textAlign: "center" }}>
                        <span
                          style={{
                            ...MONO, fontSize: 13, fontWeight: 800,
                            color: top ? "var(--accent)" : "var(--text-3)",
                          }}
                        >
                          {rank}
                        </span>
                      </td>
                      <td style={TD}>
                        <Link
                          href={`/hub/${e.slug}`}
                          style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
                        >
                          {e.avatarUrl ? (
                            <Image src={e.avatarUrl} alt={e.name} width={32} height={32} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg-panel-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <ImageOff size={16} color="var(--text-3)" />
                            </div>
                          )}
                          <span style={{ color: "var(--text)", fontWeight: 600, fontSize: 14, whiteSpace: "nowrap" }}>{e.name}</span>
                        </Link>
                      </td>
                      <td style={{ ...TD, color: "var(--text-3)", fontSize: 12 }}>{labelFor(e.category)}</td>
                      <td style={{ ...TD, ...MONO, textAlign: "right", ...col("subs") }}>{formatSubs(e.ytSubscribers)}</td>
                      <td style={{ ...TD, ...MONO, textAlign: "right", ...col("votes") }}>{e.voteScore}</td>
                      <td style={{ ...TD, ...MONO, textAlign: "right", ...col("heat") }}>{Math.round(e.heatScore)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const TH: React.CSSProperties = {
  padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "var(--text-3)",
  textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap",
};
const TD: React.CSSProperties = { padding: "10px 16px", fontSize: 13, color: "var(--text-2)" };
