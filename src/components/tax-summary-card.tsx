"use client";

import { useActionState, useState } from "react";
import { Check, Pencil, Receipt, X } from "lucide-react";
import type { TaxSettings } from "@/lib/types";
import {
  logTaxExpense,
  updateTaxRate,
} from "@/app/(dashboard)/financas/despesas/actions";

export type TaxNote = {
  id: string;
  clientName: string;
  cnpjLabel: string | null;
  cnpj: string | null;
  amount: number;
  paidOn: string;
};

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

function RateEditor({ settings }: { settings: TaxSettings }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prevState: Parameters<typeof updateTaxRate>[0], formData: FormData) => {
      const result = await updateTaxRate(prevState, formData);
      if (result && "ok" in result) setEditing(false);
      return result;
    },
    null,
  );

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 rounded-full border border-navy/10 px-3 py-1 text-xs font-semibold text-navy transition-colors hover:bg-brand-gray"
      >
        Alíquota {settings.rate_percent}%
        <Pencil className="h-3 w-3 text-[#94A0BD]" />
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={settings.id} />
      <input
        name="rate_percent"
        type="number"
        step="0.01"
        min="0"
        defaultValue={settings.rate_percent}
        autoFocus
        className="w-20 rounded-lg border border-navy/10 px-2 py-1 text-sm text-navy outline-none focus:border-blue"
      />
      <span className="text-xs text-[#94A0BD]">%</span>
      <button
        type="submit"
        disabled={pending}
        aria-label="Salvar alíquota"
        className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-60"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        aria-label="Cancelar"
        className="rounded p-1 text-[#94A0BD] hover:bg-brand-gray hover:text-navy"
      >
        <X className="h-4 w-4" />
      </button>
      {state && "error" in state && (
        <span className="text-xs text-red-700">{state.error}</span>
      )}
    </form>
  );
}

export function TaxSummaryCard({
  settings,
  notes,
  alreadyLogged,
  today,
}: {
  settings: TaxSettings;
  notes: TaxNote[];
  alreadyLogged: boolean;
  today: string;
}) {
  const rate = Number(settings.rate_percent) / 100;
  const rows = notes.map((note) => ({
    ...note,
    tax: Math.round(note.amount * rate * 100) / 100,
  }));

  const totalBilled = rows.reduce((sum, r) => sum + r.amount, 0);
  const totalTax = rows.reduce((sum, r) => sum + r.tax, 0);
  const description = `Imposto sobre faturamento (${settings.rate_percent}%)`;

  return (
    <section className="mb-5 overflow-hidden rounded-lg bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/[.08] px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-navy">
            <Receipt className="h-4 w-4 text-[#94A0BD]" />
            Imposto sobre faturamento
          </h2>
          <p className="text-xs text-[#94A0BD]">
            Calculado automaticamente sobre as mensalidades recebidas no mês.
          </p>
        </div>
        <RateEditor settings={settings} />
      </div>

      {rows.length > 0 ? (
        <>
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-gray">
              <tr>
                <th className="px-5 py-2 font-semibold text-navy">Nota / Recebimento</th>
                <th className="px-5 py-2 font-semibold text-navy">Cliente</th>
                <th className="px-5 py-2 font-semibold text-navy">Faturamento</th>
                <th className="px-5 py-2 font-semibold text-navy">Imposto</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-navy/[.06]">
                  <td className="px-5 py-2.5 text-[#5B647E]">{formatDate(row.paidOn)}</td>
                  <td className="px-5 py-2.5 text-navy">
                    {row.clientName}
                    {row.cnpjLabel && (
                      <span className="text-[#94A0BD]"> · {row.cnpjLabel}</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-navy">{formatCurrency(row.amount)}</td>
                  <td className="px-5 py-2.5 font-semibold text-navy">
                    {formatCurrency(row.tax)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy/[.08] bg-brand-gray/40 px-5 py-4">
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-[#94A0BD]">Faturamento do mês</p>
                <p className="font-bold text-navy">{formatCurrency(totalBilled)}</p>
              </div>
              <div>
                <p className="text-xs text-[#94A0BD]">Imposto devido</p>
                <p className="font-bold text-navy">{formatCurrency(totalTax)}</p>
              </div>
            </div>

            {alreadyLogged ? (
              <span className="text-xs font-medium text-green-700">
                Já lançado como despesa
              </span>
            ) : (
              <form action={logTaxExpense}>
                <input type="hidden" name="description" value={description} />
                <input type="hidden" name="amount" value={totalTax.toFixed(2)} />
                <input type="hidden" name="due_date" value={today} />
                <button
                  type="submit"
                  className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38]"
                >
                  Lançar como despesa
                </button>
              </form>
            )}
          </div>
        </>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-[#94A0BD]">
          Nenhuma mensalidade recebida neste mês ainda.
        </p>
      )}
    </section>
  );
}
