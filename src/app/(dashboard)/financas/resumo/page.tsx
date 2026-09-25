import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { computeFinanceMonth, loadFinanceRows } from "@/lib/finance-month";
import { todayInBrazil } from "@/lib/report-week";
import { CashflowChart, type MonthPoint } from "@/components/cashflow-chart";

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

const WINDOW = 6;
const BASE_RESERVE_PCT = 12;
const MIN_RESERVE_PCT = 5;
const MAX_RESERVE_PCT = 20;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
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

export default async function ResumoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const today = todayInBrazil();
  const anchor = mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : today.slice(0, 7);

  const monthKeys: string[] = [];
  for (let i = WINDOW - 1; i >= 0; i--) monthKeys.push(shiftMonth(anchor, -i));

  const supabase = await createClient();
  const { payments, expenses, taxSettings } = await loadFinanceRows(
    supabase,
    monthKeys[0],
    monthKeys[monthKeys.length - 1],
  );

  // The same month the DRE shows, split for the chart: the tax is a fixed
  // cost, so it sits with the fixed expenses here.
  const months: MonthPoint[] = monthKeys.map((key) => {
    const m = computeFinanceMonth(key, payments, expenses, taxSettings);
    return {
      key,
      label: monthShort(key),
      recebido: m.recebido,
      fixed: m.imposto + m.fixas,
      variable: m.variaveis,
    };
  });

  const current = months[months.length - 1];
  const history = months.slice(0, -1).filter((m) => m.recebido > 0);

  const currentRatio = current.recebido > 0 ? (current.fixed + current.variable) / current.recebido : null;
  const avgRatio = history.length
    ? history.reduce((sum, m) => sum + (m.fixed + m.variable) / m.recebido, 0) / history.length
    : null;
  const avgRecebido = history.length
    ? history.reduce((sum, m) => sum + m.recebido, 0) / history.length
    : null;

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  // A healthy-cash suggestion, not a rule: it drifts around a 12% baseline,
  // never below 5% or above 20%. Two signals pull on it with equal weight —
  // despesas acima ou abaixo do normal, e recebido acima ou abaixo do normal
  // — so the suggestion lands on a point that balances what came in against
  // what went out this month, not just one side of it.
  let suggestedPct = BASE_RESERVE_PCT;
  let expenseSignal: number | null = null;
  let revenueSignal: number | null = null;
  if (currentRatio !== null && avgRatio !== null && avgRecebido) {
    expenseSignal = clamp((avgRatio - currentRatio) * 25, -6, 6);
    revenueSignal = clamp(((current.recebido - avgRecebido) / avgRecebido) * 15, -6, 6);
    const adjustment = (expenseSignal + revenueSignal) / 2;
    suggestedPct = clamp(BASE_RESERVE_PCT + adjustment, MIN_RESERVE_PCT, MAX_RESERVE_PCT);
  }
  const suggestedAmount = current.recebido > 0 ? (current.recebido * suggestedPct) / 100 : 0;

  const trend = (value: number, reference: number) => {
    if (value > reference * 1.03) return "up";
    if (value < reference * 0.97) return "down";
    return "flat";
  };
  const revenueTrend = avgRecebido ? trend(current.recebido, avgRecebido) : null;
  const expenseTrend =
    currentRatio !== null && avgRatio !== null ? trend(currentRatio, avgRatio) : null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-end">
        <div className="flex items-center gap-2 rounded-lg bg-white p-1 shadow-sm">
          <Link
            href={`/financas/resumo?mes=${shiftMonth(anchor, -1)}`}
            aria-label="Mês anterior"
            className="rounded p-1.5 text-[#5B647E] transition-colors hover:bg-brand-gray"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-[220px] text-center text-sm font-semibold text-navy">
            últimos 6 meses até {monthLabel(anchor)}
          </span>
          <Link
            href={`/financas/resumo?mes=${shiftMonth(anchor, 1)}`}
            aria-label="Próximo mês"
            className="rounded p-1.5 text-[#5B647E] transition-colors hover:bg-brand-gray"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm text-[#5B647E]">Recebido no mês</p>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(current.recebido)}</p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm text-[#5B647E]">Despesas fixas</p>
          <p className="text-2xl font-bold text-navy">{formatCurrency(current.fixed)}</p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm text-[#5B647E]">Despesas variáveis</p>
          <p className="text-2xl font-bold text-navy">{formatCurrency(current.variable)}</p>
        </div>
      </div>

      <div className="mb-6 rounded-lg bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-bold text-navy">Recebido x despesas</h2>
        <p className="mb-4 text-xs text-[#94A0BD]">
          Últimos 6 meses, despesas separadas entre fixas e variáveis.
        </p>
        <CashflowChart months={months} />
      </div>

      <div className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-bold text-navy">Sugestão de caixa</h2>
        <p className="mb-4 text-xs text-[#94A0BD]">
          Só uma sugestão, não uma obrigação — varia entre 5% e 20% do recebido do mês.
          Recebido e despesas pesam igual: um mês bom (recebido alto, despesas baixas)
          puxa a sugestão para cima, um mês apertado puxa para baixo.
        </p>
        <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
          <p className="text-3xl font-bold text-navy">{suggestedPct.toFixed(0)}%</p>
          <p className="pb-1 text-sm text-[#5B647E]">
            do recebido em {monthLabel(anchor)} ≈{" "}
            <strong className="text-navy">{formatCurrency(suggestedAmount)}</strong>
          </p>
        </div>
        {revenueTrend !== null && expenseTrend !== null ? (
          <p className="mt-2 text-xs text-[#5B647E]">
            Recebido{" "}
            {revenueTrend === "up"
              ? "acima"
              : revenueTrend === "down"
                ? "abaixo"
                : "na média"}{" "}
            do normal, despesas{" "}
            {expenseTrend === "up" ? "acima" : expenseTrend === "down" ? "abaixo" : "na média"}{" "}
            do normal — os dois pesaram igual nessa sugestão.
          </p>
        ) : (
          <p className="mt-2 text-xs text-[#5B647E]">
            Ainda sem histórico suficiente para comparar — usando o valor base.
          </p>
        )}
      </div>
    </div>
  );
}
