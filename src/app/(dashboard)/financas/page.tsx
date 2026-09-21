import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { markPaid, unmarkPaid } from "./actions";

type ClientRow = {
  id: string;
  name: string;
  store_name: string | null;
  monthly_fee: number | null;
  payment_day: number | null;
  payment_method: string | null;
};

type Payment = {
  client_id: string;
  reference_month: string;
  amount: number;
  paid_on: string;
};

type Status = "paid" | "pending" | "overdue" | "unset";

const STATUS: Record<Status, { label: string; className: string }> = {
  paid: { label: "Pago", className: "bg-green-50 text-green-700" },
  pending: { label: "A vencer", className: "bg-blue/10 text-blue" },
  overdue: { label: "Atrasado", className: "bg-red-50 text-red-700" },
  unset: { label: "Sem mensalidade", className: "bg-brand-gray text-[#5B647E]" },
};

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

function formatDate(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

function monthLabel(month: string) {
  const [y, m] = month.split("-");
  return `${MONTH_NAMES[Number(m) - 1]} de ${y}`;
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

// Payment day clamped to the last day of the month, so day 31 still works
// in February.
function dueDateFor(month: string, paymentDay: number) {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const day = Math.min(Math.max(paymentDay, 1), lastDay);
  return `${month}-${String(day).padStart(2, "0")}`;
}

export default async function FinancasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const month = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : today.slice(0, 7);
  const referenceMonth = `${month}-01`;

  const supabase = await createClient();

  const [{ data: clients }, { data: monthPayments }, { data: allPayments }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, name, store_name, monthly_fee, payment_day, payment_method")
        .order("name")
        .returns<ClientRow[]>(),
      supabase
        .from("client_payments")
        .select("client_id, reference_month, amount, paid_on")
        .eq("reference_month", referenceMonth)
        .returns<Payment[]>(),
      supabase.from("client_payments").select("amount").returns<{ amount: number }[]>(),
    ]);

  const paidByClient = new Map((monthPayments ?? []).map((p) => [p.client_id, p]));

  const rows = (clients ?? []).map((client) => {
    const payment = paidByClient.get(client.id);
    const dueDate = client.payment_day ? dueDateFor(month, client.payment_day) : null;

    let status: Status = "pending";
    if (!client.monthly_fee) status = "unset";
    else if (payment) status = "paid";
    else if (dueDate && dueDate < today) status = "overdue";

    return { client, payment, dueDate, status };
  });

  const feeTotal = (status: Status) =>
    rows
      .filter((row) => row.status === status)
      .reduce((total, row) => total + Number(row.client.monthly_fee ?? 0), 0);

  const received = rows
    .filter((row) => row.status === "paid")
    .reduce((total, row) => total + Number(row.payment?.amount ?? 0), 0);
  const consolidated = (allPayments ?? []).reduce((total, p) => total + Number(p.amount), 0);

  const count = (status: Status) => rows.filter((row) => row.status === status).length;
  const plural = (n: number) => (n === 1 ? "cliente" : "clientes");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">Finanças</h1>

        <div className="flex items-center gap-2 rounded-lg bg-white p-1 shadow-sm">
          <Link
            href={`/financas?mes=${shiftMonth(month, -1)}`}
            aria-label="Mês anterior"
            className="rounded p-1.5 text-[#5B647E] transition-colors hover:bg-brand-gray"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-[150px] text-center text-sm font-semibold text-navy">
            {monthLabel(month)}
          </span>
          <Link
            href={`/financas?mes=${shiftMonth(month, 1)}`}
            aria-label="Próximo mês"
            className="rounded p-1.5 text-[#5B647E] transition-colors hover:bg-brand-gray"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm text-[#5B647E]">Recebido no mês</p>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(received)}</p>
          <p className="mt-1 text-xs text-[#94A0BD]">
            {count("paid")} {plural(count("paid"))}
          </p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm text-[#5B647E]">A receber</p>
          <p className="text-2xl font-bold text-navy">{formatCurrency(feeTotal("pending"))}</p>
          <p className="mt-1 text-xs text-[#94A0BD]">
            {count("pending")} {plural(count("pending"))}
          </p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm text-[#5B647E]">Atrasado</p>
          <p className="text-2xl font-bold text-red-700">{formatCurrency(feeTotal("overdue"))}</p>
          <p className="mt-1 text-xs text-[#94A0BD]">
            {count("overdue")} {plural(count("overdue"))}
          </p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm text-[#5B647E]">Consolidado desde o início</p>
          <p className="text-2xl font-bold text-navy">{formatCurrency(consolidated)}</p>
          <p className="mt-1 text-xs text-[#94A0BD]">todos os meses</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-gray">
            <tr>
              <th className="px-5 py-2.5 font-semibold text-navy">Cliente</th>
              <th className="px-5 py-2.5 font-semibold text-navy">Mensalidade</th>
              <th className="px-5 py-2.5 font-semibold text-navy">Forma de pagamento</th>
              <th className="px-5 py-2.5 font-semibold text-navy">Vencimento</th>
              <th className="px-5 py-2.5 font-semibold text-navy">Status</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ client, payment, dueDate, status }) => (
              <tr key={client.id} className="border-t border-navy/[.06]">
                <td className="px-5 py-3">
                  <Link
                    href={`/clientes/${client.id}`}
                    className="font-semibold text-navy hover:text-blue"
                  >
                    {client.name}
                  </Link>
                  {client.store_name && (
                    <p className="text-xs text-[#94A0BD]">{client.store_name}</p>
                  )}
                </td>
                <td className="px-5 py-3 font-semibold text-navy">
                  {client.monthly_fee ? formatCurrency(Number(client.monthly_fee)) : "—"}
                </td>
                <td className="px-5 py-3 text-[#5B647E]">{client.payment_method ?? "—"}</td>
                <td className="px-5 py-3 text-[#5B647E]">
                  {dueDate ? formatDate(dueDate) : "—"}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[status].className}`}
                  >
                    {STATUS[status].label}
                  </span>
                  {payment && (
                    <p className="mt-1 text-xs text-[#94A0BD]">
                      em {formatDate(payment.paid_on)}
                    </p>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  {status === "unset" && (
                    <Link
                      href={`/clientes/${client.id}`}
                      className="text-xs font-semibold text-blue hover:underline"
                    >
                      Definir mensalidade
                    </Link>
                  )}
                  {status === "paid" && (
                    <form action={unmarkPaid}>
                      <input type="hidden" name="client_id" value={client.id} />
                      <input type="hidden" name="reference_month" value={referenceMonth} />
                      <button
                        type="submit"
                        className="text-xs font-semibold text-[#94A0BD] transition-colors hover:text-red-600 hover:underline"
                      >
                        Desfazer
                      </button>
                    </form>
                  )}
                  {(status === "pending" || status === "overdue") && (
                    <form action={markPaid}>
                      <input type="hidden" name="client_id" value={client.id} />
                      <input type="hidden" name="reference_month" value={referenceMonth} />
                      <input type="hidden" name="amount" value={String(client.monthly_fee)} />
                      <input type="hidden" name="due_date" value={dueDate ?? referenceMonth} />
                      <button
                        type="submit"
                        className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0d1a38]"
                      >
                        Marcar como pago
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-[#94A0BD]">
                  Nenhum cliente cadastrado ainda. Cadastre em{" "}
                  <Link href="/clientes" className="font-semibold text-blue hover:underline">
                    Clientes
                  </Link>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
