import { brandedOG, OG_SIZE } from "@/lib/og-image";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Pokémon Creators, Tools & Resources — PokeInvest";

export default function OG() {
  return brandedOG("Pokémon Creators & Tools", "Browse the hobby directory — YouTubers, breakers, grading, marketplaces & more");
}
