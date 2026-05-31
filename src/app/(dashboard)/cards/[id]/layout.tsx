import type { Metadata } from "next";
import { db } from "@/lib/db";

// Per-card metadata so every card is its own SEO landing page (~20k indexable pages).
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const card = await db.card.findUnique({
      where: { id },
      select: { name: true, rarity: true, cardNumber: true, set: { select: { name: true } } },
    });
    if (!card) return { title: "Card" };
    const set = card.set?.name ?? "Pokémon TCG";
    const rarity = card.rarity ? `${card.rarity} · ` : "";
    return {
      title: `${card.name} — ${set} Price & Grading`,
      description: `${card.name} (${rarity}${set} #${card.cardNumber}) — live market price, PSA 10 value, grading upside, and price history on PokeInvest.`,
      alternates: { canonical: `/cards/${id}` },
      openGraph: {
        title: `${card.name} — ${set}`,
        description: `Live price, PSA 10 value & grading upside for ${card.name}.`,
        type: "website",
      },
    };
  } catch {
    return { title: "Card — PokeInvest" };
  }
}

export default async function CardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let card: { name: string; imageLarge: string | null; prices: { marketPrice: number | null }[] } | null = null;
  try {
    card = await db.card.findUnique({
      where: { id },
      select: { name: true, imageLarge: true, prices: { orderBy: { date: "desc" }, take: 1, select: { marketPrice: true } } },
    });
  } catch {}

  const price = card?.prices?.[0]?.marketPrice ?? null;
  const jsonLd = card
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: card.name,
        category: "Pokémon Trading Card",
        ...(card.imageLarge ? { image: card.imageLarge } : {}),
        ...(price != null
          ? { offers: { "@type": "Offer", priceCurrency: "USD", price: (price / 100).toFixed(2), availability: "https://schema.org/InStock", url: `https://pokeinvestment.com/cards/${id}` } }
          : {}),
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      {children}
    </>
  );
}
