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
    for (const item of data.items ?? []) {
      out.push({
        channelId: item.id,
        title: item.snippet?.title ?? "",
        avatarUrl: item.snippet?.thumbnails?.default?.url ?? null,
        subscribers: toNum(item.statistics?.subscriberCount),
        views: toNum(item.statistics?.viewCount),
      });
    }
  }
  return out;
}
