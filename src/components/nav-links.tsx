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
  FileText,
  ClipboardList,
} from "lucide-react";

type Item = { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };

const AGENCY: Item[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/leads", label: "Leads", icon: Inbox },
  { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { href: "/financas", label: "Finanças", icon: Wallet },
  { href: "/vendas", label: "Vendas", icon: TrendingUp },
];

/** Shown apart from the rest: it is about the system, not about the work. */
const SETTINGS: Item = { href: "/configuracoes", label: "Configurações", icon: Settings };

/**
 * A client login sees one folder, so the sections inside that folder are its
 * whole navigation and belong here rather than in a strip of tabs. The team
 * keeps the tabs: for them a folder is one of many, and the rail is the map
 * between them.
 */
const CLIENT_SECTIONS = [
  { segment: "", label: "Dashboard", icon: LayoutDashboard },
  { segment: "vendas", label: "Dados", icon: TrendingUp },
  { segment: "controle", label: "Controle", icon: ClipboardList },
  { segment: "relatorios", label: "Relatórios", icon: FileText },
];

export function NavLinks({ team = true }: { team?: boolean }) {
  const pathname = usePathname();

  const render = (link: Item) => {
    const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);
    const Icon = link.icon;

    return (
      <Link
        key={link.href}
        href={link.href}
        className={`relative flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
          isActive ? "bg-accent text-on-accent" : "text-ink-2 hover:bg-panel-2/60"
        }`}
      >
        {isActive && (
          <span className="absolute -left-4 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r bg-accent" />
        )}
        <Icon className="h-[18px] w-[18px]" />
        {link.label}
      </Link>
    );
  };

  if (!team) {
    // The middleware keeps a client inside its own folder, so the id is here.
    const id = pathname.split("/")[2];
    if (!id) return null;
    return (
      <nav className="flex flex-col gap-1">
        {CLIENT_SECTIONS.map((section) =>
          render({
            href: section.segment ? `/clientes/${id}/${section.segment}` : `/clientes/${id}`,
            label: section.label,
            icon: section.icon,
            exact: !section.segment,
          }),
        )}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-1">
      {AGENCY.map(render)}
      <div className="my-2 border-t border-line" />
      {render(SETTINGS)}
    </nav>
  );
}
