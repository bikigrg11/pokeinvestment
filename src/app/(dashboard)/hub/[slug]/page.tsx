"use client";

import { useState, useMemo, use } from "react";
import Image from "next/image";
import { ImageOff, ExternalLink, TrendingUp } from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip,
} from "recharts";
import { trpc } from "@/lib/trpc/client";
import { ErrorState } from "@/components/ui/ErrorState";
import { VoteControl } from "@/components/hub/VoteControl";
import { LogCallModal } from "@/components/hub/LogCallModal";
import { ShareButtons } from "@/components/hub/ShareButtons";

const PANEL = { background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 8, padding: 20 };
const LABEL = { fontSize: 13, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.8px" };
const labelFor = (c: string) => c.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());

export default function EntryProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [showLog, setShowLog] = useState(false);

  const { data: entry, isLoading, isError, refetch } = trpc.creators.byId.useQuery({ slug });

  const { data: videos } = trpc.creators.recentVideos.useQuery(
    { channelId: entry?.youtubeChannelId ?? "" },
    { enabled: !!entry?.youtubeChannelId }
  );

  const heatSeries = useMemo(
    () =>
      (entry?.metrics ?? [])
        .filter((m) => m.upvotes7d != null || m.ytSubscribers != null)
        .map((m) => ({
          date: new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          subs: m.ytSubscribers ?? 0,
        })),
    [entry]
  );

  if (isError) {
    return (
      <div className="main-content" style={{ maxWidth: 1000, margin: "0 auto" }}>
        <ErrorState message="Couldn't load this profile." onRetry={() => void refetch()} />
      </div>
    );
  }
  if (isLoading || !entry) {
    return (
      <div className="main-content" style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div className="skeleton" style={{ height: 120, borderRadius: 8, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 240, borderRadius: 8 }} />
      </div>
    );
  }

  return (
    <div className="main-content" style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ ...PANEL, display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
        {entry.avatarUrl ? (
          <Image src={entry.avatarUrl} alt={entry.name} width={64} height={64} style={{ borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ImageOff size={28} color="var(--text-3)" />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0 }}>{entry.name}</h1>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>{labelFor(entry.category)}</div>
          {entry.bio && <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 8 }}>{entry.bio}</p>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>
            {Math.round(entry.heatScore)}
          </span>
          <span style={{ fontSize: 10, color: "var(--text-3)" }}>HEAT</span>
          <VoteControl entryId={entry.id} initialScore={entry.voteScore} />
        </div>
      </div>

      {/* Share */}
      <div style={{ ...PANEL, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: 13, color: "var(--text-2)" }}>Found {entry.name} here? Share the profile.</span>
        <ShareButtons url={`https://pokeinvestment.com/hub/${slug}`} title={`${entry.name} — Pokémon Creator Hub`} />
      </div>

      {/* Links */}
      {entry.links.length > 0 && (
        <div style={{ ...PANEL, marginBottom: 16 }}>
          <div style={LABEL}>Links</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
            {entry.links.map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 12px", color: "var(--text-2)", fontSize: 13, textDecoration: "none" }}
              >
                {l.platform} <ExternalLink size={12} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Recent videos (YouTube) */}
      {entry.youtubeChannelId && videos && videos.length > 0 && (
        <div style={{ ...PANEL, marginBottom: 16 }}>
          <div style={LABEL}>Recent videos</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginTop: 12 }}>
            {videos.map((v) => (
              <a
                key={v.videoId}
                href={`https://www.youtube.com/watch?v=${v.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                {v.thumbnail && (
                  <Image
                    src={v.thumbnail}
                    alt={v.title}
                    width={320}
                    height={180}
                    style={{ width: "100%", height: "auto", borderRadius: 6, border: "1px solid var(--border)" }}
                  />
                )}
                <div
                  style={{
                    fontSize: 12, color: "var(--text-2)", marginTop: 6, lineHeight: 1.35,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}
                >
                  {v.title}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Heat / subscriber trend */}
      <div style={{ ...PANEL, marginBottom: 16 }}>
        <div style={LABEL}>Subscriber trend</div>
        {heatSeries.length >= 2 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={heatSeries}>
              {/* Recharts sets stroke/fill as SVG attributes where var() doesn't resolve — use literals that read on both themes. */}
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <RTooltip contentStyle={{ background: "var(--bg-panel-2)", border: "1px solid var(--border)" }} />
              <Area type="monotone" dataKey="subs" stroke="#6366f1" fill="rgba(99,102,241,0.18)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 12 }}>
            Not enough history yet — trend builds as the daily sync runs.
          </p>
        )}
      </div>

      {/* Calls */}
      <div style={PANEL}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={LABEL}>Cards covered</div>
          <button
            onClick={() => setShowLog(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 12px", color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            <TrendingUp size={13} /> Log a call
          </button>
        </div>
        {entry.calls.length === 0 ? (
          <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 12 }}>No calls logged yet.</p>
        ) : (
          <div style={{ marginTop: 12 }}>
            {entry.calls.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                {c.card.imageSmall ? (
                  <Image src={c.card.imageSmall} alt={c.card.name} width={28} height={39} style={{ objectFit: "contain" }} />
                ) : (
                  <div style={{ width: 28, height: 39, background: "var(--border)", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ImageOff size={14} color="var(--text-3)" />
                  </div>
                )}
                <span style={{ color: "var(--text)", fontSize: 13, flex: 1 }}>{c.card.name}</span>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                  {new Date(c.calledAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showLog && (
        <LogCallModal entryId={entry.id} onClose={() => setShowLog(false)} onLogged={() => { setShowLog(false); void refetch(); }} />
      )}
    </div>
  );
}
