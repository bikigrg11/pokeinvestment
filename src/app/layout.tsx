import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TRPCProvider } from "@/components/providers/TRPCProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://pokeinvestment.com"),
  applicationName: "PokeInvest",
  title: {
    default: "PokeInvest — Pokémon TCG Investment Analytics",
    template: "%s | PokeInvest",
  },
  description: "Track Pokémon TCG card prices, discover creators, tools & trending videos, and analyze grading and market trends.",
  keywords: ["Pokémon TCG", "card prices", "grading", "PSA", "investment", "creators", "trending videos"],
  openGraph: { siteName: "PokeInvest", type: "website" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "PokeInvest" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fb" },
    { media: "(prefers-color-scheme: dark)", color: "#080d19" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pokeinvest-theme');if(t==='pro'||(!t&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.setAttribute('data-theme','pro');}}catch(e){}})();`,
          }}
        />
        <ThemeProvider>
          <TRPCProvider>{children}</TRPCProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
