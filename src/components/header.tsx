"use client";

import { Bell, Search } from "lucide-react";

export function Header({ email }: { email?: string }) {
  const initial = email?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="flex items-center justify-between border-b border-navy/[.08] bg-white px-8 py-4">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A0BD]" />
        <input
          type="search"
          placeholder="Buscar..."
          className="w-full rounded-lg border border-navy/10 bg-brand-gray/50 py-2 pl-9 pr-3 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue"
        />
      </div>

      <div className="flex items-center gap-5">
        <button
          type="button"
          aria-label="Notificações"
          className="relative rounded-full p-2 text-[#5B647E] transition-colors hover:bg-brand-gray"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-yellow" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy font-display text-sm font-semibold text-white">
            {initial}
          </div>
          <div className="hidden leading-tight sm:block">
            <div className="max-w-[160px] truncate text-sm font-medium text-navy">
              {email}
            </div>
            <div className="text-xs text-[#94A0BD]">Admin</div>
          </div>
        </div>
      </div>
    </header>
  );
}
