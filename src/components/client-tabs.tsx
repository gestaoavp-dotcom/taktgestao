"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { segment: "", label: "Dashboard" },
  { segment: "informacoes", label: "Informações" },
  { segment: "vendas", label: "Dados" },
  { segment: "controle", label: "Controle" },
  { segment: "links", label: "Links" },
  { segment: "relatorios", label: "Relatórios" },
];

export function ClientTabs({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const base = `/clientes/${clientId}`;

  return (
    <nav className="flex gap-1 border-b border-navy/[.08]">
      {TABS.map((tab) => {
        const href = tab.segment ? `${base}/${tab.segment}` : base;
        const isActive = pathname === href;

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
