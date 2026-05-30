"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Flame,
  TrendingUp,
  Sparkles,
  Wrench,
  Plus,
  ArrowRight,
  ImageOff,
  type LucideIcon,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { ErrorState } from "@/components/ui/ErrorState";
import { AddEntryModal } from "@/components/hub/AddEntryModal";
import { VideoCard, type TrendingVideo } from "@/components/hub/VideoCard";

const CATEGORY_LABELS: Record<string, string> = {
  YOUTUBER: "YouTuber", SOCIAL_CREATOR: "Social", STREAMER_BREAKER: "Breaker",
  INVESTOR_X: "Investor", PODCAST: "Podcast", MARKETPLACE: "Marketplace",
  LGS: "Local Shop", GROUP_BREAK: "Group Break", GRADING: "Grading",
  AUTHENTICATION: "Authentication", TOOL_SITE: "Tool", NEWS_BLOG: "News", COMMUNITY: "Community",
};
const labelFor = (c: string) => CATEGORY_LABELS[c] ?? c;
const RESOURCE_CATS = new Set(["TOOL_SITE", "NEWS_BLOG", "MARKETPLACE", "GRADING", "AUTHENTICATION"]);

function formatSubs(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K`;
  return String(n);
}

type Entry = {
  id: string; slug: string; name: string; category: string;
  avatarUrl: string | null; ytSubscribers: number | null; createdAt: string | Date;
  links: { id: string; platform: string; url: string }[];
};

export default function DiscoverPage() {
  const [showAdd, setShowAdd] = useState(false);

  const list = trpc.creators.list.useQuery({});
  const trending = trpc.creators.trendingVideos.useQuery(undefined, { staleTime: 10 * 60 * 1000 });
  const entries = useMemo(() => (list.data ?? []) as Entry[], [list.data]);

  const topCreators = useMemo(
    () => [...entries].filter((e) => e.ytSubscribers != null).sort((a, b) => (b.ytSubscribers ?? 0) - (a.ytSubscribers ?? 0)).slice(0, 6),
    [entries]
  );
  const newest = useMemo(
    () => [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6),
    [entries]
  );
  const tools = useMemo(() => entries.filter((e) => RESOURCE_CATS.has(e.category)).slice(0, 8), [entries]);
  const videos = (trending.data ?? []) as TrendingVideo[];

  return (
    <div className="main-content" style={{ maxWidth: 1280, margin: "0 auto" }}>
      {/* Hero */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", margin: 0 }}>Discover</h1>
          <p style={{ color: "var(--text-3)", fontSize: 14, margin: "6px 0 0", maxWidth: 560 }}>
            New videos, creators &amp; tools across the Pokémon hobby — fresh every day.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--accent)", color: "var(--bg-panel-2)", border: "none", borderRadius: "var(--radius)", padding: "10px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer", flexShrink: 0, boxShadow: "var(--glow)" }}
        >
          <Plus size={16} /> Add a creator or tool
        </button>
      </div>

      {list.isError ? (
        <ErrorState message="Failed to load Discover." onRetry={() => void list.refetch()} />
      ) : (
        <>
          {/* Trending videos */}
          <Section icon={Flame} title="Trending Videos" href="/hub/videos" actionLabel="See all">
            {trending.isLoading ? (
              <div className="hub-cards">{[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: "16/9", borderRadius: 8 }} />)}</div>
            ) : videos.length === 0 ? (
              <Empty text="Trending videos are loading — check back shortly." />
            ) : (
              <div className="hub-cards">{videos.slice(0, 6).map((v) => <VideoCard key={v.videoId} v={v} />)}</div>
            )}
          </Section>

          {/* Top creators */}
          <Section icon={TrendingUp} title="Top Creators" href="/rankings" actionLabel="Full rankings">
            <CreatorRow loading={list.isLoading} items={topCreators} sub={(e) => (e.ytSubscribers != null ? `${formatSubs(e.ytSubscribers)} subs` : labelFor(e.category))} />
          </Section>

          {/* New this week */}
          <Section icon={Sparkles} title="New This Week" href="/hub/browse" actionLabel="Browse all">
            <CreatorRow loading={list.isLoading} items={newest} sub={(e) => labelFor(e.category)} />
          </Section>

          {/* Tools & resources */}
          <Section icon={Wrench} title="Tools & Resources" href="/hub/browse" actionLabel="Browse all">
            {list.isLoading ? (
              <div className="grid-3col">{[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 8 }} />)}</div>
            ) : (
              <div className="grid-3col">
                {tools.map((e) => {
                  const site = e.links.find((l) => l.platform === "website") ?? e.links[0];
                  return (
                    <a
                      key={e.id}
                      href={site?.url ?? `/hub/${e.slug}`}
                      target={site ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", textDecoration: "none" }}
                    >
                      <Avatar e={e} size={34} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</div>
                        <div style={{ color: "var(--text-3)", fontSize: 11 }}>{labelFor(e.category)}</div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </Section>
        </>
      )}

      {showAdd && <AddEntryModal onClose={() => setShowAdd(false)} onSubmitted={() => { setShowAdd(false); void list.refetch(); }} />}
    </div>
  );
}

function Section({ icon: Icon, title, href, actionLabel, children }: { icon: LucideIcon; title: string; href: string; actionLabel: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>
          <Icon size={17} color="var(--accent)" /> {title}
        </h2>
        <Link href={href} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>
          {actionLabel} <ArrowRight size={13} />
        </Link>
      </div>
      {children}
    </section>
  );
}

function CreatorRow({ items, loading, sub }: { items: Entry[]; loading: boolean; sub: (e: Entry) => string }) {
  if (loading) return <div className="grid-3col">{[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 8 }} />)}</div>;
  if (items.length === 0) return <Empty text="Nothing here yet." />;
  return (
    <div className="grid-3col">
      {items.map((e) => (
        <Link
          key={e.id}
          href={`/hub/${e.slug}`}
          style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, textDecoration: "none" }}
        >
          <Avatar e={e} size={44} />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "var(--text)", fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</div>
            <div style={{ color: "var(--text-3)", fontSize: 12 }}>{sub(e)}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Avatar({ e, size }: { e: Entry; size: number }) {
  return e.avatarUrl ? (
    <Image src={e.avatarUrl} alt={e.name} width={size} height={size} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <ImageOff size={Math.round(size * 0.5)} color="var(--text-3)" />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 8, padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>{text}</div>;
}
