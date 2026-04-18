"use client";

import { Search, Bell, User } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

export function Header() {
  const { theme, toggle } = useTheme();

  return (
    <header
      style={{
        height: 52,
        background: "var(--bg-panel)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "0 28px",
        gap: 16,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Search */}
      <div style={{ flex: 1, maxWidth: 420 }}>
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
            placeholder="Search cards, sets, players..."
            style={{
              width: "100%",
              background: "var(--bg-panel-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              paddingLeft: 34,
              paddingRight: 14,
              paddingTop: 7,
              paddingBottom: 7,
              fontSize: 13,
              color: "var(--text)",
              outline: "none",
              fontFamily: "var(--font-body)",
            }}
          />
        </div>
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
        {/* Index ticker */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600 }}>Pokémon 250</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
            2,847
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--pos)" }}>+1.2%</span>
        </div>

        {/* Theme toggle */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-panel-2)",
            border: "1px solid var(--border)",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <button
            onClick={theme === "pro" ? toggle : undefined}
            style={{
              padding: "4px 12px",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              border: "none",
              cursor: "pointer",
              borderRadius: 999,
              background: theme === "day" ? "var(--accent)" : "transparent",
              color: theme === "day" ? "#ffffff" : "var(--text-3)",
              transition: "all 0.15s",
            }}
          >
            Day
          </button>
          <button
            onClick={theme === "day" ? toggle : undefined}
            style={{
              padding: "4px 12px",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              border: "none",
              cursor: "pointer",
              borderRadius: 999,
              background: theme === "pro" ? "var(--accent)" : "transparent",
              color: theme === "pro" ? "var(--bg-page)" : "var(--text-3)",
              transition: "all 0.15s",
            }}
          >
            Pro
          </button>
        </div>

        {/* Notifications */}
        <button
          style={{
            position: "relative",
            padding: 6,
            color: "var(--text-3)",
            background: "none",
            border: "none",
            cursor: "pointer",
            borderRadius: 8,
          }}
        >
          <Bell size={16} />
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--neg)",
            }}
          />
        </button>

        {/* Avatar */}
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "var(--bg-panel-2)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <User size={14} style={{ color: "var(--text-3)" }} />
        </div>
      </div>
    </header>
  );
}
