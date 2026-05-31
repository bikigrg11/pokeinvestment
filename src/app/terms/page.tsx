import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms governing your use of PokeInvest.",
};

const WRAP: React.CSSProperties = {
  maxWidth: 760, margin: "0 auto", padding: "48px 20px 80px", color: "var(--text-2)",
  fontSize: 15, lineHeight: 1.7,
};
const H2: React.CSSProperties = { color: "var(--text)", fontSize: 18, fontWeight: 700, margin: "28px 0 8px" };

export default function TermsPage() {
  return (
    <main style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
      <div style={WRAP}>
        <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>← PokeInvest</Link>
        <h1 style={{ color: "var(--text)", fontSize: 30, fontWeight: 800, margin: "16px 0 6px" }}>Terms of Use</h1>
        <p style={{ color: "var(--text-3)", fontSize: 13 }}>Last updated: May 2026</p>

        <div style={{ marginTop: 20, padding: 16, background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <strong style={{ color: "var(--text)" }}>Not financial advice.</strong> PokeInvest provides data, analytics, and
          community information about Pokémon trading cards for informational and entertainment purposes only. Nothing on
          the Service is investment, financial, or trading advice. Card values are volatile and may be based on synthetic
          or third-party data. Do your own research; we are not liable for any decisions you make.
        </div>

        <h2 style={H2}>Acceptance</h2>
        <p>By using the Service you agree to these Terms. If you do not agree, do not use the Service.</p>

        <h2 style={H2}>Use of the Service</h2>
        <p>You agree not to misuse the Service, attempt to disrupt it, scrape it abusively, or submit unlawful, infringing, or spam content. We may rate-limit, hide, or remove content and accounts at our discretion.</p>

        <h2 style={H2}>User submissions</h2>
        <p>Creator Hub entries and votes are community-submitted. By submitting, you confirm you have the right to share the information and that it is accurate. We do not endorse listed creators, tools, or marketplaces, and links to third parties are provided for convenience only.</p>

        <h2 style={H2}>Intellectual property</h2>
        <p>Pokémon and related marks are property of their respective owners; we are not affiliated with or endorsed by The Pokémon Company, Nintendo, or any listed marketplace or grader. Card images and data are sourced from public APIs under their terms.</p>

        <h2 style={H2}>Disclaimers &amp; liability</h2>
        <p>The Service is provided &quot;as is&quot; without warranties. To the maximum extent permitted by law, we are not liable for any indirect or consequential damages arising from your use of the Service.</p>

        <h2 style={H2}>Changes</h2>
        <p>We may update these Terms; continued use after changes constitutes acceptance.</p>

        <h2 style={H2}>Contact</h2>
        <p><strong>support@pokeinvestment.com</strong></p>

        <p style={{ marginTop: 28, fontSize: 13, color: "var(--text-3)" }}>
          See also our <Link href="/privacy" style={{ color: "var(--accent)" }}>Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}
