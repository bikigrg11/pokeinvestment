import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How PokeInvest collects, uses, and protects your data.",
};

const WRAP: React.CSSProperties = {
  maxWidth: 760, margin: "0 auto", padding: "48px 20px 80px", color: "var(--text-2)",
  fontSize: 15, lineHeight: 1.7,
};
const H2: React.CSSProperties = { color: "var(--text)", fontSize: 18, fontWeight: 700, margin: "28px 0 8px" };

export default function PrivacyPage() {
  return (
    <main style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
      <div style={WRAP}>
        <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>← PokeInvest</Link>
        <h1 style={{ color: "var(--text)", fontSize: 30, fontWeight: 800, margin: "16px 0 6px" }}>Privacy Policy</h1>
        <p style={{ color: "var(--text-3)", fontSize: 13 }}>Last updated: May 2026</p>

        <p style={{ marginTop: 20 }}>
          PokeInvest (&quot;we&quot;, &quot;us&quot;) operates the website at pokeinvestment.com and any associated mobile app
          (the &quot;Service&quot;). This policy explains what we collect and how we use it.
        </p>

        <h2 style={H2}>Information we collect</h2>
        <ul>
          <li><strong>Account data:</strong> if you create an account, we store your email address and a securely hashed password.</li>
          <li><strong>Usage analytics:</strong> we collect anonymous, aggregated usage data (page views, performance) via Vercel Analytics. This does not identify you and is not used for advertising.</li>
          <li><strong>Submissions:</strong> if you add an entry to the Creator Hub, we store the information you provide (name, links, category) and an anonymized, rotating fingerprint used only to rate-limit spam.</li>
          <li><strong>Local storage:</strong> we store your theme preference (light/dark) in your browser.</li>
        </ul>
        <p>We do <strong>not</strong> sell your personal data, and we do not use cross-site advertising trackers.</p>

        <h2 style={H2}>Third-party services</h2>
        <p>
          We use Vercel (hosting/analytics), Neon (database), the YouTube Data API and pokemontcg.io (public card &amp;
          channel data). These providers process data under their own privacy policies.
        </p>

        <h2 style={H2}>How we use information</h2>
        <p>To operate and improve the Service, authenticate accounts, prevent abuse, and understand aggregate usage. We retain account data until you ask us to delete it.</p>

        <h2 style={H2}>Your rights</h2>
        <p>You may request access to or deletion of your account data by contacting us. To delete your account, email the address below.</p>

        <h2 style={H2}>Children</h2>
        <p>The Service is not directed to children under 13 and we do not knowingly collect their data.</p>

        <h2 style={H2}>Contact</h2>
        <p>Questions about this policy: <strong>support@pokeinvestment.com</strong>.</p>

        <p style={{ marginTop: 28, fontSize: 13, color: "var(--text-3)" }}>
          See also our <Link href="/terms" style={{ color: "var(--accent)" }}>Terms of Use</Link>.
        </p>
      </div>
    </main>
  );
}
