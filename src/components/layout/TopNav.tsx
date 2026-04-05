"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Activity,
  Grid3X3,
  BookOpen,
  Package,
  Briefcase,
  BarChart3,
  Award,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/market", label: "Market", icon: Activity },
  { href: "/cards", label: "Cards", icon: Grid3X3 },
  { href: "/sets", label: "Sets", icon: BookOpen },
  { href: "/sealed", label: "Sealed", icon: Package },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/grading", label: "Grading", icon: Award },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header
      style={{
        borderBottom: "1px solid #1e293b",
        background: "#0a0f1cee",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        padding: "0 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 56,
          maxWidth: 1440,
          margin: "0 auto",
          gap: 8,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 800, color: "#0a0f1c" }}>
              P
            </span>
          </div>
          <span
            className="hide-mobile"
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: "#f1f5f9",
              letterSpacing: "-0.5px",
            }}
          >
            Poké<span style={{ color: "#fbbf24" }}>Investment</span>
          </span>
          <span
            className="hide-mobile"
            style={{
              fontSize: 9,
              color: "#475569",
              background: "#1e293b",
              padding: "2px 6px",
              borderRadius: 3,
              fontWeight: 600,
            }}
          >
            BETA
          </span>
        </div>

        {/* Nav items — scrollable on mobile, labeled on desktop */}
        <nav
          className="nav-scroll"
          style={{ display: "flex", gap: 2, flex: 1, justifyContent: "flex-end" }}
        >
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: isActive ? "#fbbf2415" : "transparent",
                  color: isActive ? "#fbbf24" : "#64748b",
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <Icon size={14} />
                <span className="hide-mobile">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
