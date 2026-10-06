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
  "w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent";

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
        className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink transition-colors hover:bg-panel-2"
      >
        Alíquota {settings.rate_percent}%
        <Pencil className="h-3 w-3 text-ink-3" />
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
        className="w-20 rounded-lg border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent"
      />
      <span className="text-xs text-ink-3">%</span>
      <button
        type="submit"
        disabled={pending}
        aria-label="Salvar alíquota"
        className="rounded p-1 text-pos hover:bg-pos/10 disabled:opacity-60"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        aria-label="Cancelar"
        className="rounded p-1 text-ink-3 hover:bg-panel-2 hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>
      {state && "error" in state && (
        <span className="text-xs text-danger">{state.error}</span>
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
    <section className="mb-5 overflow-hidden rounded-lg bg-panel shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-ink">
            <Receipt className="h-4 w-4 text-ink-3" />
            Imposto sobre faturamento
          </h2>
          <p className="text-xs text-ink-3">
            Calculado automaticamente sobre as mensalidades recebidas no mês.
          </p>
        </div>
        <RateEditor settings={settings} />
      </div>

      {rows.length > 0 ? (
        <>
          <table className="w-full text-left text-sm">
            <thead className="bg-panel-2">
              <tr>
                <th className="px-5 py-2 font-semibold text-ink">Nota / Recebimento</th>
                <th className="px-5 py-2 font-semibold text-ink">Cliente</th>
                <th className="px-5 py-2 font-semibold text-ink">Faturamento</th>
                <th className="px-5 py-2 font-semibold text-ink">Imposto</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-line-soft">
                  <td className="px-5 py-2.5 text-ink-2">{formatDate(row.paidOn)}</td>
                  <td className="px-5 py-2.5 text-ink">
                    {row.clientName}
                    {row.cnpjLabel && (
                      <span className="text-ink-3"> · {row.cnpjLabel}</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-ink">{formatCurrency(row.amount)}</td>
                  <td className="px-5 py-2.5 font-semibold text-ink">
                    {formatCurrency(row.tax)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-panel-2/40 px-5 py-4">
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-ink-3">Faturamento do mês</p>
                <p className="font-bold text-ink">{formatCurrency(totalBilled)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-3">Imposto devido</p>
                <p className="font-bold text-ink">{formatCurrency(totalTax)}</p>
              </div>
            </div>

            {alreadyLogged ? (
              <span className="text-xs font-medium text-pos">
                Já lançado como despesa
              </span>
            ) : (
              <form action={logTaxExpense}>
                <input type="hidden" name="description" value={description} />
                <input type="hidden" name="amount" value={totalTax.toFixed(2)} />
                <input type="hidden" name="due_date" value={today} />
                <button
                  type="submit"
                  className="rounded-lg bg-action px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:opacity-90"
                >
                  Lançar como despesa
                </button>
              </form>
            )}
          </div>
        </>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-ink-3">
          Nenhuma mensalidade recebida neste mês ainda.
        </p>
      )}
    </section>
  );
}
