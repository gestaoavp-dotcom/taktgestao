"use client";

import { useState } from "react";
import { Logo } from "@/components/logo";
import { NavLinks } from "@/components/nav-links";
import { Header } from "@/components/header";
import type { NotificationItem } from "@/lib/notifications";

export function DashboardShell({
  email,
  team = true,
  notifications,
  children,
}: {
  email?: string;
  /** False for a client login: the rest of the sidebar is the agency's. */
  team?: boolean;
  notifications: NotificationItem[];
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-brand-gray/50">
      <aside
        className={`flex-shrink-0 overflow-hidden border-r border-navy/[.08] bg-white transition-[width] duration-200 ${
          collapsed ? "w-0" : "w-60"
        }`}
      >
        <div className="w-60 px-4 py-5">
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
          notifications={notifications}
          onToggleSidebar={() => setCollapsed((c) => !c)}
        />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
