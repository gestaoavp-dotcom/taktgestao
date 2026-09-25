import { createClient } from "@/lib/supabase/server";
import { todayInBrazil } from "@/lib/report-week";

export type NotificationItem = {
  id: string;
  kind: "receber" | "pagar";
  title: string;
  subtitle: string;
  dueDate: string;
  severity: "overdue" | "soon";
  href: string;
};

// A reminder only matters once it's close: overdue always shows, upcoming
// only inside this window, so the bell doesn't fill up with next quarter's
// due dates.
const SOON_WINDOW_DAYS = 5;

type CnpjRow = {
  id: string;
  cnpj: string;
  label: string | null;
  monthly_fee: number | null;
  payment_day: number | null;
  clients: { name: string } | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// Payment day clamped to the last day of the month, so day 31 still works
// in February. Mirrors the same helper in the Finanças pages.
function dueDateFor(month: string, paymentDay: number) {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const day = Math.min(Math.max(paymentDay, 1), lastDay);
  return `${month}-${String(day).padStart(2, "0")}`;
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const today = todayInBrazil();
  const month = today.slice(0, 7);
  const soonLimitStr = new Date(Date.parse(`${today}T00:00:00Z`) + SOON_WINDOW_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [{ data: cnpjs }, { data: payments }, { data: expenses }] = await Promise.all([
    supabase
      .from("client_cnpjs")
      .select("id, cnpj, label, monthly_fee, payment_day, clients(name)")
      .not("monthly_fee", "is", null)
      .not("payment_day", "is", null)
      .returns<CnpjRow[]>(),
    supabase
      .from("client_payments")
      .select("cnpj_id")
      .eq("reference_month", `${month}-01`)
      .returns<{ cnpj_id: string }[]>(),
    supabase
      .from("finance_entries")
      .select("id, description, amount, due_date")
      .eq("type", "expense")
      .eq("status", "pending")
      .not("due_date", "is", null)
      .lte("due_date", soonLimitStr)
      .returns<{ id: string; description: string; amount: number; due_date: string }[]>(),
  ]);

  const paidCnpjIds = new Set((payments ?? []).map((p) => p.cnpj_id));

  const receivables: NotificationItem[] = (cnpjs ?? [])
    .filter((c) => !paidCnpjIds.has(c.id))
    .map((c) => ({ c, dueDate: dueDateFor(month, c.payment_day as number) }))
    .filter(({ dueDate }) => dueDate <= soonLimitStr)
    .map(({ c, dueDate }) => ({
      id: `receber-${c.id}`,
      kind: "receber" as const,
      title: c.clients?.name ?? "Cliente",
      subtitle: `${c.label ?? c.cnpj} · ${formatCurrency(Number(c.monthly_fee))}`,
      dueDate,
      severity: dueDate < today ? ("overdue" as const) : ("soon" as const),
      href: "/financas",
    }));

  const payables: NotificationItem[] = (expenses ?? []).map((e) => ({
    id: `pagar-${e.id}`,
    kind: "pagar" as const,
    title: e.description,
    subtitle: formatCurrency(Number(e.amount)),
    dueDate: e.due_date,
    severity: e.due_date < today ? ("overdue" as const) : ("soon" as const),
    href: "/financas/despesas",
  }));

  return [...receivables, ...payables].sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "overdue" ? -1 : 1;
    return a.dueDate.localeCompare(b.dueDate);
  });
}
