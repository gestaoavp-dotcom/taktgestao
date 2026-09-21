"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/financas/resumo", label: "Resumo" },
  { href: "/financas", label: "Contas a receber" },
  { href: "/financas/despesas", label: "Contas a pagar" },
  { href: "/financas/margem", label: "Margem" },
];

export function FinancasTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-navy/[.08]">
      {TABS.map((tab) => {
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
