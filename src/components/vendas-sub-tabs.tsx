"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function VendasSubTabs({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const base = `/clientes/${clientId}/vendas`;

  const tabs = [
    { href: base, label: "Visão geral" },
    { href: `${base}/importar`, label: "Importar documentos" },
    { href: `${base}/pedidos`, label: "Pedidos" },
  ];

  return (
    <nav className="mb-5 flex gap-1 border-b border-navy/[.08]">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
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
