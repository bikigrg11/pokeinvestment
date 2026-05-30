"use client";

import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";

export type TrendingVideo = {
  videoId: string;
  title: string;
  thumbnail: string | null;
  publishedAt: string;
  views: number;
  channelName: string;
  channelSlug: string;
};

function fmtViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function VideoCard({ v }: { v: TrendingVideo }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <a
        href={`https://www.youtube.com/watch?v=${v.videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "block", position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", background: "var(--bg-panel-2)" }}
      >
        {v.thumbnail ? (
          <Image src={v.thumbnail} alt={v.title} width={320} height={180} style={{ width: "100%", height: "auto", display: "block" }} />
        ) : (
          <div style={{ width: "100%", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Play size={28} color="var(--text-3)" />
          </div>
        )}
        <span
          style={{
            position: "absolute", bottom: 6, right: 6,
            background: "rgba(0,0,0,0.78)", color: "#fff",
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
            padding: "2px 6px", borderRadius: 4,
          }}
        >
          {fmtViews(v.views)} views
        </span>
      </a>
      <a
        href={`https://www.youtube.com/watch?v=${v.videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 13, fontWeight: 600, color: "var(--text)", textDecoration: "none", lineHeight: 1.35,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}
      >
        {v.title}
      </a>
      <Link href={`/hub/${v.channelSlug}`} style={{ fontSize: 12, color: "var(--text-3)", textDecoration: "none" }}>
        {v.channelName}
      </Link>
    </div>
  );
}
