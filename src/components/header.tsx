"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import { Logo } from "@/components/logo";
import { logout } from "@/app/logout/actions";
import type { NotificationItem } from "@/lib/notifications";

function formatDueDate(date: string) {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}

const KIND_LABEL: Record<NotificationItem["kind"], string> = {
  receber: "Receber",
  pagar: "Pagar",
};

export function Header({
  email,
  notifications,
  onToggleSidebar,
  brand = false,
}: {
  email?: string;
  notifications: NotificationItem[];
  onToggleSidebar?: () => void;
  /** Shows the mark in place of the sidebar toggle, when there is no sidebar. */
  brand?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const initial = email?.[0]?.toUpperCase() ?? "?";
  const hasOverdue = notifications.some((n) => n.severity === "overdue");

  useEffect(() => {
    if (!menuOpen && !notifOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen, notifOpen]);

  return (
    <header className="flex items-center gap-6 border-b border-navy/[.08] bg-white px-8 py-3.5">
      {brand ? (
        <Logo height={30} />
      ) : (
        <button
          type="button"
          aria-label="Alternar menu lateral"
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-[#5B647E] transition-colors hover:bg-brand-gray"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A0BD]" />
        <input
          type="search"
          placeholder="Buscar..."
          className="w-full rounded-full border border-navy/10 bg-brand-gray/40 py-2 pl-9 pr-3 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue"
        />
      </div>

      <div className="ml-auto flex items-center gap-5">
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            aria-label="Notificações"
            aria-expanded={notifOpen}
            onClick={() => setNotifOpen((open) => !open)}
            className="relative rounded-full p-2 text-[#5B647E] transition-colors hover:bg-brand-gray"
          >
            <Bell className="h-5 w-5" />
            {notifications.length > 0 && (
              <span
                className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ${
                  hasOverdue ? "bg-red-600" : "bg-yellow"
                }`}
              />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 w-80 overflow-hidden rounded-lg border border-navy/10 bg-white shadow-lg">
              <div className="border-b border-navy/[.06] px-4 py-2.5">
                <p className="text-sm font-semibold text-navy">Notificações</p>
                <p className="text-xs text-[#94A0BD]">
                  {notifications.length
                    ? `${notifications.length} vencimento${notifications.length === 1 ? "" : "s"} próximo${notifications.length === 1 ? "" : "s"} ou atrasado${notifications.length === 1 ? "" : "s"}`
                    : "Tudo em dia"}
                </p>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-[#94A0BD]">
                    Nenhum vencimento por perto.
                  </p>
                ) : (
                  notifications.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setNotifOpen(false)}
                      className="block border-b border-navy/[.04] px-4 py-2.5 last:border-b-0 hover:bg-brand-gray"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="mb-0.5 flex items-center gap-1.5">
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                item.kind === "receber"
                                  ? "bg-green-50 text-green-700"
                                  : "bg-blue/10 text-blue"
                              }`}
                            >
                              {KIND_LABEL[item.kind]}
                            </span>
                            {item.severity === "overdue" && (
                              <span className="text-[10px] font-semibold text-red-700">
                                Atrasado
                              </span>
                            )}
                          </div>
                          <p className="truncate text-sm font-semibold text-navy">{item.title}</p>
                          <p className="truncate text-xs text-[#94A0BD]">{item.subtitle}</p>
                        </div>
                        <span
                          className={`shrink-0 text-xs font-semibold ${
                            item.severity === "overdue" ? "text-red-700" : "text-navy"
                          }`}
                        >
                          {formatDueDate(item.dueDate)}
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
