import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grading — Top PSA 10 Upside Candidates",
  description:
    "The best Pokémon TCG grading plays: cards with the highest PSA 10 premium over raw market price, split by vintage and modern eras.",
};

export default function GradingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
