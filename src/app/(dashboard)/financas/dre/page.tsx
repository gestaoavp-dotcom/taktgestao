import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { TaxSettings } from "@/lib/types";

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const MONTH_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const MONTH_WINDOW = 6;

// The tax-log button in Despesas writes the expense with this exact prefix
// (see tax-summary-card.tsx), so a logged tax entry can be told apart from
// an ordinary fixed expense and left out of "Despesas fixas" here — the
// Impostos line already accounts for it, computed fresh off the period's
// recebido instead of depending on whether anyone clicked "Lançar".
const TAX_DESCRIPTION_PREFIX = "Imposto sobre faturamento (";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function monthLabel(month: string) {
  const [y, m] = month.split("-");
  return `${MONTH_NAMES[Number(m) - 1]} de ${y}`;
}

function monthShort(month: string) {
  const [, m] = month.split("-");
  return MONTH_SHORT[Number(m) - 1];
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

function yearMonthKeys(year: number) {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

type PaymentRow = { amount: number; reference_month: string };
type ExpenseRow = {
  amount: number;
  due_date: string | null;
  category: "fixed" | "variable" | null;
  description: string;
};

type MonthMargin = {
  key: string;
  label: string;
  recebido: number;
  imposto: number;
  fixas: number;
  variaveis: number;
  resultado: number;
  marginPct: number;
};

function computeMonth(
  key: string,
  payments: PaymentRow[],
  expenses: ExpenseRow[],
  rate: number,
): MonthMargin {
  const monthPayments = payments.filter((p) => p.reference_month.slice(0, 7) === key);
  const recebido = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const imposto = monthPayments.reduce(
    (sum, p) => sum + Math.round(Number(p.amount) * rate * 100) / 100,
    0,
  );

  const monthExpenses = expenses.filter((e) => (e.due_date ?? "").slice(0, 7) === key);
  const fixas = monthExpenses
    .filter((e) => e.category === "fixed" && !e.description.startsWith(TAX_DESCRIPTION_PREFIX))
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const variaveis = monthExpenses
    .filter((e) => e.category !== "fixed")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const resultado = recebido - imposto - fixas - variaveis;
  const marginPct = recebido > 0 ? (resultado / recebido) * 100 : 0;

  return { key, label: monthShort(key), recebido, imposto, fixas, variaveis, resultado, marginPct };
}

function aggregate(months: MonthMargin[]): Omit<MonthMargin, "key" | "label"> {
  const recebido = months.reduce((sum, m) => sum + m.recebido, 0);
  const imposto = months.reduce((sum, m) => sum + m.imposto, 0);
  const fixas = months.reduce((sum, m) => sum + m.fixas, 0);
  const variaveis = months.reduce((sum, m) => sum + m.variaveis, 0);
  const resultado = recebido - imposto - fixas - variaveis;
  const marginPct = recebido > 0 ? (resultado / recebido) * 100 : 0;
  return { recebido, imposto, fixas, variaveis, resultado, marginPct };
}

export default async function DrePage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string; visao?: string }>;
}) {
  const { mes, ano, visao } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const view = visao === "anual" ? "anual" : "mensal";

  const anchor = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : today.slice(0, 7);
  const year = ano && /^\d{4}$/.test(ano) ? Number(ano) : Number(today.slice(0, 4));

  const monthKeys = view === "anual" ? yearMonthKeys(year) : [];
  if (view === "mensal") {
    for (let i = MONTH_WINDOW - 1; i >= 0; i--) monthKeys.push(shiftMonth(anchor, -i));
  }

  const rangeStart = `${monthKeys[0]}-01`;
  const rangeEndMonth = view === "anual" ? `${year + 1}-01` : shiftMonth(anchor, 1);
  const rangeEnd = `${rangeEndMonth}-01`;

  const supabase = await createClient();

  const [{ data: payments }, { data: expenses }, { data: taxSettings }] = await Promise.all([
    supabase
      .from("client_payments")
      .select("amount, reference_month")
      .gte("reference_month", rangeStart)
      .lt("reference_month", rangeEnd)
      .returns<PaymentRow[]>(),
    supabase
      .from("finance_entries")
      .select("amount, due_date, category, description")
      .eq("type", "expense")
      .gte("due_date", rangeStart)
      .lt("due_date", rangeEnd)
      .returns<ExpenseRow[]>(),
    supabase.from("tax_settings").select("*").limit(1).maybeSingle<TaxSettings>(),
  ]);

  const rate = taxSettings ? Number(taxSettings.rate_percent) / 100 : 0;
  const months = monthKeys.map((key) => computeMonth(key, payments ?? [], expenses ?? [], rate));

  const current = view === "anual" ? { ...aggregate(months) } : months[months.length - 1];
  const periodLabel = view === "anual" ? `o ano de ${year}` : monthLabel(anchor);
  const resultLabel = view === "anual" ? "Resultado do ano" : "Resultado do mês";
  const trendLabel = view === "anual" ? `Margem mês a mês em ${year}` : "Margem nos últimos 6 meses";

  const monthlyToggleHref =
    year === Number(today.slice(0, 4))
      ? `/financas/dre?visao=mensal&mes=${today.slice(0, 7)}`
      : `/financas/dre?visao=mensal&mes=${year}-12`;
  const annualToggleHref = `/financas/dre?visao=anual&ano=${anchor.slice(0, 4)}`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-white p-1 shadow-sm">
          <Link
            href={monthlyToggleHref}
            className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
              view === "mensal" ? "bg-blue text-white" : "text-[#5B647E] hover:bg-brand-gray"
            }`}
          >
            Mensal
          </Link>
          <Link
            href={annualToggleHref}
            className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
              view === "anual" ? "bg-blue text-white" : "text-[#5B647E] hover:bg-brand-gray"
            }`}
          >
            Anual
          </Link>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-white p-1 shadow-sm">
          <Link
            href={
              view === "anual"
                ? `/financas/dre?visao=anual&ano=${year - 1}`
                : `/financas/dre?visao=mensal&mes=${shiftMonth(anchor, -1)}`
            }
            aria-label={view === "anual" ? "Ano anterior" : "Mês anterior"}
            className="rounded p-1.5 text-[#5B647E] transition-colors hover:bg-brand-gray"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-[150px] text-center text-sm font-semibold text-navy">
            {view === "anual" ? year : monthLabel(anchor)}
          </span>
          <Link
            href={
              view === "anual"
                ? `/financas/dre?visao=anual&ano=${year + 1}`
                : `/financas/dre?visao=mensal&mes=${shiftMonth(anchor, 1)}`
            }
            aria-label={view === "anual" ? "Próximo ano" : "Próximo mês"}
            className="rounded p-1.5 text-[#5B647E] transition-colors hover:bg-brand-gray"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-bold text-navy">{resultLabel}</h2>
        <p className="mb-4 text-xs text-[#94A0BD]">
          Receita, impostos e despesas de {periodLabel}, na ponta do lápis.
        </p>

        <div className="divide-y divide-navy/[.06]">
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-navy">Receita bruta (recebido)</span>
            <span className="text-sm font-semibold text-navy">
              {formatCurrency(current.recebido)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-[#5B647E]">
              (–) Impostos{taxSettings ? ` (${taxSettings.rate_percent}%)` : ""}
            </span>
            <span className="text-sm text-red-700">-{formatCurrency(current.imposto)}</span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-[#5B647E]">(–) Despesas fixas</span>
            <span className="text-sm text-red-700">-{formatCurrency(current.fixas)}</span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-[#5B647E]">(–) Despesas variáveis</span>
            <span className="text-sm text-red-700">-{formatCurrency(current.variaveis)}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="font-bold text-navy">Resultado líquido</span>
            <span
              className={`text-lg font-bold ${
                current.resultado >= 0 ? "text-green-700" : "text-red-700"
              }`}
            >
              {formatCurrency(current.resultado)}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-brand-gray/50 px-4 py-3">
          <span className="text-sm font-semibold text-navy">Margem líquida</span>
          <span
            className={`text-xl font-bold ${
              current.marginPct >= 0 ? "text-green-700" : "text-red-700"
            }`}
          >
            {formatPercent(current.marginPct)}
          </span>
        </div>
      </div>

      <div className="mt-6 rounded-lg bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-bold text-navy">{trendLabel}</h2>
        <p className="mb-4 text-xs text-[#94A0BD]">
          Resultado líquido sobre a receita bruta, mês a mês.
        </p>
        <div className="flex flex-col gap-2.5">
          {months.map((m) => (
            <div key={m.key} className="flex items-center gap-3">
              <span className="w-10 text-xs text-[#5B647E]">{m.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-gray">
                <div
                  className={`h-full rounded-full ${
                    m.marginPct >= 0 ? "bg-green-600" : "bg-red-600"
                  }`}
                  style={{ width: `${Math.min(100, Math.abs(m.marginPct))}%` }}
                />
              </div>
              <span
                className={`w-16 text-right text-xs font-semibold ${
                  m.marginPct >= 0 ? "text-green-700" : "text-red-700"
                }`}
              >
                {formatPercent(m.marginPct)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
