import type { Metadata } from "next";
import { db } from "@/lib/db";

const CAT: Record<string, string> = {
  YOUTUBER: "YouTuber", SOCIAL_CREATOR: "Social Creator", STREAMER_BREAKER: "Breaker / Streamer",
  INVESTOR_X: "Investor", PODCAST: "Podcast", MARKETPLACE: "Marketplace", LGS: "Local Game Shop",
  GROUP_BREAK: "Group Break", GRADING: "Grading Service", AUTHENTICATION: "Authentication",
  TOOL_SITE: "Tool", NEWS_BLOG: "News & Info", COMMUNITY: "Community",
};

/** Per-creator metadata so each profile is its own SEO landing page. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  let entry: { name: string; category: string; bio: string | null } | null = null;
  try {
    entry = await db.entry.findUnique({ where: { slug }, select: { name: true, category: true, bio: true } });
  } catch {
    /* DB unavailable — fall through to generic metadata */
  }
  if (!entry) return { title: "Creator Hub" };

  const cat = CAT[entry.category] ?? "Creator";
  const description =
    entry.bio ||
    `${entry.name} — ${cat} in the Pokémon hobby. Links, recent videos, and community ranking on PokeInvest's Creator Hub.`;

  return {
    title: `${entry.name} — Pokémon ${cat}`,
    description,
    openGraph: { title: `${entry.name} — Pokémon ${cat}`, description, type: "profile" },
    alternates: { canonical: `/hub/${slug}` },
  };
}

export default async function EntryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let entry: { name: string; category: string; avatarUrl: string | null; links: { url: string }[] } | null = null;
  try {
    entry = await db.entry.findUnique({
      where: { slug },
      select: { name: true, category: true, avatarUrl: true, links: { select: { url: true } } },
    });
  } catch {}

  const jsonLd = entry
    ? {
        "@context": "https://schema.org",
        "@type": entry.category === "YOUTUBER" || entry.category === "SOCIAL_CREATOR" ? "Person" : "Organization",
        name: entry.name,
        url: `https://pokeinvestment.com/hub/${slug}`,
        ...(entry.avatarUrl ? { image: entry.avatarUrl } : {}),
        ...(entry.links.length ? { sameAs: entry.links.map((l) => l.url) } : {}),
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      {children}
    </>
  );
}
