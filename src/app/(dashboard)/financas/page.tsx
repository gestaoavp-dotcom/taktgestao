import { createClient } from "@/lib/supabase/server";
import type { Client, FinanceEntry } from "@/lib/types";
import {
  createFinanceEntry,
  deleteFinanceEntry,
  toggleFinanceEntryStatus,
} from "./actions";
import { DateField } from "@/components/date-field";

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
      <h1 className="mb-6 font-display text-2xl font-bold text-navy">Finanças</h1>

      <div className="mb-8 grid max-w-2xl grid-cols-2 gap-4">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-sm text-[#5B647E]">A receber</p>
          <p className="font-display text-xl font-bold text-green-700">
            {formatCurrency(pendingIncome)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-sm text-[#5B647E]">A pagar</p>
          <p className="font-display text-xl font-bold text-red-700">
            {formatCurrency(pendingExpense)}
          </p>
        </div>
      </div>

      <form
        action={createFinanceEntry}
        className="mb-8 grid max-w-2xl grid-cols-2 gap-3 rounded-lg bg-white p-4 shadow-sm"
      >
        <input
          name="description"
          placeholder="Descrição"
          required
          className="col-span-2 rounded border border-navy/10 bg-transparent px-3 py-2 text-sm text-navy outline-none focus:border-blue"
        />
        <select
          name="type"
          defaultValue="income"
          className="rounded border border-navy/10 bg-transparent px-3 py-2 text-sm text-navy outline-none focus:border-blue"
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
          className="rounded border border-navy/10 bg-transparent px-3 py-2 text-sm text-navy outline-none focus:border-blue"
        />
        <select
          name="client_id"
          defaultValue=""
          className="rounded border border-navy/10 bg-transparent px-3 py-2 text-sm text-navy outline-none focus:border-blue"
        >
          <option value="">Sem cliente</option>
          {clients?.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        <DateField
          name="due_date"
          className="rounded border border-navy/10 bg-transparent px-3 py-2 text-sm text-navy outline-none focus:border-blue flex w-full items-center justify-between"
        />
        <button
          type="submit"
          className="col-span-2 mt-1 h-10 rounded bg-navy text-sm font-medium text-white transition-colors hover:bg-[#0d1a38]"
        >
          Adicionar lançamento
        </button>
      </form>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-gray">
            <tr>
              <th className="px-4 py-2 font-medium text-navy">Descrição</th>
              <th className="px-4 py-2 font-medium text-navy">Cliente</th>
              <th className="px-4 py-2 font-medium text-navy">Tipo</th>
              <th className="px-4 py-2 font-medium text-navy">Valor</th>
              <th className="px-4 py-2 font-medium text-navy">Prazo</th>
              <th className="px-4 py-2 font-medium text-navy">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {entries?.map((entry) => (
              <tr key={entry.id} className="border-t border-navy/[.08]">
                <td className="px-4 py-2 text-navy">{entry.description}</td>
                <td className="px-4 py-2 text-[#5B647E]">{entry.clients?.name ?? "—"}</td>
                <td className="px-4 py-2">
                  <span className={entry.type === "income" ? "text-green-700" : "text-red-700"}>
                    {entry.type === "income" ? "Receita" : "Despesa"}
                  </span>
                </td>
                <td className="px-4 py-2 text-navy">{formatCurrency(Number(entry.amount))}</td>
                <td className="px-4 py-2 text-[#5B647E]">{entry.due_date ?? "—"}</td>
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
                          ? "bg-green-50 text-green-700"
                          : "bg-yellow text-navy"
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
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Excluir
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!entries?.length && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-[#94A0BD]">
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
