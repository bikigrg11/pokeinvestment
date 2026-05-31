import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "PokeInvest — Pokémon TCG Analytics";

export default function OG() {
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
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
          <div style={{ width: 72, height: 72, borderRadius: 16, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, fontWeight: 800, color: "#fff" }}>P</div>
          <div style={{ fontSize: 40, fontWeight: 800 }}>PokeInvest</div>
        </div>
        <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.05, maxWidth: 900 }}>
          The terminal for Pokémon TCG cards & creators
        </div>
        <div style={{ fontSize: 28, color: "#94a3b8", marginTop: 24 }}>
          Prices · Grading · Trending videos · Creator rankings
        </div>
      </div>
    ),
    { ...size }
  );
}
