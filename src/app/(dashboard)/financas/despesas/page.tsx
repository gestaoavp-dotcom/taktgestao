import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ExpensesView, type Expense } from "@/components/expenses-view";

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

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export default async function DespesasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const month = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : today.slice(0, 7);

  const monthStart = `${month}-01`;
  const monthEnd = `${shiftMonth(month, 1)}-01`;

  const supabase = await createClient();

  const { data: expenses } = await supabase
    .from("finance_entries")
    .select("id, description, amount, due_date, status")
    .eq("type", "expense")
    .gte("due_date", monthStart)
    .lt("due_date", monthEnd)
    .order("due_date")
    .returns<Expense[]>();

  const rows = expenses ?? [];
  const total = rows.reduce((sum, e) => sum + Number(e.amount), 0);
  const paid = rows
    .filter((e) => e.status === "paid")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const overdue = rows
    .filter((e) => e.status === "pending" && e.due_date && e.due_date < today)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-end">
        <div className="flex items-center gap-2 rounded-lg bg-white p-1 shadow-sm">
          <Link
            href={`/financas/despesas?mes=${shiftMonth(month, -1)}`}
            aria-label="Mês anterior"
            className="rounded p-1.5 text-[#5B647E] transition-colors hover:bg-brand-gray"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-[150px] text-center text-sm font-semibold text-navy">
            {monthLabel(month)}
          </span>
          <Link
            href={`/financas/despesas?mes=${shiftMonth(month, 1)}`}
            aria-label="Próximo mês"
            className="rounded p-1.5 text-[#5B647E] transition-colors hover:bg-brand-gray"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm text-[#5B647E]">Total do mês</p>
          <p className="text-2xl font-bold text-navy">{formatCurrency(total)}</p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm text-[#5B647E]">Já pago</p>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(paid)}</p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm text-[#5B647E]">Atrasado</p>
          <p className="text-2xl font-bold text-red-700">{formatCurrency(overdue)}</p>
        </div>
      </div>

      <ExpensesView expenses={rows} today={today} />
    </div>
  );
}
