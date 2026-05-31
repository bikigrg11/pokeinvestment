import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Pokémon Creators, Tools & Resources",
  description:
    "The Pokémon hobby directory — browse YouTubers, breakers, podcasts, grading services, marketplaces, news and tools by category.",
};

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
