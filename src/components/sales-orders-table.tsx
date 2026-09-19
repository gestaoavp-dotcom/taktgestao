"use client";

import { useActionState, useMemo, useState } from "react";
import type { SalesOrder } from "@/lib/types";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { formatCurrency } from "@/lib/sales-summary";
import { updateOrderCosts } from "@/app/(dashboard)/clientes/[id]/vendas/actions";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const CELL_INPUT_CLASS =
  "w-20 rounded border border-navy/10 bg-white px-1.5 py-1 text-right text-xs text-navy outline-none focus:border-blue";

function monthLabel(reportMonth: string) {
  const [y, m] = reportMonth.split("-").map(Number);
  return `${MONTHS[m - 1]} de ${y}`;
}

function formatDate(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

const STATUS_STYLE: Record<string, string> = {
  Concluído: "bg-green-100 text-green-700",
  Cancelado: "bg-red-50 text-red-700",
};

function OrderRow({ clientId, order }: { clientId: string; order: SalesOrder }) {
  const [cost, setCost] = useState(order.cost != null ? String(order.cost) : "");
  const [extra, setExtra] = useState(order.extra_costs != null ? String(order.extra_costs) : "");
  const [tax, setTax] = useState(order.tax_percent != null ? String(order.tax_percent) : "");
  const [, formAction] = useActionState(updateOrderCosts, null);

  const costNum = parseFloat(cost.replace(",", ".")) || 0;
  const extraNum = parseFloat(extra.replace(",", ".")) || 0;
  const taxNum = parseFloat(tax.replace(",", ".")) || 0;
  const taxAmount = (order.net_settlement * taxNum) / 100;
  const margin = order.net_settlement - costNum - extraNum - taxAmount;

  return (
    <tr className="border-t border-navy/[.06]">
      <td className="whitespace-nowrap px-4 py-2 text-[#5B647E]">
        {order.created_on ? formatDate(order.created_on) : "—"}
      </td>
      <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-[#5B647E]">
        {order.order_id}
      </td>
      <td className="max-w-[220px] truncate px-4 py-2 text-navy" title={order.product_name ?? undefined}>
        {order.product_name ?? "—"}
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-[#5B647E]">{order.sku ?? "—"}</td>
      <td className="whitespace-nowrap px-4 py-2 text-center text-[#5B647E]">{order.quantity}</td>
      <td className="whitespace-nowrap px-4 py-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            STATUS_STYLE[order.status ?? ""] ?? "bg-brand-gray text-navy"
          }`}
        >
          {order.status ?? "—"}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-right text-navy">
        {formatCurrency(order.net_settlement)}
      </td>
      <td className="px-2 py-2">
        <form
          action={formAction}
          onBlur={(e) => e.currentTarget.requestSubmit()}
          className="flex items-center gap-1"
        >
          <input type="hidden" name="id" value={order.id} />
          <input type="hidden" name="client_id" value={clientId} />
          <input
            name="cost"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="Custo"
            inputMode="decimal"
            className={CELL_INPUT_CLASS}
          />
          <input
            name="extra_costs"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="Outros"
            inputMode="decimal"
            className={CELL_INPUT_CLASS}
          />
          <input
            name="tax_percent"
            value={tax}
            onChange={(e) => setTax(e.target.value)}
            placeholder="Imp. %"
            inputMode="decimal"
            className={`${CELL_INPUT_CLASS} w-16`}
          />
        </form>
      </td>
      <td
        className={`whitespace-nowrap px-4 py-2 text-right font-semibold ${
          margin >= 0 ? "text-green-700" : "text-red-600"
        }`}
      >
        {formatCurrency(margin)}
      </td>
    </tr>
  );
}

export function SalesOrdersTable({
  clientId,
  orders,
  clientMarketplaces,
}: {
  clientId: string;
  orders: SalesOrder[];
  clientMarketplaces: string[];
}) {
  const [marketplace, setMarketplace] = useState<string>("all");

  const months = useMemo(
    () => Array.from(new Set(orders.map((o) => o.report_month))).sort().reverse(),
    [orders],
  );
  const [month, setMonth] = useState<string>("all");

  const filtered = orders.filter(
    (o) =>
      (marketplace === "all" || o.marketplace === marketplace) &&
      (month === "all" || o.report_month === month),
  );

  const totals = filtered.reduce(
    (acc, o) => {
      acc.net += o.net_settlement;
      acc.cost += o.cost ?? 0;
      acc.extra += o.extra_costs ?? 0;
      acc.tax += (o.net_settlement * (o.tax_percent ?? 0)) / 100;
      return acc;
    },
    { net: 0, cost: 0, extra: 0, tax: 0 },
  );
  const totalMargin = totals.net - totals.cost - totals.extra - totals.tax;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select
            value={marketplace}
            onChange={(e) => setMarketplace(e.target.value)}
            className="rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-blue"
          >
            <option value="all">Todos os marketplaces</option>
            {clientMarketplaces.map((m) => (
              <option key={m} value={m}>
                {MARKETPLACE_LABEL[m] ?? m}
              </option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-blue"
          >
            <option value="all">Todos os meses</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg bg-blue/5 px-5 py-2 text-right">
          <div
            className={`font-display text-2xl font-bold leading-none ${
              totalMargin >= 0 ? "text-navy" : "text-red-600"
            }`}
          >
            {formatCurrency(totalMargin)}
          </div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#5B647E]">
            sobrou no total ({filtered.length} pedidos)
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-brand-gray">
            <tr>
              <th className="px-4 py-2 font-semibold text-navy">Data</th>
              <th className="px-4 py-2 font-semibold text-navy">Pedido</th>
              <th className="px-4 py-2 font-semibold text-navy">Produto</th>
              <th className="px-4 py-2 font-semibold text-navy">SKU</th>
              <th className="px-4 py-2 font-semibold text-navy text-center">Qtd</th>
              <th className="px-4 py-2 font-semibold text-navy">Status</th>
              <th className="px-4 py-2 font-semibold text-navy text-right">Recebido</th>
              <th className="px-2 py-2 font-semibold text-navy">Custo / Outros / Imp. %</th>
              <th className="px-4 py-2 font-semibold text-navy text-right">Sobrou</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <OrderRow key={order.id} clientId={clientId} order={order} />
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={9} className="px-5 py-8 text-center text-[#94A0BD]">
                  Nenhum pedido encontrado. Envie um documento em &quot;Importar documentos&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
