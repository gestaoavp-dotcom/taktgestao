"use client";

import { useActionState, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { DateField } from "@/components/date-field";
import {
  addExpense,
  deleteExpense,
  toggleExpenseStatus,
} from "@/app/(dashboard)/financas/despesas/actions";

export type Expense = {
  id: string;
  description: string;
  amount: number;
  due_date: string | null;
  status: "pending" | "paid";
};

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date: string | null) {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

export function ExpensesView({
  expenses,
  today,
}: {
  expenses: Expense[];
  today: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState(
    async (prevState: Parameters<typeof addExpense>[0], formData: FormData) => {
      const result = await addExpense(prevState, formData);
      if (result && "ok" in result) formRef.current?.reset();
      return result;
    },
    null,
  );

  return (
    <div>
      <form
        ref={formRef}
        action={formAction}
        className="mb-5 grid grid-cols-4 gap-2 rounded-lg bg-white p-5 shadow-sm"
      >
        <input
          name="description"
          required
          placeholder="Descrição da despesa"
          className={`col-span-2 ${INPUT_CLASS}`}
        />
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          required
          placeholder="Valor (R$)"
          className={INPUT_CLASS}
        />
        <DateField
          name="due_date"
          defaultValue={today}
          className={`flex items-center justify-between ${INPUT_CLASS}`}
        />

        {state && "error" in state && (
          <p className="col-span-4 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="col-span-4 flex items-center justify-center gap-2 rounded-lg bg-navy py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38] disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {pending ? "Adicionando..." : "Adicionar despesa"}
        </button>
      </form>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-gray">
            <tr>
              <th className="px-5 py-2.5 font-semibold text-navy">Despesa</th>
              <th className="px-5 py-2.5 font-semibold text-navy">Valor</th>
              <th className="px-5 py-2.5 font-semibold text-navy">Vencimento</th>
              <th className="px-5 py-2.5 font-semibold text-navy">Status</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => {
              const overdue =
                expense.status === "pending" && expense.due_date && expense.due_date < today;

              return (
                <tr key={expense.id} className="group border-t border-navy/[.06]">
                  <td className="px-5 py-3 text-navy">{expense.description}</td>
                  <td className="px-5 py-3 font-semibold text-navy">
                    {formatCurrency(Number(expense.amount))}
                  </td>
                  <td className="px-5 py-3 text-[#5B647E]">{formatDate(expense.due_date)}</td>
                  <td className="px-5 py-3">
                    <form action={toggleExpenseStatus}>
                      <input type="hidden" name="id" value={expense.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={expense.status === "paid" ? "pending" : "paid"}
                      />
                      <button
                        type="submit"
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                          expense.status === "paid"
                            ? "bg-green-50 text-green-700"
                            : overdue
                              ? "bg-red-50 text-red-700"
                              : "bg-blue/10 text-blue"
                        }`}
                      >
                        {expense.status === "paid"
                          ? "Paga"
                          : overdue
                            ? "Atrasada"
                            : "A pagar"}
                      </button>
                    </form>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <form action={deleteExpense}>
                      <input type="hidden" name="id" value={expense.id} />
                      <button
                        type="submit"
                        aria-label={`Excluir ${expense.description}`}
                        className="rounded p-1.5 text-[#94A0BD] opacity-0 transition-all hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {!expenses.length && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-[#94A0BD]">
                  Nenhuma despesa lançada neste mês.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
