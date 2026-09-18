"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import { logout } from "@/app/logout/actions";

export function Header({
  email,
  onToggleSidebar,
}: {
  email?: string;
  onToggleSidebar: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initial = email?.[0]?.toUpperCase() ?? "?";

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <header className="flex items-center gap-6 border-b border-navy/[.08] bg-white px-8 py-3.5">
      <button
        type="button"
        aria-label="Alternar menu lateral"
        onClick={onToggleSidebar}
        className="rounded-lg p-2 text-[#5B647E] transition-colors hover:bg-brand-gray"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A0BD]" />
        <input
          type="search"
          placeholder="Buscar..."
          className="w-full rounded-full border border-navy/10 bg-brand-gray/40 py-2 pl-9 pr-3 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue"
        />
      </div>

      <div className="ml-auto flex items-center gap-5">
        <button
          type="button"
          aria-label="Notificações"
          className="relative rounded-full p-2 text-[#5B647E] transition-colors hover:bg-brand-gray"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-yellow" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            className="flex items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-brand-gray"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
              {initial}
            </div>
            <div className="hidden text-left leading-tight sm:block">
              <div className="max-w-[160px] truncate text-sm font-semibold text-navy">
                {email}
              </div>
              <div className="text-xs text-[#94A0BD]">Admin</div>
            </div>
            <ChevronDown className="h-4 w-4 text-[#94A0BD]" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-lg border border-navy/10 bg-white py-1 shadow-lg">
              <form action={logout}>
                <button
                  type="submit"
                  className="w-full px-4 py-2 text-left text-sm font-medium text-navy transition-colors hover:bg-brand-gray"
                >
                  Sair
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
