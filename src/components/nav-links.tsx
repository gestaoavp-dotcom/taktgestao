"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Wallet,
  TrendingUp,
  Settings,
  Inbox,
} from "lucide-react";

// `client` marks what a client login sees: its own folder under Clientes, and
// nothing else of the agency's.
const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users, client: true },
  { href: "/leads", label: "Leads", icon: Inbox },
  { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { href: "/financas", label: "Finanças", icon: Wallet },
  { href: "/vendas", label: "Vendas", icon: TrendingUp },
];

/** Shown apart from the rest: it is about the system, not about the work. */
const SETTINGS = { href: "/configuracoes", label: "Configurações", icon: Settings };

export function NavLinks({ team = true }: { team?: boolean }) {
  const pathname = usePathname();

  const render = (link: { href: string; label: string; icon: typeof LayoutDashboard }) => {
    const isActive =
      link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
    const Icon = link.icon;

    return (
      <Link
        key={link.href}
        href={link.href}
        className={`relative flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
          isActive ? "bg-blue text-white" : "text-[#5B647E] hover:bg-brand-gray/60"
        }`}
      >
        {isActive && (
          <span className="absolute -left-4 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r bg-blue" />
        )}
        <Icon className="h-[18px] w-[18px]" />
        {link.label}
      </Link>
    );
  };

  return (
    <nav className="flex flex-col gap-1">
      {LINKS.filter((l) => team || l.client).map(render)}

      {team && (
        <>
          <div className="my-2 border-t border-navy/[.08]" />
          {render(SETTINGS)}
        </>
      )}
    </nav>
  );
}

