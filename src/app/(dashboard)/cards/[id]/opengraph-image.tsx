import { ImageResponse } from "next/og";
import { db } from "@/lib/db";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Pokémon card on PokeInvest";

export default async function OG({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let card: { name: string; imageLarge: string | null; rarity: string | null; set: { name: string } } | null = null;
  try {
    card = await db.card.findUnique({
      where: { id },
      select: { name: true, imageLarge: true, rarity: true, set: { select: { name: true } } },
    });
  } catch {}

  const name = card?.name ?? "Pokémon Card";
  const setName = card?.set?.name ?? "Pokémon TCG";
  const rarity = card?.rarity ?? "";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "linear-gradient(135deg,#080d19,#11172a)", color: "#f1f5f9", fontFamily: "sans-serif", padding: 70, alignItems: "center", gap: 56 }}>
        {card?.imageLarge ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.imageLarge} height={490} style={{ borderRadius: 18 }} alt="" />
        ) : (
          <div style={{ width: 350, height: 490, borderRadius: 18, background: "#1f2940" }} />
        )}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.05 }}>{name}</div>
          <div style={{ fontSize: 30, color: "#94a3b8", marginTop: 14 }}>{rarity ? `${rarity} · ` : ""}{setName}</div>
          <div style={{ fontSize: 26, color: "#94a3b8", marginTop: 36 }}>Live price · PSA 10 value · grading upside</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 28, fontSize: 26, color: "#cbd5e1" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff" }}>P</div>
            PokeInvest
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
