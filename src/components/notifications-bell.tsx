"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import type { NotificationItem } from "@/lib/notifications";

function formatDueDate(date: string) {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}

const KIND_LABEL: Record<NotificationItem["kind"], string> = {
  receber: "Receber",
  pagar: "Pagar",
};

/** The bell with nothing read yet, which is what the header shows first. */
export function QuietBell() {
  return (
    <span className="block rounded-full p-2 text-ink-2">
      <Bell className="h-5 w-5" />
    </span>
  );
}

/**
 * The agency's own receivables and payables, read while the page is already on
 * screen.
 *
 * Three queries stand behind this, and awaiting them in the layout held back
 * every page under it — about 130 ms on every navigation, to decide whether a
 * dot appears over an icon. The promise arrives unresolved instead and this
 * fills in when it lands.
 */
export function NotificationsBell({
  notifications: promise,
}: {
  notifications: Promise<NotificationItem[]>;
}) {
  const notifications = use(promise);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasOverdue = notifications.some((n) => n.severity === "overdue");

  useEffect(() => {
    if (!open) return;
    function clickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Notificações"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-ink-2 transition-colors hover:bg-panel-2"
      >
        <Bell className="h-5 w-5" />
        {notifications.length > 0 && (
          <span
            className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ${
              hasOverdue ? "bg-danger" : "bg-gold"
            }`}
          />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 overflow-hidden rounded-lg border border-line bg-panel shadow-lg">
          <div className="border-b border-line-soft px-4 py-2.5">
            <p className="text-sm font-semibold text-ink">Notificações</p>
            <p className="text-xs text-ink-3">
              {notifications.length
                ? `${notifications.length} vencimento${notifications.length === 1 ? "" : "s"} próximo${notifications.length === 1 ? "" : "s"} ou atrasado${notifications.length === 1 ? "" : "s"}`
                : "Tudo em dia"}
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-3">
                Nenhum vencimento por perto.
              </p>
            ) : (
              notifications.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-line-soft px-4 py-2.5 last:border-b-0 hover:bg-panel-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="mb-0.5 flex items-center gap-1.5">
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            item.kind === "receber"
                              ? "bg-pos/10 text-pos"
                              : "bg-accent/10 text-accent-ink"
                          }`}
                        >
                          {KIND_LABEL[item.kind]}
                        </span>
                        {item.severity === "overdue" && (
                          <span className="text-[10px] font-semibold text-danger">Atrasado</span>
                        )}
                      </div>
                      <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
                      <p className="truncate text-xs text-ink-3">{item.subtitle}</p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-semibold ${
                        item.severity === "overdue" ? "text-danger" : "text-ink"
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
  );
}
