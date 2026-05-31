import { ImageResponse } from "next/og";
import { db } from "@/lib/db";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Pokémon creator on PokeInvest";

const CAT: Record<string, string> = {
  YOUTUBER: "YouTuber", SOCIAL_CREATOR: "Social Creator", STREAMER_BREAKER: "Breaker / Streamer",
  INVESTOR_X: "Investor", PODCAST: "Podcast", MARKETPLACE: "Marketplace", LGS: "Local Game Shop",
  GROUP_BREAK: "Group Break", GRADING: "Grading Service", AUTHENTICATION: "Authentication",
  TOOL_SITE: "Tool", NEWS_BLOG: "News & Info", COMMUNITY: "Community",
};
function fmtSubs(n: number | null): string | null {
  if (n == null) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M subscribers`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K subscribers`;
  return `${n} subscribers`;
}

export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let entry: { name: string; category: string; avatarUrl: string | null; ytSubscribers: number | null } | null = null;
  try {
    entry = await db.entry.findUnique({ where: { slug }, select: { name: true, category: true, avatarUrl: true, ytSubscribers: true } });
  } catch {}
  const name = entry?.name ?? "Creator Hub";
  const cat = entry ? CAT[entry.category] ?? "Creator" : "Pokémon hobby";
  const subs = fmtSubs(entry?.ytSubscribers ?? null);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "linear-gradient(135deg,#080d19,#11172a)", color: "#f1f5f9", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          {entry?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entry.avatarUrl} width={200} height={200} style={{ borderRadius: 100, objectFit: "cover" }} alt="" />
          ) : (
            <div style={{ width: 200, height: 200, borderRadius: 100, background: "#1f2940", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80, fontWeight: 800 }}>?</div>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05, maxWidth: 760 }}>{name}</div>
            <div style={{ fontSize: 30, color: "#94a3b8", marginTop: 12 }}>{cat}{subs ? ` · ${subs}` : ""}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, color: "#94a3b8" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff" }}>P</div>
          PokeInvest · Creator Hub
        </div>
      </div>
    ),
    { ...size }
  );
}
