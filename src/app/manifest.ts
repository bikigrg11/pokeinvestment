import type { MetadataRoute } from "next";

// PWA manifest — makes the app installable + wrappable for the app stores.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PokeInvest — Pokémon TCG Analytics",
    short_name: "PokeInvest",
    description:
      "Track Pokémon card prices, discover creators & tools, and analyze grading and market trends.",
    start_url: "/",
    display: "standalone",
    background_color: "#080d19",
    theme_color: "#6366f1",
    orientation: "portrait",
    categories: ["finance", "entertainment", "shopping"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
