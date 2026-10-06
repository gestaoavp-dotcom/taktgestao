"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/financas/resumo", label: "Resumo" },
  { href: "/financas", label: "Contas a receber" },
  { href: "/financas/despesas", label: "Contas a pagar" },
  { href: "/financas/dre", label: "DRE Detalhada" },
];

export function FinancasTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-line">
      {TABS.map((tab) => {
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
