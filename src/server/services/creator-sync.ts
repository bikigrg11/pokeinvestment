import { db } from "@/lib/db";
import { fetchYouTubeChannels } from "@/lib/api/youtube";
import { computeHeatScores, type HeatInput } from "./creator-heat";

export interface CreatorSyncResult {
  entriesProcessed: number;
  channelsFetched: number;
}

/**
 * Daily creator sync: pull YouTube stats for entries with a channel, snapshot an
 * EntryMetric row, then recompute every live entry's heatScore from the latest
 * metrics + 7-day vote velocity. Idempotent per UTC day (EntryMetric upsert).
 */
export async function runCreatorSync(): Promise<CreatorSyncResult> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  const entries = await db.entry.findMany({
    where: { status: "live" },
    select: { id: true, youtubeChannelId: true },
  });

  // 1. Fetch YouTube stats for entries that have a channel id.
  const channelIds = entries
    .map((e) => e.youtubeChannelId)
    .filter((id): id is string => !!id);
  const stats = await fetchYouTubeChannels(channelIds);
  const statByChannel = new Map(stats.map((s) => [s.channelId, s]));

  // 2. Compute 7-day vote velocity per entry (net up-votes in window).
  const recentVotes = await db.entryVote.groupBy({
    by: ["entryId"],
    where: { createdAt: { gte: weekAgo } },
    _sum: { value: true },
  });
  const voteVelByEntry = new Map(
    recentVotes.map((v) => [v.entryId, v._sum.value ?? 0])
  );

  // 3. Snapshot today's EntryMetric + gather Heat inputs.
  const heatInputs: HeatInput[] = [];
  for (const e of entries) {
    const s = e.youtubeChannelId ? statByChannel.get(e.youtubeChannelId) : undefined;

    // 7-day-ago subscriber count for growth (null if we lack history).
    const prior = await db.entryMetric.findFirst({
      where: { entryId: e.id, date: { lte: weekAgo } },
      orderBy: { date: "desc" },
    });
    const ytGrowth7d =
      s?.subscribers != null && prior?.ytSubscribers != null && prior.ytSubscribers > 0
        ? (s.subscribers - prior.ytSubscribers) / prior.ytSubscribers
        : null;

    const upvoteVel7d = voteVelByEntry.get(e.id) ?? 0;
    const views7d = 0; // on-platform view tracking not yet implemented (Phase 1)

    await db.entryMetric.upsert({
      where: { entryId_date: { entryId: e.id, date: today } },
      update: {
        ytSubscribers: s?.subscribers ?? null,
        ytViews: s?.views != null ? BigInt(s.views) : null,
        upvotes7d: upvoteVel7d,
        views7d,
      },
      create: {
        entryId: e.id,
        date: today,
        ytSubscribers: s?.subscribers ?? null,
        ytViews: s?.views != null ? BigInt(s.views) : null,
        upvotes7d: upvoteVel7d,
        views7d,
      },
    });

    heatInputs.push({ entryId: e.id, ytGrowth7d, upvoteVel7d, viewVel7d: views7d });

    // Keep denormalized subscriber count fresh on the Entry too.
    if (s?.subscribers != null) {
      await db.entry.update({
        where: { id: e.id },
        data: { ytSubscribers: s.subscribers },
      });
    }
  }

  // 4. Recompute + persist heat scores.
  const heat = computeHeatScores(heatInputs);
  for (const [entryId, score] of heat) {
    await db.entry.update({ where: { id: entryId }, data: { heatScore: score } });
  }

  return { entriesProcessed: entries.length, channelsFetched: stats.length };
}
