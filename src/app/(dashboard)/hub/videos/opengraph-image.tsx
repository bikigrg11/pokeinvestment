import { brandedOG, OG_SIZE } from "@/lib/og-image";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Trending Pokémon TCG Videos — PokeInvest";

export default function OG() {
  return brandedOG("Trending Pokémon Videos", "The hottest recent uploads across top creators — fresh daily");
}
