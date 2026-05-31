import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/** Shared branded OG card used by section opengraph-image routes. */
export function brandedOG(title: string, subtitle: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #080d19 0%, #11172a 100%)",
          color: "#f1f5f9",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 30 }}>
          <div style={{ width: 64, height: 64, borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 800, color: "#fff" }}>P</div>
          <div style={{ fontSize: 34, fontWeight: 800 }}>PokeInvest</div>
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05, maxWidth: 960 }}>{title}</div>
        <div style={{ fontSize: 30, color: "#94a3b8", marginTop: 22 }}>{subtitle}</div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
