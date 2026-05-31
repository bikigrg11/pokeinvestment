import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-page)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        textAlign: "center",
        padding: 24,
      }}
    >
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 72, fontWeight: 800, color: "var(--accent)", lineHeight: 1 }}>404</div>
      <h1 style={{ fontSize: 22, color: "var(--text)", margin: 0 }}>Page not found</h1>
      <p style={{ color: "var(--text-3)", maxWidth: 400, margin: 0 }}>
        That page doesn&apos;t exist or has moved. Let&apos;s get you back on track.
      </p>
      <Link
        href="/"
        style={{ background: "var(--accent)", color: "#fff", padding: "10px 20px", borderRadius: "var(--radius)", textDecoration: "none", fontWeight: 700, marginTop: 4 }}
      >
        ← Back to Dashboard
      </Link>
    </div>
  );
}
