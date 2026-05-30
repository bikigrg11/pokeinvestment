import type { Metadata } from "next";
import "./globals.css";
import { TRPCProvider } from "@/components/providers/TRPCProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://pokeinvestment.vercel.app"),
  title: {
    default: "PokeInvest — Pokémon TCG Investment Analytics",
    template: "%s | PokeInvest",
  },
  description: "Bloomberg Terminal for Pokémon TCG cards. Track prices, discover creators & tools, analyze investments, manage portfolios.",
  openGraph: { siteName: "PokeInvest", type: "website" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <TRPCProvider>{children}</TRPCProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
