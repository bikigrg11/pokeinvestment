import type { Metadata } from "next";
import "./globals.css";
import { TRPCProvider } from "@/components/providers/TRPCProvider";

export const metadata: Metadata = {
  title: "PokeInvest — Pokémon TCG Investment Analytics",
  description: "Bloomberg Terminal for Pokémon TCG cards. Track prices, analyze investments, manage portfolios.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-200 antialiased">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
