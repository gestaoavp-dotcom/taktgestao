"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MARKETPLACES } from "@/lib/marketplaces";

const SELECT_CLASS =
  "rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-blue";

/**
 * Client and marketplace pickers for the dashboard. They change only their
 * own query parameter, so the period chosen in the date picker stays put.
 */
export function DashboardFilters({
  clients,
  clientId,
  marketplace,
}: {
  clients: { id: string; name: string }[];
  clientId: string;
  marketplace: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function set(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.push(`${pathname}?${params}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Cliente"
        value={clientId}
        onChange={(e) => set("cliente", e.target.value)}
        className={SELECT_CLASS}
      >
        <option value="">Todos os clientes</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        aria-label="Marketplace"
        value={marketplace}
        onChange={(e) => set("platform", e.target.value)}
        className={SELECT_CLASS}
      >
        <option value="">Todos os marketplaces</option>
        {MARKETPLACES.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      {pending && <Loader2 className="h-4 w-4 animate-spin text-[#94A0BD]" />}
    </div>
  );
}
