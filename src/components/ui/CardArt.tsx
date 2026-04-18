"use client";

import { memo } from "react";
import Image from "next/image";

interface CardArtProps {
  cardId: string;
  name: string;
  imageUrl?: string | null;
  w?: number;
  h?: number;
}

/** Card art with real image or deterministic gradient placeholder. */
export const CardArt = memo(function CardArt({ cardId, name, imageUrl, w = 80, h = 112 }: CardArtProps) {
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={name}
        width={w}
        height={h}
        style={{
          borderRadius: 4,
          objectFit: "contain",
          flexShrink: 0,
        }}
      />
    );
  }

  // Deterministic hue from card ID
  let hash = 0;
  for (let i = 0; i < cardId.length; i++) {
    hash = cardId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  const hue2 = (hue + 40) % 360;

  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 4,
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(135deg, hsl(${hue}, 60%, 40%), hsl(${hue2}, 50%, 25%))`,
        border: "1px solid var(--border)",
        boxShadow: "inset 0 0 12px rgba(0,0,0,0.3)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 4,
          borderRadius: 2,
          background:
            "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), transparent 50%), repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.04) 6px, rgba(255,255,255,0.04) 7px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 6,
          left: 6,
          right: 6,
          fontSize: Math.max(7, w * 0.09),
          color: "rgba(255,255,255,0.85)",
          fontFamily: "monospace",
          textAlign: "center",
          letterSpacing: "0.5px",
          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
        }}
      >
        {name.toUpperCase().slice(0, 14)}
      </div>
    </div>
  );
});
