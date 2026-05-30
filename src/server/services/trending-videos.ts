import { db } from "@/lib/db";
import { fetchRecentVideos, fetchVideoStats } from "@/lib/api/youtube";

export interface TrendingVideo {
  videoId: string;
  title: string;
  thumbnail: string | null;
  publishedAt: string;
  views: number;
  channelName: string;
  channelSlug: string;
}

const WINDOW_DAYS = 90; // only consider reasonably recent uploads
const CHANNELS = 15; // top channels by subscribers to pull from
const PER_CHANNEL = 5; // recent uploads per channel
const RETURN = 24;

/**
 * "Trending now" videos across the tracked creators: pull each top channel's
 * recent uploads, fetch their view counts, and rank by recency-weighted views
 * (views per day since publish) within a 90-day window. Read-only YouTube API.
 */
export async function getTrendingVideos(): Promise<TrendingVideo[]> {
  const entries = await db.entry.findMany({
    where: { status: "live", youtubeChannelId: { not: null }, ytSubscribers: { not: null } },
    orderBy: { ytSubscribers: "desc" },
    take: CHANNELS,
    select: { youtubeChannelId: true, name: true, slug: true },
  });
  if (entries.length === 0) return [];

  const perChannel = await Promise.all(
    entries.map(async (e) => {
      const vids = await fetchRecentVideos(e.youtubeChannelId!, PER_CHANNEL);
      return vids.map((v) => ({ ...v, channelName: e.name, channelSlug: e.slug }));
    })
  );

  const now = Date.now();
  const cutoff = now - WINDOW_DAYS * 86_400_000;
  const recent = perChannel
    .flat()
    .filter((v) => v.publishedAt && new Date(v.publishedAt).getTime() >= cutoff);
  if (recent.length === 0) return [];

  const stats = await fetchVideoStats(recent.map((v) => v.videoId));

  return recent
    .map((v) => {
      const views = stats.get(v.videoId) ?? 0;
      const days = Math.max((now - new Date(v.publishedAt).getTime()) / 86_400_000, 0.5);
      return {
        videoId: v.videoId,
        title: v.title,
        thumbnail: v.thumbnail,
        publishedAt: v.publishedAt,
        views,
        channelName: v.channelName,
        channelSlug: v.channelSlug,
        score: views / days,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, RETURN)
    .map(
      (v): TrendingVideo => ({
        videoId: v.videoId,
        title: v.title,
        thumbnail: v.thumbnail,
        publishedAt: v.publishedAt,
        views: v.views,
        channelName: v.channelName,
        channelSlug: v.channelSlug,
      })
    );
}
