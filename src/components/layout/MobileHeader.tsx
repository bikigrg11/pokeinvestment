"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function MobileHeader() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  return (
    <header
      className="mobile-header"
      style={{
        background: "var(--bg-panel)",
        borderBottom: "1px solid var(--border)",
        padding: "10px 12px",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Top row: logo + app name */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "var(--radius)",
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 15, color: "var(--bg-page)", fontWeight: 800 }}>◆</span>
        </div>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 17,
            fontWeight: 800,
            color: "var(--text)",
            letterSpacing: "-0.5px",
          }}
        >
          PokeInvest
        </span>
        <span
          style={{
            fontSize: 9,
            color: "var(--text-3)",
            background: "var(--bg-panel-2)",
            border: "1px solid var(--border)",
            padding: "2px 6px",
            borderRadius: 3,
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          TERMINAL
        </span>
      </div>

      {/* Search bar */}
      <div style={{ position: "relative" }}>
        <Search
          size={14}
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--muted)",
          }}
        />
        <input
          type="text"
          placeholder="Search cards, sets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && search.trim()) {
              router.push(`/cards?q=${encodeURIComponent(search.trim())}`);
              setSearch("");
            }
          }}
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "var(--bg-panel-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            paddingLeft: 34,
            paddingRight: 14,
            paddingTop: 8,
            paddingBottom: 8,
            fontSize: 13,
            color: "var(--text)",
            outline: "none",
            fontFamily: "var(--font-body)",
          }}
        />
      </div>
    </header>
  );
}
