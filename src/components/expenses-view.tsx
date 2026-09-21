"use client";

import { useActionState, useRef, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { DateField } from "@/components/date-field";
import {
  addExpense,
  deleteExpense,
  toggleExpenseStatus,
  updateExpense,
} from "@/app/(dashboard)/financas/despesas/actions";

export type Expense = {
  id: string;
  description: string;
  amount: number;
  due_date: string | null;
  status: "pending" | "paid";
  category: "fixed" | "variable";
};

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

const CATEGORY_LABEL: Record<Expense["category"], string> = {
  fixed: "Fixa",
  variable: "Variável",
};

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

function EditExpenseForm({ expense, onDone }: { expense: Expense; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(
    async (prevState: Parameters<typeof updateExpense>[0], formData: FormData) => {
      const result = await updateExpense(prevState, formData);
      if (result && "ok" in result) onDone();
      return result;
    },
    null,
  );

  return (
    <td colSpan={6} className="px-5 py-3">
      <form action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="id" value={expense.id} />
        <div className="grid grid-cols-5 gap-2">
          <input
            name="description"
            required
            defaultValue={expense.description}
            className={`col-span-2 ${INPUT_CLASS}`}
          />
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={expense.amount}
            className={INPUT_CLASS}
          />
          <DateField
            name="due_date"
            defaultValue={expense.due_date}
            className={`flex items-center justify-between ${INPUT_CLASS}`}
          />
          <select name="category" defaultValue={expense.category} className={INPUT_CLASS}>
            <option value="fixed">Fixa</option>
            <option value="variable">Variável</option>
          </select>
        </div>

        {state && "error" in state && (
          <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            aria-label="Salvar"
            className="rounded p-1.5 text-green-600 hover:bg-green-50 disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDone}
            aria-label="Cancelar"
            className="rounded p-1.5 text-[#94A0BD] hover:bg-brand-gray hover:text-navy"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </form>
    </td>
  );
}

export function ExpensesView({
  expenses,
  today,
}: {
  expenses: Expense[];
  today: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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
        className="mb-5 grid grid-cols-5 gap-2 rounded-lg bg-white p-5 shadow-sm"
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
        <select name="category" defaultValue="variable" className={INPUT_CLASS}>
          <option value="fixed">Fixa</option>
          <option value="variable">Variável</option>
        </select>

        {state && "error" in state && (
          <p className="col-span-5 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="col-span-5 flex items-center justify-center gap-2 rounded-lg bg-navy py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38] disabled:opacity-60"
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
              <th className="px-5 py-2.5 font-semibold text-navy">Tipo</th>
              <th className="px-5 py-2.5 font-semibold text-navy">Valor</th>
              <th className="px-5 py-2.5 font-semibold text-navy">Vencimento</th>
              <th className="px-5 py-2.5 font-semibold text-navy">Status</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => {
              if (editingId === expense.id) {
                return (
                  <tr key={expense.id} className="border-t border-navy/[.06]">
                    <EditExpenseForm
                      expense={expense}
                      onDone={() => setEditingId(null)}
                    />
                  </tr>
                );
              }

              const overdue =
                expense.status === "pending" && expense.due_date && expense.due_date < today;

              return (
                <tr key={expense.id} className="group border-t border-navy/[.06]">
                  <td className="px-5 py-3 text-navy">{expense.description}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        expense.category === "fixed"
                          ? "bg-navy/10 text-navy"
                          : "bg-yellow/20 text-[#8a6a12]"
                      }`}
                    >
                      {CATEGORY_LABEL[expense.category]}
                    </span>
                  </td>
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
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(expense.id)}
                        aria-label={`Editar ${expense.description}`}
                        className="rounded p-1.5 text-[#94A0BD] opacity-0 transition-all hover:bg-brand-gray hover:text-navy focus:opacity-100 group-hover:opacity-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
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
                    </div>
                  </td>
                </tr>
              );
            })}
            {!expenses.length && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-[#94A0BD]">
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
