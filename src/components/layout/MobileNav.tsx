"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BarChart3,
  LayoutGrid,
  Award,
  Filter,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/market", label: "Market", icon: BarChart3 },
  { href: "/cards", label: "Cards", icon: LayoutGrid },
  { href: "/grading", label: "Grading", icon: Award },
  { href: "/analytics", label: "Screener", icon: Filter },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mobile-nav"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "var(--bg-panel)",
        borderTop: "1px solid var(--border)",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "6px 0 env(safe-area-inset-bottom, 6px)",
        zIndex: 50,
      }}
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
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              padding: "4px 8px",
              color: isActive ? "var(--accent)" : "var(--text-3)",
              textDecoration: "none",
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
