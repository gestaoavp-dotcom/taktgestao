"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { syncAll } from "@/app/(dashboard)/actions";

function timeInBrazil(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Reads every total again — the consolidated dashboards and each client's. */
export function SyncButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setError(null);
          const result = await syncAll();
          if ("error" in result) {
            setError(result.error);
            return;
          }
          router.refresh();
          setSyncedAt(timeInBrazil(new Date()));
        })
      }
      title={
        error ??
        (syncedAt
          ? `Sincronizado às ${syncedAt}. Gráficos e totais de todos os clientes atualizados.`
          : "Atualiza gráficos e totais de todos os clientes com os dados mais recentes.")
      }
      className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink disabled:opacity-60"
    >
      <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">
        {pending ? "Sincronizando..." : error ? "Falhou" : syncedAt ? `Sincronizado ${syncedAt}` : "Sincronizar"}
      </span>
    </button>
  );
}
