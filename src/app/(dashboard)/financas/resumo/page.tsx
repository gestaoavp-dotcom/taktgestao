import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
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

type PaymentRow = { amount: number; reference_month: string };
type ExpenseRow = { amount: number; due_date: string | null; category: "fixed" | "variable" | null };

export default async function ResumoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const anchor = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : today.slice(0, 7);

  const monthKeys: string[] = [];
  for (let i = WINDOW - 1; i >= 0; i--) monthKeys.push(shiftMonth(anchor, -i));

  const rangeStart = `${monthKeys[0]}-01`;
  const rangeEnd = `${shiftMonth(anchor, 1)}-01`;

  const supabase = await createClient();

  const [{ data: payments }, { data: expenses }] = await Promise.all([
    supabase
      .from("client_payments")
      .select("amount, reference_month")
      .gte("reference_month", rangeStart)
      .lt("reference_month", rangeEnd)
      .returns<PaymentRow[]>(),
    supabase
      .from("finance_entries")
      .select("amount, due_date, category")
      .eq("type", "expense")
      .gte("due_date", rangeStart)
      .lt("due_date", rangeEnd)
      .returns<ExpenseRow[]>(),
  ]);

  const months: MonthPoint[] = monthKeys.map((key) => {
    const recebido = (payments ?? [])
      .filter((p) => p.reference_month.slice(0, 7) === key)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const monthExpenses = (expenses ?? []).filter((e) => (e.due_date ?? "").slice(0, 7) === key);
    const fixed = monthExpenses
      .filter((e) => e.category === "fixed")
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const variable = monthExpenses
      .filter((e) => e.category !== "fixed")
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return { key, label: monthShort(key), recebido, fixed, variable };
  });

  const current = months[months.length - 1];
  const history = months.slice(0, -1).filter((m) => m.recebido > 0);

  const currentRatio = current.recebido > 0 ? (current.fixed + current.variable) / current.recebido : null;
  const avgRatio = history.length
    ? history.reduce((sum, m) => sum + (m.fixed + m.variable) / m.recebido, 0) / history.length
    : null;

  // A healthy-cash suggestion, not a rule: it drifts around a 12% baseline as
  // this month's expenses come in above or below the recent average, but
  // never below 5% or above 20%.
  let suggestedPct = BASE_RESERVE_PCT;
  if (currentRatio !== null && avgRatio !== null) {
    const diff = avgRatio - currentRatio;
    suggestedPct = Math.min(MAX_RESERVE_PCT, Math.max(MIN_RESERVE_PCT, BASE_RESERVE_PCT + diff * 25));
  }
  const suggestedAmount = current.recebido > 0 ? (current.recebido * suggestedPct) / 100 : 0;

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
          Só uma sugestão, não uma obrigação — varia entre 5% e 20% do recebido do mês
          conforme as despesas oscilam em relação à média recente.
        </p>
        <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
          <p className="text-3xl font-bold text-navy">{suggestedPct.toFixed(0)}%</p>
          <p className="pb-1 text-sm text-[#5B647E]">
            do recebido em {monthLabel(anchor)} ≈{" "}
            <strong className="text-navy">{formatCurrency(suggestedAmount)}</strong>
          </p>
        </div>
        {currentRatio !== null && avgRatio !== null ? (
          <p className="mt-2 text-xs text-[#5B647E]">
            {currentRatio > avgRatio
              ? "As despesas deste mês ficaram acima da média recente, então a sugestão caiu um pouco."
              : currentRatio < avgRatio
                ? "As despesas deste mês ficaram abaixo da média recente, então a sugestão subiu um pouco."
                : "As despesas deste mês seguiram a média recente."}
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
