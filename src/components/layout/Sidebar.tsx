"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BarChart3,
  LayoutGrid,
  Award,
  Filter,
  Layers,
  Package,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/market", label: "Market", icon: BarChart3 },
  { href: "/cards", label: "Cards DB", icon: LayoutGrid },
  { href: "/grading", label: "Grading", icon: Award },
  { href: "/analytics", label: "Screener", icon: Filter },
  { href: "/sets", label: "Sets", icon: Layers },
  { href: "/sealed", label: "Sealed", icon: Package },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 232,
        minHeight: "100vh",
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        background: "var(--bg-panel)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "20px 12px",
        gap: 4,
        flexShrink: 0,
        zIndex: 20,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "4px 8px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius)",
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 18, color: "var(--bg-page)", fontWeight: 800 }}>◆</span>
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              fontWeight: 800,
              color: "var(--text)",
              letterSpacing: "-0.5px",
              lineHeight: 1.1,
            }}
          >
            PokeInvest
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--text-3)",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            TERMINAL v2.4
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: "var(--radius)",
                borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                background: isActive ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent",
                color: isActive ? "var(--accent)" : "var(--text-3)",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                transition: "all 0.15s",
              }}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Market Status Footer */}
      <div
        style={{
          margin: "8px 4px 0",
          padding: "14px 12px",
          background: "var(--bg-panel-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: "var(--text-3)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "1.2px",
            marginBottom: 8,
          }}
        >
          MARKET STATUS
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--pos)",
              display: "inline-block",
              boxShadow: "0 0 6px var(--pos)",
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--pos)" }}>Bullish</span>
        </div>
        <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
          8,240 sales today
        </div>
      </div>
    </aside>
  );
}
