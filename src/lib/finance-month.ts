import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaxSettings } from "@/lib/types";
import { fetchAll } from "@/lib/supabase/fetch-all";

// One month of the agency's own money, computed one way for every screen that
// shows it — the DRE and the Resumo read the same numbers from here, so they
// cannot drift apart.
//
//   recebido   the fees paid for the month (client_payments, by reference month)
//   imposto    the tax on that, always computed from it at the current rate
//   fixas      fixed expenses due in the month, the logged tax left out
//   variaveis  variable expenses due in the month, the logged tax left out
//
// The tax is computed, never read from the expense list: the "Lançar como
// despesa" button in Contas a pagar writes it there too, and counting both
// would take it off twice. The logged entry is recognised by the description
// that button writes (see tax-summary-card.tsx).

export const TAX_DESCRIPTION_PREFIX = "Imposto sobre faturamento (";

export type PaymentRow = { amount: number; reference_month: string };
export type ExpenseRow = {
  amount: number;
  due_date: string | null;
  category: "fixed" | "variable" | null;
  description: string;
};

export type FinanceMonth = {
  recebido: number;
  imposto: number;
  fixas: number;
  variaveis: number;
  resultado: number;
  marginPct: number;
};

/** Everything the months from `startMonth` up to `endMonth` need, read in full. */
export async function loadFinanceRows(
  supabase: SupabaseClient,
  startMonth: string,
  endMonth: string,
) {
  const start = `${startMonth}-01`;
  const [y, m] = endMonth.split("-").map(Number);
  const after = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);

  const [payments, expenses, { data: taxSettings }] = await Promise.all([
    fetchAll<PaymentRow>((from, to) =>
      supabase
        .from("client_payments")
        .select("amount, reference_month")
        .gte("reference_month", start)
        .lt("reference_month", after)
        .order("id")
        .range(from, to)
        .returns<PaymentRow[]>(),
    ),
    fetchAll<ExpenseRow>((from, to) =>
      supabase
        .from("finance_entries")
        .select("amount, due_date, category, description")
        .eq("type", "expense")
        .gte("due_date", start)
        .lt("due_date", after)
        .order("id")
        .range(from, to)
        .returns<ExpenseRow[]>(),
    ),
    supabase.from("tax_settings").select("*").limit(1).maybeSingle<TaxSettings>(),
  ]);

  return { payments, expenses, taxSettings: taxSettings ?? null };
}

export function computeFinanceMonth(
  month: string,
  payments: PaymentRow[],
  expenses: ExpenseRow[],
  taxSettings: TaxSettings | null,
): FinanceMonth {
  const rate = taxSettings ? Number(taxSettings.rate_percent) / 100 : 0;

  const monthPayments = payments.filter((p) => p.reference_month.slice(0, 7) === month);
  const recebido = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  // Per payment and rounded, exactly as the tax card and its "Lançar" button do.
  const imposto = monthPayments.reduce(
    (sum, p) => sum + Math.round(Number(p.amount) * rate * 100) / 100,
    0,
  );

  const monthExpenses = expenses.filter(
    (e) =>
      (e.due_date ?? "").slice(0, 7) === month && !e.description.startsWith(TAX_DESCRIPTION_PREFIX),
  );
  const fixas = monthExpenses
    .filter((e) => e.category === "fixed")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const variaveis = monthExpenses
    .filter((e) => e.category !== "fixed")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const resultado = recebido - imposto - fixas - variaveis;
  return {
    recebido,
    imposto,
    fixas,
    variaveis,
    resultado,
    marginPct: recebido > 0 ? (resultado / recebido) * 100 : 0,
  };
}
