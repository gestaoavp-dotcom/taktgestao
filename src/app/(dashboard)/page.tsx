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
      <h1 className="mb-6 font-display text-2xl font-bold text-navy">Dashboard</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Link
          href="/clientes"
          className="rounded-lg bg-white p-4 shadow-sm transition-colors hover:bg-navy/[.02]"
        >
          <p className="text-sm text-[#5B647E]">Clientes ativos</p>
          <p className="font-display text-2xl font-bold text-navy">{activeClients}</p>
        </Link>
        <Link
          href="/tarefas"
          className="rounded-lg bg-white p-4 shadow-sm transition-colors hover:bg-navy/[.02]"
        >
          <p className="text-sm text-[#5B647E]">Tarefas abertas</p>
          <p className="font-display text-2xl font-bold text-navy">{openTasks.length}</p>
        </Link>
        <Link
          href="/financas"
          className="rounded-lg bg-white p-4 shadow-sm transition-colors hover:bg-navy/[.02]"
        >
          <p className="text-sm text-[#5B647E]">A receber</p>
          <p className="font-display text-2xl font-bold text-green-700">
            {formatCurrency(pendingIncome)}
          </p>
        </Link>
        <Link
          href="/financas"
          className="rounded-lg bg-white p-4 shadow-sm transition-colors hover:bg-navy/[.02]"
        >
          <p className="text-sm text-[#5B647E]">A pagar</p>
          <p className="font-display text-2xl font-bold text-red-700">
            {formatCurrency(pendingExpense)}
          </p>
        </Link>
      </div>

      <div className="rounded-lg bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-navy/[.08] px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-navy">Próximas tarefas</h2>
          <Link href="/tarefas" className="text-xs font-medium text-blue hover:underline">
            Ver todas
          </Link>
        </div>
        <div>
          {nextTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between border-b border-navy/[.08] px-4 py-3 last:border-b-0"
            >
              <div>
                <p className="text-sm text-navy">{task.title}</p>
                <p className="text-xs text-[#94A0BD]">{task.clients?.name ?? "Sem cliente"}</p>
              </div>
              <span className="text-xs text-[#94A0BD]">{task.due_date ?? "Sem prazo"}</span>
            </div>
          ))}
          {!nextTasks.length && (
            <p className="px-4 py-6 text-center text-sm text-[#94A0BD]">
              Nenhuma tarefa aberta.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
