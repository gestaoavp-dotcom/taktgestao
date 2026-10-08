"use client";

import { useState } from "react";
import { Logo } from "@/components/logo";
import { NavLinks } from "@/components/nav-links";
import { Header } from "@/components/header";
import type { NotificationItem } from "@/lib/notifications";

export function DashboardShell({
  email,
  roleLabel,
  team = true,
  notifications,
  children,
}: {
  email?: string;
  roleLabel: string;
  /** False for a client login: the rest of the sidebar is the agency's. */
  team?: boolean;
  notifications: Promise<NotificationItem[]>;
  children: React.ReactNode;
}) {
  // Two meanings for one button. On a wide screen the rail is furniture and
  // collapsing it is a preference; on a phone it is 240 of 375 pixels, so it
  // starts away and slides over the page when asked for.
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);

  return (
    <div className="glow flex min-h-screen bg-surface">
      {drawer && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setDrawer(false)}
          className="fixed inset-0 z-30 bg-scrim lg:hidden"
        />
      )}

      <aside
        className={`z-40 flex-shrink-0 overflow-hidden border-r border-line bg-rail transition-transform duration-200 max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:w-60 lg:transition-[width] ${
          drawer ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"
        } ${collapsed ? "lg:w-0" : "lg:w-60"}`}
      >
        {/* Tapping a link is the end of the drawer's job. */}
        <div className="w-60 px-4 py-5" onClick={() => setDrawer(false)}>
          <div className="mb-8 px-2">
            <Logo height={34} />
          </div>
          <NavLinks team={team} />
        </div>
      </aside>

      {/* min-w-0 keeps wide tables scrolling inside their own box instead of
          stretching the page sideways when the sidebar is open. */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Header
          email={email}
          roleLabel={roleLabel}
          showNotifications={team}
          notifications={notifications}
          onToggleSidebar={() => {
            setCollapsed((c) => !c);
            setDrawer((d) => !d);
          }}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
