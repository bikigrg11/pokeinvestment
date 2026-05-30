"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ImageOff,
  Plus,
  Youtube,
  Globe,
  Instagram,
  Twitch,
  Twitter,
  Music2,
  Mic,
  MessageCircle,
  ShoppingBag,
  Link2,
  type LucideIcon,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { ErrorState } from "@/components/ui/ErrorState";
import { VoteControl } from "@/components/hub/VoteControl";
import { AddEntryModal } from "@/components/hub/AddEntryModal";

const PANEL = { background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 8, padding: 20 };

const CATEGORY_LABELS: Record<string, string> = {
  YOUTUBER: "YouTubers",
  SOCIAL_CREATOR: "Social Creators",
  STREAMER_BREAKER: "Breakers / Streamers",
  INVESTOR_X: "Investors",
  PODCAST: "Podcasts",
  MARKETPLACE: "Marketplaces",
  LGS: "Local Game Shops",
  GROUP_BREAK: "Group Breaks",
  GRADING: "Grading",
  AUTHENTICATION: "Authentication",
  TOOL_SITE: "Tools & Data",
  NEWS_BLOG: "News & Info",
  COMMUNITY: "Communities",
};
const labelFor = (c: string) => CATEGORY_LABELS[c] ?? c;

const PLATFORM_META: Record<string, { Icon: LucideIcon; color: string }> = {
  youtube: { Icon: Youtube, color: "#ff0000" },
  website: { Icon: Globe, color: "#38bdf8" },
  instagram: { Icon: Instagram, color: "#e1306c" },
  tiktok: { Icon: Music2, color: "var(--text)" },
  x: { Icon: Twitter, color: "var(--text)" },
  twitter: { Icon: Twitter, color: "#1da1f2" },
  twitch: { Icon: Twitch, color: "#9146ff" },
  discord: { Icon: MessageCircle, color: "#5865f2" },
  podcast: { Icon: Mic, color: "var(--accent)" },
  whatnot: { Icon: ShoppingBag, color: "var(--accent)" },
};
const platformMeta = (p: string) => PLATFORM_META[p.toLowerCase()] ?? { Icon: Link2, color: "var(--muted)" };

function formatSubs(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K`;
  return String(n);
}

type Entry = {
  id: string;
  slug: string;
  name: string;
  category: string;
  avatarUrl: string | null;
  heatScore: number;
  voteScore: number;
  ytSubscribers: number | null;
  createdAt: string | Date;
  links: { id: string; platform: string; url: string }[];
};

type Sort = "subs" | "heat" | "votes" | "newest";
const SORT_LABELS: Record<Sort, string> = { subs: "Subscribers", heat: "Heat", votes: "Votes", newest: "Newest" };

export default function BrowsePage() {
  const [selected, setSelected] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("subs");
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading, isError, refetch } = trpc.creators.list.useQuery({});
  const entries = useMemo(() => (data ?? []) as Entry[], [data]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const visible = useMemo(() => {
    const arr = selected === "all" ? [...entries] : entries.filter((e) => e.category === selected);
    const cmp: Record<Sort, (a: Entry, b: Entry) => number> = {
      subs: (a, b) => (b.ytSubscribers ?? -1) - (a.ytSubscribers ?? -1),
      heat: (a, b) => b.heatScore - a.heatScore,
      votes: (a, b) => b.voteScore - a.voteScore,
      newest: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    };
    return [...arr].sort(cmp[sort]);
  }, [entries, selected, sort]);

  return (
    <div className="main-content" style={{ maxWidth: 1440, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0 }}>Browse</h1>
          <p style={{ color: "var(--text-3)", fontSize: 13, margin: "4px 0 0" }}>
            Every creator, resource &amp; tool in the hub — filter by category.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--accent)", color: "var(--bg-panel-2)", border: "none", borderRadius: 6, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0 }}
        >
          <Plus size={15} /> Add entry
        </button>
      </div>

      {isError ? (
        <ErrorState message="Failed to load the directory." onRetry={() => void refetch()} />
      ) : (
        <div className="hub-grid">
          <nav className="hub-cats">
            <CategoryButton label="All" count={entries.length} active={selected === "all"} onClick={() => setSelected("all")} />
            {categories.map(([cat, count]) => (
              <CategoryButton key={cat} label={labelFor(cat)} count={count} active={selected === cat} onClick={() => setSelected(cat)} />
            ))}
          </nav>

          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text-3)", marginRight: 2 }}>Sort</span>
              {(["subs", "heat", "votes", "newest"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  style={{ background: sort === s ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent", color: sort === s ? "var(--accent)" : "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                >
                  {SORT_LABELS[s]}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="hub-cards">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 150, borderRadius: 10 }} />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div style={{ ...PANEL, textAlign: "center", color: "var(--text-3)" }}>No entries in this category yet.</div>
            ) : (
              <div className="hub-cards">
                {visible.map((e, idx) => (
                  <CreatorCard key={e.id} entry={e} rank={idx + 1} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showAdd && <AddEntryModal onClose={() => setShowAdd(false)} onSubmitted={() => { setShowAdd(false); void refetch(); }} />}
    </div>
  );
}

function CategoryButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        background: active ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "var(--bg-panel)",
        border: `1px solid ${active ? "color-mix(in srgb, var(--accent) 35%, transparent)" : "var(--border)"}`,
        borderRadius: 8, padding: "8px 12px", cursor: "pointer",
        color: active ? "var(--accent)" : "var(--text-2)", fontSize: 13, fontWeight: 600,
        whiteSpace: "nowrap", flexShrink: 0, textAlign: "left",
      }}
    >
      <span>{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: active ? "var(--accent)" : "var(--text-3)" }}>{count}</span>
    </button>
  );
}

function CreatorCard({ entry: e, rank }: { entry: Entry; rank: number }) {
  const top = rank <= 3;
  return (
    <div style={{ ...PANEL, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span
          title={`Rank #${rank}`}
          style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 800,
            color: top ? "var(--bg-panel-2)" : "var(--muted)",
            background: top ? "var(--accent)" : "var(--border)",
            minWidth: 30, height: 30, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          {rank}
        </span>
        <Link href={`/hub/${e.slug}`} style={{ flexShrink: 0 }}>
          {e.avatarUrl ? (
            <Image src={e.avatarUrl} alt={e.name} width={52} height={52} style={{ borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ImageOff size={24} color="var(--text-3)" />
            </div>
          )}
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href={`/hub/${e.slug}`} style={{ color: "var(--text)", fontWeight: 700, fontSize: 15, textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {e.name}
          </Link>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
            {labelFor(e.category)}
            {e.ytSubscribers != null && (
              <span style={{ color: "var(--muted)" }}> · {formatSubs(e.ytSubscribers)} subs</span>
            )}
          </div>
        </div>
      </div>

      {e.links.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {e.links.map((l) => {
            const { Icon, color } = platformMeta(l.platform);
            return (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                title={l.platform}
                style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 9px", color: "var(--text-2)", fontSize: 11, fontWeight: 600, textDecoration: "none", textTransform: "capitalize" }}
              >
                <Icon size={13} color={color} />
                {l.platform}
              </a>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
        <Link href={`/hub/${e.slug}`} style={{ fontSize: 12, color: "var(--text-3)", textDecoration: "none", fontWeight: 600 }}>
          View profile →
        </Link>
        <VoteControl entryId={e.id} initialScore={e.voteScore} />
      </div>
    </div>
  );
}
