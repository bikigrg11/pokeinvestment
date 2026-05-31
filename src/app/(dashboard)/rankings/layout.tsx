import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rankings — Top Pokémon Creators",
  description:
    "Leaderboard of Pokémon hobby creators & resources ranked by subscribers, community votes, and trending Heat.",
};

export default function RankingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
