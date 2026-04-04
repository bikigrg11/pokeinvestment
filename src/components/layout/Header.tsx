"use client";

import { Search, Bell, User } from "lucide-react";

export function Header({ title }: { title?: string }) {
  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-4 sticky top-0 z-10">
      {title && (
        <h1 className="text-sm font-semibold text-slate-100 hidden md:block">{title}</h1>
      )}

      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search cards, sets..."
            className="w-full bg-slate-800 border border-slate-700 rounded-md pl-8 pr-4 py-1.5 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-md transition-colors">
          <Bell size={16} />
        </button>
        <button className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-md transition-colors">
          <User size={16} />
        </button>
      </div>
    </header>
  );
}
