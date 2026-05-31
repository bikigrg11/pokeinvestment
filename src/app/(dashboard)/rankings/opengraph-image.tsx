import { brandedOG, OG_SIZE } from "@/lib/og-image";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Top Pokémon Creators — PokeInvest Rankings";

export default function OG() {
  return brandedOG("Top Pokémon Creators", "Ranked by subscribers, community votes & trending Heat");
}
