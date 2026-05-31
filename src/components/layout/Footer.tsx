import Link from "next/link";

export function Footer() {
  return (
    <footer
      className="app-footer"
      style={{
        borderTop: "1px solid var(--border)",
        marginTop: 40,
        padding: "20px 24px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        color: "var(--text-3)",
        fontSize: 12,
      }}
    >
      <span>© {new Date().getFullYear()} PokeInvest · Data is informational, not financial advice.</span>
      <nav style={{ display: "flex", gap: 18 }}>
        <Link href="/privacy" style={{ color: "var(--text-3)", textDecoration: "none" }}>Privacy</Link>
        <Link href="/terms" style={{ color: "var(--text-3)", textDecoration: "none" }}>Terms</Link>
        <Link href="/hub/browse" style={{ color: "var(--text-3)", textDecoration: "none" }}>Creators</Link>
      </nav>
    </footer>
  );
}
