"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function VendasSubTabs({
  clientId,
  team = true,
}: {
  clientId: string;
  /** False for a client login: importing reports is the agency's job. */
  team?: boolean;
}) {
  const pathname = usePathname();
  const base = `/clientes/${clientId}/vendas`;

  const tabs = [
    { href: base, label: "Visão geral" },
    ...(team ? [{ href: `${base}/importar`, label: "Importar documentos" }] : []),
    { href: `${base}/pedidos`, label: "Pedidos" },
    { href: `${base}/produtos`, label: "Produtos" },
    { href: `${base}/custos`, label: "Custos" },
    { href: `${base}/ads`, label: "Ads" },
    { href: `${base}/trafego`, label: "Tráfego" },
  ];

  return (
    <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-line [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4 ${
              isActive
                ? "border-accent text-accent-ink"
                : "border-transparent text-ink-2 hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
