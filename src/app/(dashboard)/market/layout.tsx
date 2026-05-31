import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Market — Pokémon 250 Index & Top Cards",
  description:
    "Live Pokémon TCG market overview: the Pokémon 250 index, total market cap, and top cards ranked by price and volume.",
};

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
