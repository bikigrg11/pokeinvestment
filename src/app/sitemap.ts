import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

const BASE = "https://pokeinvestment.com";

/** Sitemap so search engines index every creator/resource profile + key pages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = [
    "", "/hub", "/hub/browse", "/hub/videos", "/rankings",
    "/market", "/cards", "/sets", "/sealed", "/grading", "/analytics",
  ];

  let entries: { slug: string; updatedAt: Date }[] = [];
  try {
    entries = await db.entry.findMany({
      where: { status: "live" },
      select: { slug: true, updatedAt: true },
    });
  } catch {
    // DB unavailable at build/runtime — still return the static map.
  }

  return [
    ...staticPaths.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "daily" as const,
      priority: p === "" ? 1 : 0.7,
    })),
    ...entries.map((e) => ({
      url: `${BASE}/hub/${e.slug}`,
      lastModified: e.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
