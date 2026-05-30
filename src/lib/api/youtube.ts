export interface YTChannelStats {
  channelId: string;
  title: string;
  avatarUrl: string | null;
  subscribers: number | null;
  views: number | null;
}

type ParsedChannel =
  | { kind: "id"; value: string }
  | { kind: "handle"; value: string }
  | { kind: "unknown"; value: string };

/** Parse the many forms a user might paste for a YouTube channel into a lookup key. */
export function parseChannelInput(input: string): ParsedChannel {
  const trimmed = input.trim();
  const channelMatch = trimmed.match(/youtube\.com\/channel\/([A-Za-z0-9_-]+)/);
  if (channelMatch) return { kind: "id", value: channelMatch[1] };

  const handleUrl = trimmed.match(/youtube\.com\/@([A-Za-z0-9_.-]+)/);
  if (handleUrl) return { kind: "handle", value: handleUrl[1] };

  if (trimmed.startsWith("@")) return { kind: "handle", value: trimmed.slice(1) };

  if (/^UC[A-Za-z0-9_-]{20,}$/.test(trimmed)) return { kind: "id", value: trimmed };

  return { kind: "unknown", value: trimmed };
}

interface YTApiItem {
  id: string;
  snippet?: { title?: string; thumbnails?: { default?: { url?: string } } };
  statistics?: { subscriberCount?: string; viewCount?: string };
}

const toNum = (s: string | undefined): number | null =>
  s == null || s === "" ? null : Number(s);

function mapItem(item: YTApiItem): YTChannelStats {
  return {
    channelId: item.id,
    title: item.snippet?.title ?? "",
    avatarUrl: item.snippet?.thumbnails?.default?.url ?? null,
    subscribers: toNum(item.statistics?.subscriberCount),
    views: toNum(item.statistics?.viewCount),
  };
}

/**
 * Batch up to 50 channel ids per `channels.list` call (free quota ~1 unit/call).
 * Returns [] if no API key is set so callers degrade gracefully.
 */
export async function fetchYouTubeChannels(ids: string[]): Promise<YTChannelStats[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || ids.length === 0) return [];

  const out: YTChannelStats[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const url =
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics` +
      `&id=${batch.join(",")}&key=${key}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = (await res.json()) as { items?: YTApiItem[] };
    for (const item of data.items ?? []) out.push(mapItem(item));
  }
  return out;
}

/**
 * Resolve a channel by its @handle (e.g. "SomeCreator" from youtube.com/@SomeCreator).
 * `channels.list` accepts `forHandle` directly. Returns null if no key, no match,
 * or on error — callers degrade gracefully (entry saves without Heat tracking).
 */
export async function fetchYouTubeByHandle(handle: string): Promise<YTChannelStats | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || !handle) return null;
  const h = handle.startsWith("@") ? handle.slice(1) : handle;
  const url =
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics` +
    `&forHandle=${encodeURIComponent(h)}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as { items?: YTApiItem[] };
  const item = data.items?.[0];
  return item ? mapItem(item) : null;
}

export interface YTVideo {
  videoId: string;
  title: string;
  thumbnail: string | null;
  publishedAt: string;
}

interface YTPlaylistItem {
  snippet?: {
    title?: string;
    publishedAt?: string;
    resourceId?: { videoId?: string };
    thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
  };
}

/** View counts for a set of video ids (batched 50/call). Returns {} on missing key. */
export async function fetchVideoStats(ids: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || ids.length === 0) return out;
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const url =
      `https://www.googleapis.com/youtube/v3/videos?part=statistics` +
      `&id=${batch.join(",")}&key=${key}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = (await res.json()) as {
      items?: { id: string; statistics?: { viewCount?: string } }[];
    };
    for (const it of data.items ?? []) out.set(it.id, Number(it.statistics?.viewCount ?? 0));
  }
  return out;
}

/**
 * Recent uploads for a channel. A channel's uploads playlist id is its channel
 * id with the "UC" prefix swapped for "UU" — so we skip the extra channels.list
 * lookup and hit playlistItems directly. Returns [] on missing key/error.
 */
export async function fetchRecentVideos(channelId: string, max = 6): Promise<YTVideo[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || !channelId.startsWith("UC")) return [];
  const uploads = "UU" + channelId.slice(2);
  const url =
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet` +
    `&playlistId=${uploads}&maxResults=${max}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: YTPlaylistItem[] };
  return (data.items ?? [])
    .map((it) => ({
      videoId: it.snippet?.resourceId?.videoId ?? "",
      title: it.snippet?.title ?? "",
      thumbnail:
        it.snippet?.thumbnails?.medium?.url ?? it.snippet?.thumbnails?.default?.url ?? null,
      publishedAt: it.snippet?.publishedAt ?? "",
    }))
    .filter((v) => v.videoId);
}
