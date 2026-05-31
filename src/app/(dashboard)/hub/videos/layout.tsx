import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trending Pokémon TCG Videos",
  description:
    "The hottest recent Pokémon TCG videos across top creators, ranked by views per day. Fresh daily.",
};

export default function VideosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
