import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Client, FinanceEntry, Task } from "@/lib/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: clients }, { data: tasks }, { data: entries }] = await Promise.all([
    supabase.from("clients").select("*").returns<Client[]>(),
    supabase
      .from("tasks")
      .select("*, clients(name)")
      .order("due_date", { ascending: true })
      .returns<(Task & { clients: { name: string } | null })[]>(),
    supabase.from("finance_entries").select("*").returns<FinanceEntry[]>(),
  ]);

  const activeClients = clients?.filter((c) => c.status === "active").length ?? 0;
  const openTasks = tasks?.filter((t) => t.status !== "done") ?? [];
  const pendingIncome =
    entries
      ?.filter((e) => e.type === "income" && e.status === "pending")
      .reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;
  const pendingExpense =
    entries
      ?.filter((e) => e.type === "expense" && e.status === "pending")
      .reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;

  const nextTasks = openTasks.slice(0, 5);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
        Dashboard
      </h1>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Link
          href="/clientes"
          className="rounded-lg border border-black/[.08] p-4 transition-colors hover:bg-black/[.02] dark:border-white/[.145] dark:hover:bg-white/[.04]"
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Clientes ativos</p>
          <p className="text-2xl font-semibold text-black dark:text-zinc-50">
            {activeClients}
          </p>
        </Link>
        <Link
          href="/tarefas"
          className="rounded-lg border border-black/[.08] p-4 transition-colors hover:bg-black/[.02] dark:border-white/[.145] dark:hover:bg-white/[.04]"
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Tarefas abertas</p>
          <p className="text-2xl font-semibold text-black dark:text-zinc-50">
            {openTasks.length}
          </p>
        </Link>
        <Link
          href="/financas"
          className="rounded-lg border border-black/[.08] p-4 transition-colors hover:bg-black/[.02] dark:border-white/[.145] dark:hover:bg-white/[.04]"
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">A receber</p>
          <p className="text-2xl font-semibold text-green-700 dark:text-green-400">
            {formatCurrency(pendingIncome)}
          </p>
        </Link>
        <Link
          href="/financas"
          className="rounded-lg border border-black/[.08] p-4 transition-colors hover:bg-black/[.02] dark:border-white/[.145] dark:hover:bg-white/[.04]"
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">A pagar</p>
          <p className="text-2xl font-semibold text-red-700 dark:text-red-400">
            {formatCurrency(pendingExpense)}
          </p>
        </Link>
      </div>

      <div className="rounded-lg border border-black/[.08] dark:border-white/[.145]">
        <div className="flex items-center justify-between border-b border-black/[.08] px-4 py-3 dark:border-white/[.145]">
          <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
            Próximas tarefas
          </h2>
          <Link
            href="/tarefas"
            className="text-xs font-medium text-zinc-600 hover:underline dark:text-zinc-400"
          >
            Ver todas
          </Link>
        </div>
        <div>
          {nextTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between border-b border-black/[.08] px-4 py-3 last:border-b-0 dark:border-white/[.145]"
            >
              <div>
                <p className="text-sm text-black dark:text-zinc-50">{task.title}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {task.clients?.name ?? "Sem cliente"}
                </p>
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {task.due_date ?? "Sem prazo"}
              </span>
            </div>
          ))}
          {!nextTasks.length && (
            <p className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Nenhuma tarefa aberta.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
