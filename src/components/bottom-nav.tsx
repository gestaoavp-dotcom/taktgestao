"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Wallet,
  TrendingUp,
  FileText,
  ClipboardList,
  MoreHorizontal,
} from "lucide-react";

type Item = { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };

/**
 * The bar at the bottom of a phone.
 *
 * A rail on the left is a desktop idea: on a phone it costs two thirds of the
 * width and sits where no thumb reaches. Five destinations along the bottom
 * is what an app looks like, and what a hand can actually press. The rest of
 * the agency's sections stay one tap away under "Mais", which opens the same
 * drawer the rail became.
 */
const AGENCY: Item[] = [
  { href: "/", label: "Início", icon: LayoutDashboard, exact: true },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { href: "/financas", label: "Finanças", icon: Wallet },
];

const CLIENT_SECTIONS = [
  { segment: "", label: "Início", icon: LayoutDashboard },
  { segment: "vendas", label: "Dados", icon: TrendingUp },
  { segment: "controle", label: "Controle", icon: ClipboardList },
  { segment: "relatorios", label: "Relatórios", icon: FileText },
];

export function BottomNav({ team = true, onMore }: { team?: boolean; onMore: () => void }) {
  const pathname = usePathname();

  const items: Item[] = team
    ? AGENCY
    : (() => {
        const id = pathname.split("/")[2];
        if (!id) return [];
        return CLIENT_SECTIONS.map((s) => ({
          href: s.segment ? `/clientes/${id}/${s.segment}` : `/clientes/${id}`,
          label: s.label,
          icon: s.icon,
          exact: !s.segment,
        }));
      })();

  if (items.length === 0) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-rail lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[11px] font-semibold transition-colors ${
                active ? "text-accent-ink" : "text-ink-3"
              }`}
            >
              {active && (
                <span className="absolute inset-x-3 top-0 h-0.5 rounded-b bg-accent" />
              )}
              <Icon className="h-[22px] w-[22px]" />
              {item.label}
            </Link>
          );
        })}

        {team && (
          <button
            type="button"
            onClick={onMore}
            className="flex flex-1 flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[11px] font-semibold text-ink-3"
          >
            <MoreHorizontal className="h-[22px] w-[22px]" />
            Mais
          </button>
        )}
      </div>
    </nav>
  );
}
