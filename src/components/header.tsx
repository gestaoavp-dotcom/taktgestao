"use client";

import { Suspense } from "react";
import { LogOut, Menu, Search } from "lucide-react";
import { logout } from "@/app/logout/actions";
import { SyncButton } from "@/components/sync-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsBell, QuietBell } from "@/components/notifications-bell";
import type { NotificationItem } from "@/lib/notifications";

export function Header({
  email,
  roleLabel,
  showNotifications,
  notifications,
  onToggleSidebar,
}: {
  email?: string;
  roleLabel: string;
  showNotifications: boolean;
  notifications: Promise<NotificationItem[]>;
  onToggleSidebar?: () => void;
}) {
  const initial = email?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="flex items-center gap-6 border-b border-line bg-panel px-8 py-3.5">
      <button
        type="button"
        aria-label="Alternar menu lateral"
        onClick={onToggleSidebar}
        className="rounded-lg p-2 text-ink-2 transition-colors hover:bg-panel-2"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
        <input
          type="search"
          placeholder="Buscar..."
          className="w-full rounded-full border border-line bg-panel-2/40 py-2 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent"
        />
      </div>

      <div className="ml-auto flex items-center gap-5">
        <ThemeToggle />
        {/* The team's: a client login only ever looks at its own folder. */}
        {showNotifications && <SyncButton />}

        {showNotifications && (
          <Suspense fallback={<QuietBell />}>
            <NotificationsBell notifications={notifications} />
          </Suspense>
        )}

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-action text-sm font-bold text-on-accent">
            {initial}
          </div>
          <div className="hidden leading-tight sm:block">
            <div className="max-w-[160px] truncate text-sm font-semibold text-ink">{email}</div>
            <div className="text-xs text-ink-3">{roleLabel}</div>
          </div>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
