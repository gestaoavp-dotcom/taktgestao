import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { ClientAccount, ClientCnpj } from "@/lib/types";
import {
  ReceivablesTable,
  type Charge,
  type ChargeStatus,
  type ClientRow,
} from "@/components/receivables-table";

type ClientRecord = {
  id: string;
  name: string;
};

type Payment = {
  cnpj_id: string;
  amount: number;
  paid_on: string;
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

  const [
    { data: clients },
    { data: cnpjs },
    { data: accounts },
    { data: monthPayments },
    { data: allPayments },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .order("name")
      .returns<ClientRecord[]>(),
    supabase
      .from("client_cnpjs")
      .select("*")
      .order("created_at")
      .returns<ClientCnpj[]>(),
    supabase
      .from("client_accounts")
      .select("*")
      .order("created_at")
      .returns<ClientAccount[]>(),
    supabase
      .from("client_payments")
      .select("cnpj_id, amount, paid_on")
      .eq("reference_month", referenceMonth)
      .returns<Payment[]>(),
    supabase.from("client_payments").select("amount").returns<{ amount: number }[]>(),
  ]);

  const paidByCnpj = new Map((monthPayments ?? []).map((p) => [p.cnpj_id, p]));

  const cnpjsByClient = new Map<string, ClientCnpj[]>();
  for (const cnpj of cnpjs ?? []) {
    cnpjsByClient.set(cnpj.client_id, [...(cnpjsByClient.get(cnpj.client_id) ?? []), cnpj]);
  }

  const storesByCnpj = new Map<string, ClientAccount[]>();
  for (const account of accounts ?? []) {
    if (!account.cnpj_id) continue;
    storesByCnpj.set(account.cnpj_id, [
      ...(storesByCnpj.get(account.cnpj_id) ?? []),
      account,
    ]);
  }

  const rows: ClientRow[] = (clients ?? []).map((client) => {
    const charges: Charge[] = (cnpjsByClient.get(client.id) ?? []).map((cnpj) => {
      const payment = paidByCnpj.get(cnpj.id);
      const dueDate = cnpj.payment_day ? dueDateFor(month, cnpj.payment_day) : null;

      let status: ChargeStatus = "pending";
      if (!cnpj.monthly_fee) status = "unset";
      else if (payment) status = "paid";
      else if (dueDate && dueDate < today) status = "overdue";

      return {
        cnpjId: cnpj.id,
        cnpj: cnpj.cnpj,
        label: cnpj.label,
        stores: (storesByCnpj.get(cnpj.id) ?? []).map((a) => ({
          name: a.store_name,
          marketplace: a.marketplace,
        })),
        fee: cnpj.monthly_fee,
        paymentMethod: cnpj.payment_method,
        dueDate,
        paidOn: payment?.paid_on ?? null,
        status,
      };
    });

    return {
      id: client.id,
      name: client.name,
      charges,
      total: charges.reduce((sum, c) => sum + Number(c.fee ?? 0), 0),
    };
  });

  const allCharges = rows.flatMap((row) => row.charges);
  const totalBy = (status: ChargeStatus) =>
    allCharges
      .filter((c) => c.status === status)
      .reduce((sum, c) => sum + Number(c.fee ?? 0), 0);
  const countBy = (status: ChargeStatus) =>
    allCharges.filter((c) => c.status === status).length;

  const received = (monthPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const consolidated = (allPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const plural = (n: number) => (n === 1 ? "CNPJ" : "CNPJs");

  return (
    <div>
      <div className="mb-6 flex items-center justify-end">
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
            {countBy("paid")} {plural(countBy("paid"))}
          </p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm text-[#5B647E]">A receber</p>
          <p className="text-2xl font-bold text-navy">{formatCurrency(totalBy("pending"))}</p>
          <p className="mt-1 text-xs text-[#94A0BD]">
            {countBy("pending")} {plural(countBy("pending"))}
          </p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm text-[#5B647E]">Atrasado</p>
          <p className="text-2xl font-bold text-red-700">{formatCurrency(totalBy("overdue"))}</p>
          <p className="mt-1 text-xs text-[#94A0BD]">
            {countBy("overdue")} {plural(countBy("overdue"))}
          </p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm text-[#5B647E]">Consolidado desde o início</p>
          <p className="text-2xl font-bold text-navy">{formatCurrency(consolidated)}</p>
          <p className="mt-1 text-xs text-[#94A0BD]">todos os meses</p>
        </div>
      </div>

      <ReceivablesTable clients={rows} referenceMonth={referenceMonth} />
    </div>
  );
}
