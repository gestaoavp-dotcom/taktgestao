"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function InformacoesSubTabs({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const base = `/clientes/${clientId}/informacoes`;

  const tabs = [
    { href: base, label: "Dados do cliente" },
    { href: `${base}/acessos`, label: "Acessos" },
  ];

  return (
    <nav className="mb-5 flex gap-1 border-b border-line">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
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
