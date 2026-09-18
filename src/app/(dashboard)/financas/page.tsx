import { createClient } from "@/lib/supabase/server";
import type { Client, FinanceEntry } from "@/lib/types";
import {
  createFinanceEntry,
  deleteFinanceEntry,
  toggleFinanceEntryStatus,
} from "./actions";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default async function FinancasPage() {
  const supabase = await createClient();

  const [{ data: entries }, { data: clients }] = await Promise.all([
    supabase
      .from("finance_entries")
      .select("*, clients(name)")
      .order("created_at", { ascending: false })
      .returns<(FinanceEntry & { clients: { name: string } | null })[]>(),
    supabase.from("clients").select("*").order("name").returns<Client[]>(),
  ]);

  const pendingIncome =
    entries
      ?.filter((e) => e.type === "income" && e.status === "pending")
      .reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;
  const pendingExpense =
    entries
      ?.filter((e) => e.type === "expense" && e.status === "pending")
      .reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
        Finanças
      </h1>

      <div className="mb-8 grid max-w-2xl grid-cols-2 gap-4">
        <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">A receber</p>
          <p className="text-xl font-semibold text-green-700 dark:text-green-400">
            {formatCurrency(pendingIncome)}
          </p>
        </div>
        <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">A pagar</p>
          <p className="text-xl font-semibold text-red-700 dark:text-red-400">
            {formatCurrency(pendingExpense)}
          </p>
        </div>
      </div>

      <form
        action={createFinanceEntry}
        className="mb-8 grid max-w-2xl grid-cols-2 gap-3 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
      >
        <input
          name="description"
          placeholder="Descrição"
          required
          className="col-span-2 rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black dark:border-white/[.145] dark:text-zinc-50 dark:focus:border-white"
        />
        <select
          name="type"
          defaultValue="income"
          className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black dark:border-white/[.145] dark:text-zinc-50 dark:focus:border-white"
        >
          <option value="income">Receita</option>
          <option value="expense">Despesa</option>
        </select>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="Valor (R$)"
          required
          className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black dark:border-white/[.145] dark:text-zinc-50 dark:focus:border-white"
        />
        <select
          name="client_id"
          defaultValue=""
          className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black dark:border-white/[.145] dark:text-zinc-50 dark:focus:border-white"
        >
          <option value="">Sem cliente</option>
          {clients?.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        <input
          name="due_date"
          type="date"
          className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black dark:border-white/[.145] dark:text-zinc-50 dark:focus:border-white"
        />
        <button
          type="submit"
          className="col-span-2 mt-1 h-10 rounded bg-foreground text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Adicionar lançamento
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-black/[.08] dark:border-white/[.145]">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/[.03] dark:bg-white/[.06]">
            <tr>
              <th className="px-4 py-2 font-medium text-black dark:text-zinc-50">Descrição</th>
              <th className="px-4 py-2 font-medium text-black dark:text-zinc-50">Cliente</th>
              <th className="px-4 py-2 font-medium text-black dark:text-zinc-50">Tipo</th>
              <th className="px-4 py-2 font-medium text-black dark:text-zinc-50">Valor</th>
              <th className="px-4 py-2 font-medium text-black dark:text-zinc-50">Prazo</th>
              <th className="px-4 py-2 font-medium text-black dark:text-zinc-50">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {entries?.map((entry) => (
              <tr key={entry.id} className="border-t border-black/[.08] dark:border-white/[.145]">
                <td className="px-4 py-2 text-black dark:text-zinc-50">{entry.description}</td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                  {entry.clients?.name ?? "—"}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      entry.type === "income"
                        ? "text-green-700 dark:text-green-400"
                        : "text-red-700 dark:text-red-400"
                    }
                  >
                    {entry.type === "income" ? "Receita" : "Despesa"}
                  </span>
                </td>
                <td className="px-4 py-2 text-black dark:text-zinc-50">
                  {formatCurrency(Number(entry.amount))}
                </td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                  {entry.due_date ?? "—"}
                </td>
                <td className="px-4 py-2">
                  <form action={toggleFinanceEntryStatus}>
                    <input type="hidden" name="id" value={entry.id} />
                    <input
                      type="hidden"
                      name="status"
                      value={entry.status === "pending" ? "paid" : "pending"}
                    />
                    <button
                      type="submit"
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        entry.status === "paid"
                          ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {entry.status === "paid" ? "Pago" : "Pendente"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-2 text-right">
                  <form action={deleteFinanceEntry}>
                    <input type="hidden" name="id" value={entry.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                    >
                      Excluir
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!entries?.length && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400">
                  Nenhum lançamento cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
