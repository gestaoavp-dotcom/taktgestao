"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { segment: "", label: "Dashboard" },
  { segment: "vendas", label: "Dados" },
  { segment: "controle", label: "Controle" },
  { segment: "relatorios", label: "Relatórios" },
  { segment: "informacoes", label: "Informações" },
];

export function ClientTabs({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const base = `/clientes/${clientId}`;

  return (
    <nav className="flex gap-1 border-b border-navy/[.08]">
      {TABS.map((tab) => {
        const href = tab.segment ? `${base}/${tab.segment}` : base;
        // Sub-pages keep their tab lit — but the dashboard's own href is a
        // prefix of every other one, so it has to match exactly.
        const isActive = tab.segment ? pathname.startsWith(href) : pathname === href;

        return (
          <Link
            key={tab.label}
            href={href}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              isActive
                ? "border-blue text-blue"
                : "border-transparent text-[#5B647E] hover:text-navy"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
