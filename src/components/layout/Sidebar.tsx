"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  Layers,
  Package,
  Briefcase,
  Activity,
  TrendingUp,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/market", label: "Market", icon: TrendingUp },
  { href: "/cards", label: "Cards", icon: Search },
  { href: "/sets", label: "Sets", icon: Layers },
  { href: "/sealed", label: "Sealed", icon: Package },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/analytics", label: "Screener", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-16 lg:w-56 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-slate-800 gap-2">
        <div className="w-7 h-7 rounded bg-amber-400 flex items-center justify-center flex-shrink-0">
          <span className="text-slate-950 font-bold text-xs">P</span>
        </div>
        <span className="hidden lg:block text-sm font-semibold text-slate-100 tracking-wide">
          PokeInvest
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-amber-400/10 text-amber-400"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="hidden lg:block">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-slate-800">
        <div className="hidden lg:block text-xs text-slate-600 text-center">
          v0.1.0
        </div>
      </div>
    </aside>
  );
}
