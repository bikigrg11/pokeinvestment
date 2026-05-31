"use client";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center", padding: 24 }}>
      <h1 style={{ fontSize: 20, color: "var(--text)", margin: 0 }}>Something went wrong</h1>
      <p style={{ color: "var(--text-3)", maxWidth: 420, margin: 0, fontSize: 13 }}>
        {error.message || "An unexpected error occurred while loading this page."}
      </p>
      <button
        onClick={reset}
        style={{ background: "var(--accent)", color: "#fff", border: "none", padding: "9px 18px", borderRadius: "var(--radius)", fontWeight: 700, cursor: "pointer" }}
      >
        Try again
      </button>
    </div>
  );
}
