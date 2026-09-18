"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/clientes", label: "Clientes" },
  { href: "/tarefas", label: "Tarefas" },
  { href: "/financas", label: "Finanças" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map((link) => {
        const isActive =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-zinc-600 hover:bg-black/[.04] dark:text-zinc-400 dark:hover:bg-white/[.08]"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
