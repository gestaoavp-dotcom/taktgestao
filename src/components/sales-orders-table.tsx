"use client";

import { useActionState, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { SalesOrder } from "@/lib/types";
import type { BreakdownLine } from "@/lib/parsers/shopee-breakdown";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { formatCurrency } from "@/lib/sales-summary";
import { buildShopeeBreakdown, computeShopeeNet } from "@/lib/parsers/shopee-breakdown";
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

/** What the marketplace actually deposits, before the seller's own costs. */
function netOf(order: SalesOrder) {
  return order.raw ? computeShopeeNet(order.raw) : order.net_settlement;
}

function OrderBreakdown({ order }: { order: SalesOrder }) {
  const [showOther, setShowOther] = useState(false);

  if (!order.raw) {
    return (
      <p className="px-4 py-3 text-xs text-[#94A0BD]">
        Esse pedido não tem o detalhamento da planilha guardado (foi importado antes dessa
        funcionalidade existir).
      </p>
    );
  }

  const { sections, net, voided, otherFields } = buildShopeeBreakdown(order.raw);

  const renderLine = (line: BreakdownLine, i: number) => {
    const isDeduction = line.kind === "deduction";
    const muted = line.value === 0 || line.kind === "info";

    return (
      <li
        key={`${line.label}-${i}`}
        className="flex items-start justify-between gap-3 border-b border-navy/[.04] py-1"
      >
        <span className="flex flex-col">
          <span className={muted ? "text-[#94A0BD]" : "text-[#5B647E]"}>{line.label}</span>
          {line.note && <span className="text-[11px] text-[#94A0BD]">{line.note}</span>}
        </span>
        <span
          className={`whitespace-nowrap ${
            muted ? "text-[#94A0BD]" : isDeduction ? "font-medium text-red-600" : "text-navy"
          }`}
        >
          {isDeduction && line.value !== 0 ? "− " : ""}
          {formatCurrency(line.value)}
        </span>
      </li>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-6 px-4 py-4">
      <div>
        {sections.map((section) => (
          <div key={section.title} className="mb-4">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-[#94A0BD]">
                {section.title}
                {section.note && (
                  <span className="ml-2 font-semibold normal-case text-red-600">{section.note}</span>
                )}
              </p>
              {section.counted !== false && (
                <span
                  className={`text-sm font-bold ${
                    section.subtracted && section.total !== 0 ? "text-red-600" : "text-navy"
                  }`}
                >
                  {section.subtracted && section.total !== 0 ? "− " : ""}
                  {formatCurrency(section.total)}
                </span>
              )}
            </div>
            <ul className="flex flex-col gap-1 pl-3 text-sm">{section.lines.map(renderLine)}</ul>
          </div>
        ))}

        <div className="flex items-baseline justify-between gap-3 rounded bg-green-50 px-3 py-2">
          <span className="flex flex-col">
            <span className="font-bold text-green-800">Renda estimada do pedido</span>
            <span className="text-[11px] text-[#5B647E]">
              {voided
                ? "pedido cancelado/reembolsado — nada foi recebido"
                : "o que a Shopee repassa, antes do custo do produto e do imposto"}
            </span>
          </span>
          <span className="whitespace-nowrap font-display text-lg font-bold text-green-800">
            {formatCurrency(net)}
          </span>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowOther((v) => !v)}
          className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[#94A0BD] hover:text-navy"
        >
          {showOther ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Todos os outros campos da planilha ({otherFields.length})
        </button>
        {showOther && (
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto text-xs">
            {otherFields.map(({ label, value }) => (
              <li key={label} className="flex justify-between gap-3 border-b border-navy/[.04] py-1">
                <span className="text-[#94A0BD]">{label}</span>
                <span className="truncate text-right text-[#5B647E]">{String(value ?? "—")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function OrderRow({
  clientId,
  order,
  cost,
  onCostChange,
  tax,
  onTaxChange,
}: {
  clientId: string;
  order: SalesOrder;
  cost: string;
  onCostChange: (value: string) => void;
  tax: string;
  onTaxChange: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [extra, setExtra] = useState(order.extra_costs != null ? String(order.extra_costs) : "");
  const [, formAction] = useActionState(updateOrderCosts, null);

  const net = netOf(order);
  const costNum = parseFloat(cost.replace(",", ".")) || 0;
  const extraNum = parseFloat(extra.replace(",", ".")) || 0;
  const taxNum = parseFloat(tax.replace(",", ".")) || 0;
  const taxAmount = (net * taxNum) / 100;
  const margin = net - costNum - extraNum - taxAmount;

  return (
    <>
      <tr className="cursor-pointer border-t border-navy/[.06] hover:bg-brand-gray/30">
        <td className="px-2 py-2" onClick={() => setExpanded((v) => !v)}>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-[#94A0BD]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#94A0BD]" />
          )}
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-[#5B647E]" onClick={() => setExpanded((v) => !v)}>
          {order.created_on ? formatDate(order.created_on) : "—"}
        </td>
        <td
          className="whitespace-nowrap px-4 py-2 font-mono text-xs text-[#5B647E]"
          onClick={() => setExpanded((v) => !v)}
        >
          {order.order_id}
        </td>
        <td
          className="max-w-[200px] truncate px-4 py-2 text-navy"
          title={order.product_name ?? undefined}
          onClick={() => setExpanded((v) => !v)}
        >
          {order.product_name ?? "—"}
        </td>
        <td className="whitespace-nowrap px-4 py-2 text-[#5B647E]" onClick={() => setExpanded((v) => !v)}>
          {order.sku ?? "—"}
        </td>
        <td
          className="whitespace-nowrap px-4 py-2 text-center text-[#5B647E]"
          onClick={() => setExpanded((v) => !v)}
        >
          {order.quantity}
        </td>
        <td className="whitespace-nowrap px-4 py-2" onClick={() => setExpanded((v) => !v)}>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              STATUS_STYLE[order.status ?? ""] ?? "bg-brand-gray text-navy"
            }`}
          >
            {order.status ?? "—"}
          </span>
        </td>
        <td
          className="whitespace-nowrap px-4 py-2 text-right text-navy"
          onClick={() => setExpanded((v) => !v)}
        >
          {formatCurrency(order.subtotal)}
        </td>
        <td
          className="whitespace-nowrap px-4 py-2 text-right text-navy"
          onClick={() => setExpanded((v) => !v)}
        >
          {formatCurrency(net)}
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
              onChange={(e) => onCostChange(e.target.value)}
              placeholder="Custo"
              inputMode="decimal"
              title={
                order.sku ? `Custo do SKU ${order.sku} — vale para todos os pedidos dele` : undefined
              }
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
              onChange={(e) => onTaxChange(e.target.value)}
              placeholder="Imp. %"
              inputMode="decimal"
              title="Imposto — vale para todos os pedidos do cliente"
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
      {expanded && (
        <tr className="border-t border-navy/[.06] bg-brand-gray/20">
          <td colSpan={11}>
            <OrderBreakdown order={order} />
          </td>
        </tr>
      )}
    </>
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

  // One cost per SKU: typing it on any order shows up on every order of that
  // product right away, while the server does the same to the stored rows.
  const [costBySku, setCostBySku] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const o of orders) {
      if (o.sku && o.cost != null) map[o.sku] = String(o.cost);
    }
    return map;
  });
  const [costByOrder, setCostByOrder] = useState<Record<string, string>>({});

  // One tax rate for the whole client.
  const [tax, setTax] = useState(() => {
    const withTax = orders.find((o) => o.tax_percent != null);
    return withTax?.tax_percent != null ? String(withTax.tax_percent) : "";
  });

  const costOf = (o: SalesOrder) =>
    (o.sku ? costBySku[o.sku] : costByOrder[o.id]) ?? (o.cost != null ? String(o.cost) : "");

  const setCostOf = (o: SalesOrder, value: string) => {
    if (o.sku) setCostBySku((prev) => ({ ...prev, [o.sku as string]: value }));
    else setCostByOrder((prev) => ({ ...prev, [o.id]: value }));
  };

  const filtered = orders.filter(
    (o) =>
      (marketplace === "all" || o.marketplace === marketplace) &&
      (month === "all" || o.report_month === month),
  );

  const totals = filtered.reduce(
    (acc, o) => {
      const net = netOf(o);
      acc.sold += o.subtotal;
      acc.net += net;
      acc.cost += parseFloat(costOf(o).replace(",", ".")) || 0;
      acc.extra += o.extra_costs ?? 0;
      acc.tax += (net * (parseFloat(tax.replace(",", ".")) || 0)) / 100;
      return acc;
    },
    { sold: 0, net: 0, cost: 0, extra: 0, tax: 0 },
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

        <div className="flex items-stretch gap-2">
          <div className="rounded-lg bg-brand-gray/60 px-4 py-2 text-right">
            <div className="font-display text-xl font-bold leading-none text-navy">
              {formatCurrency(totals.sold)}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#5B647E]">
              vendido
            </div>
          </div>
          <div className="rounded-lg bg-brand-gray/60 px-4 py-2 text-right">
            <div className="font-display text-xl font-bold leading-none text-navy">
              {formatCurrency(totals.net)}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#5B647E]">
              recebido da plataforma
            </div>
          </div>
          <div className="rounded-lg bg-green-50 px-5 py-2 text-right">
            <div
              className={`font-display text-2xl font-bold leading-none ${
                totalMargin >= 0 ? "text-green-800" : "text-red-600"
              }`}
            >
              {formatCurrency(totalMargin)}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#5B647E]">
              sobrou ({filtered.length} pedidos)
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[1250px] text-left text-sm">
          <thead className="bg-brand-gray">
            <tr>
              <th className="px-2 py-2" />
              <th className="px-2 py-2 font-semibold text-navy">Data</th>
              <th className="px-4 py-2 font-semibold text-navy">Pedido</th>
              <th className="px-4 py-2 font-semibold text-navy">Produto</th>
              <th className="px-4 py-2 font-semibold text-navy">SKU</th>
              <th className="px-4 py-2 text-center font-semibold text-navy">Qtd</th>
              <th className="px-4 py-2 font-semibold text-navy">Status</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">Preço de venda</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">Recebido</th>
              <th className="px-2 py-2 font-semibold text-navy">Custo / Outros / Imp. %</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">Sobrou</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <OrderRow
                key={order.id}
                clientId={clientId}
                order={order}
                cost={costOf(order)}
                onCostChange={(value) => setCostOf(order, value)}
                tax={tax}
                onTaxChange={setTax}
              />
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={11} className="px-5 py-8 text-center text-[#94A0BD]">
                  Nenhum pedido encontrado. Envie um documento em &quot;Importar documentos&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-[#94A0BD]">
        Clique numa linha pra ver o detalhamento completo: preço de venda, todos os descontos da
        planilha (em vermelho) e o valor final recebido.
      </p>
    </div>
  );
}
