"use client";

import { trpc } from "@/lib/trpc/client";
import { ErrorState } from "@/components/ui/ErrorState";
import { VideoCard, type TrendingVideo } from "@/components/hub/VideoCard";

export default function TrendingVideosPage() {
  const { data, isLoading, isError, refetch } = trpc.creators.trendingVideos.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });
  const videos = (data ?? []) as TrendingVideo[];

  return (
    <div className="main-content" style={{ maxWidth: 1280, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0 }}>Trending Videos</h1>
      <p style={{ color: "var(--text-3)", fontSize: 13, margin: "4px 0 20px" }}>
        The hottest recent uploads across the Pokémon creators we track — ranked by views per day.
      </p>

      {isError ? (
        <ErrorState message="Couldn't load trending videos." onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="hub-cards">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: "16/9", borderRadius: 8 }} />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 8, padding: 40, textAlign: "center", color: "var(--text-3)" }}>
          No trending videos right now — check back soon.
        </div>
      ) : (
        <div className="hub-cards">
          {videos.map((v) => (
            <VideoCard key={v.videoId} v={v} />
          ))}
        </div>
      )}
    </div>
  );
}
