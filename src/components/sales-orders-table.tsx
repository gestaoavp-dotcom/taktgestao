"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { SalesOrder } from "@/lib/types";
import type { BreakdownLine } from "@/lib/parsers/breakdown";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { formatCurrency } from "@/lib/sales-summary";
import type { OrderBreakdown as Breakdown } from "@/lib/parsers/breakdown";
import { isExtraLine, isOrderVoided } from "@/lib/parsers/order-breakdown";
import { ORDERS_PAGE } from "@/lib/sales-columns";
import {
  getOrderBreakdown,
  listOrders,
  updateOrderCosts,
} from "@/app/(dashboard)/clientes/[id]/vendas/actions";
import type { ClientAccount } from "@/lib/types";
import type {
  MissingCost,
  OrderTotals,
} from "@/app/(dashboard)/clientes/[id]/vendas/pedidos/page";

/** A row as the page ships it: the raw report row stays in the database. */
type SlimOrder = SalesOrder;

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

function OrderBreakdown({ order, share }: { order: SlimOrder; share: number }) {
  const [showOther, setShowOther] = useState(false);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetched when the row opens, not carried by every row that never will.
  useEffect(() => {

    let live = true;
    getOrderBreakdown(order.id, share).then((result) => {
      if (!live) return;
      if ("error" in result) setError(result.error);
      else setBreakdown(result);
    });
    return () => {
      live = false;
    };
  }, [order.id, share]);

  if (!order.raw && order.marketplace === "__nunca__") {
    return (
      <p className="px-4 py-3 text-xs text-[#94A0BD]">
        Esse pedido não tem o detalhamento da planilha guardado (foi importado antes dessa
        funcionalidade existir).
      </p>
    );
  }

  if (error) return <p className="px-4 py-3 text-xs text-red-700">{error}</p>;
  if (!breakdown) {
    return <p className="px-4 py-3 text-xs text-[#94A0BD]">Carregando o detalhamento…</p>;
  }

  const { sections, net, voided, otherFields } = breakdown;
  const platform = MARKETPLACE_LABEL[order.marketplace] ?? "a plataforma";

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
                : isExtraLine(order)
                  ? "produto adicional da mesma venda — os valores estão na outra linha"
                  : `o que ${platform} repassa, antes do custo do produto e do imposto`}
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
  nets,
  cost,
  onCostChange,
  tax,
  onTaxChange,
  share,
}: {
  clientId: string;
  order: SlimOrder;
  nets: Record<string, number>;
  cost: string;
  onCostChange: (value: string) => void;
  tax: string;
  onTaxChange: (value: string) => void;
  share: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [extra, setExtra] = useState(order.extra_costs != null ? String(order.extra_costs) : "");
  const [, formAction] = useActionState(updateOrderCosts, null);

  const net = nets[order.id] ?? order.net_settlement;
  const costNum = parseFloat(cost.replace(",", ".")) || 0;
  const extraNum = parseFloat(extra.replace(",", ".")) || 0;
  const taxNum = parseFloat(tax.replace(",", ".")) || 0;
  const voided = isOrderVoided(order);
  const taxAmount = (net * taxNum) / 100;
  const margin = voided ? 0 : net - costNum - extraNum - taxAmount;

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
            <OrderBreakdown order={order} share={share} />
          </td>
        </tr>
      )}
    </>
  );
}

export function SalesOrdersTable({
  clientId,
  orders: firstPage,
  totals,
  missing,
  months,
  accounts,
  filters,
}: {
  clientId: string;
  orders: SlimOrder[];
  totals: OrderTotals;
  missing: MissingCost;
  months: { report_month: string; orders: number }[];
  accounts: ClientAccount[];
  filters: {
    month: string | null;
    marketplace: string | null;
    account: string | null;
    cost: string | null;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navigating, startNavigation] = useTransition();

  // Rows beyond the first page, fetched as they are asked for. The first page
  // comes with the document, so the table draws before any of this runs.
  const [extra, setExtra] = useState<SlimOrder[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const rows = [...firstPage, ...extra];

  const month = filters.month ?? months[0]?.report_month ?? "todos";
  const marketplace = filters.marketplace ?? "todos";
  const account = filters.account ?? "todas";
  const cost = filters.cost ?? "todos";

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    // A different filter is a different set of rows; anything already loaded
    // belongs to the old one.
    setExtra([]);
    startNavigation(() => router.push(`${pathname}?${params}`));
  };

  const stores = accounts.filter((a) => marketplace === "todos" || a.marketplace === marketplace);

  // One cost per SKU and one tax rate for the client, as the team already
  // learned in this table. Typing either shows everywhere it applies at once.
  const [costBySku, setCostBySku] = useState<Record<string, string>>({});
  const [costByOrder, setCostByOrder] = useState<Record<string, string>>({});
  const [tax, setTax] = useState(() => {
    const withTax = firstPage.find((o) => o.tax_percent != null);
    return withTax?.tax_percent != null ? String(withTax.tax_percent) : "";
  });

  const costOf = (o: SlimOrder) =>
    (o.sku ? costBySku[o.sku] : costByOrder[o.id]) ?? (o.cost != null ? String(o.cost) : "");

  const setCostOf = (o: SlimOrder, value: string) => {
    if (o.sku) setCostBySku((prev) => ({ ...prev, [o.sku as string]: value }));
    else setCostByOrder((prev) => ({ ...prev, [o.id]: value }));
  };

  const nets = Object.fromEntries(
    rows.map((o) => [o.id, Number(o.net_amount ?? o.net_settlement)]),
  );

  async function loadMore() {
    setLoadingMore(true);
    const result = await listOrders(
      {
        clientId,
        month: month === "todos" ? null : month,
        marketplace: marketplace === "todos" ? null : marketplace,
        accountId: account === "todas" ? null : account,
        missingCost: cost === "falta" ? true : cost === "preenchido" ? false : null,
      },
      rows.length,
    );
    setLoadingMore(false);
    if ("orders" in result) setExtra((prev) => [...prev, ...result.orders]);
  }

  const SELECT_CLASS =
    "rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-blue disabled:opacity-60";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className={`flex flex-wrap gap-2 ${navigating ? "opacity-60" : ""}`}>
          <select
            value={month}
            disabled={navigating}
            onChange={(e) => setFilter("mes", e.target.value)}
            className={SELECT_CLASS}
          >
            {months.map((m) => (
              <option key={m.report_month} value={m.report_month}>
                {monthLabel(m.report_month)} ({m.orders})
              </option>
            ))}
            <option value="todos">Todos os meses</option>
          </select>

          <select
            value={marketplace}
            disabled={navigating}
            onChange={(e) => setFilter("canal", e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="todos">Todos os marketplaces</option>
            {[...new Set(accounts.map((a) => a.marketplace))].map((m) => (
              <option key={m} value={m}>
                {MARKETPLACE_LABEL[m] ?? m}
              </option>
            ))}
          </select>

          {stores.length > 1 && (
            <select
              value={account}
              disabled={navigating}
              onChange={(e) => setFilter("loja", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="todas">Todas as lojas</option>
              {stores.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.store_name}
                </option>
              ))}
            </select>
          )}

          <select
            value={cost}
            disabled={navigating}
            onChange={(e) => setFilter("custo", e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="todos">Todos os custos</option>
            <option value="falta">Falta preencher o custo</option>
            <option value="preenchido">Custo já preenchido</option>
          </select>
        </div>

        <div className="flex items-stretch gap-2">
          <div className="rounded-lg bg-brand-gray/60 px-4 py-2 text-right">
            <div className="font-display text-xl font-bold leading-none text-navy">
              {formatCurrency(Number(totals.sold))}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#5B647E]">
              vendido
            </div>
          </div>
          <div className="rounded-lg bg-brand-gray/60 px-4 py-2 text-right">
            <div className="font-display text-xl font-bold leading-none text-navy">
              {formatCurrency(Number(totals.net))}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#5B647E]">
              recebido da plataforma
            </div>
          </div>
          <div className="rounded-lg bg-green-50 px-5 py-2 text-right">
            <div
              className={`font-display text-2xl font-bold leading-none ${
                Number(totals.margin) >= 0 ? "text-green-800" : "text-red-600"
              }`}
            >
              {formatCurrency(Number(totals.margin))}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#5B647E]">
              sobrou ({totals.orders} pedidos)
            </div>
          </div>
        </div>
      </div>

      {missing.lines > 0 && cost !== "preenchido" && (
        <p className="mb-4 rounded-lg bg-yellow/10 px-4 py-2.5 text-xs text-[#5B647E]">
          <button
            type="button"
            onClick={() => setFilter("custo", "falta")}
            className="font-bold text-navy underline-offset-2 hover:underline"
          >
            {missing.skus > 0 && `${missing.skus} ${missing.skus === 1 ? "SKU" : "SKUs"} sem custo`}
            {missing.skus > 0 && missing.loose > 0 && " e "}
            {missing.loose > 0 &&
              `${missing.loose} ${missing.loose === 1 ? "pedido sem SKU" : "pedidos sem SKU"}`}
          </button>{" "}
          — em {missing.lines} {missing.lines === 1 ? "pedido" : "pedidos"} deste mês. Preenchendo o
          custo em um pedido de cada SKU, o valor cola em todos os outros daquele produto.
        </p>
      )}

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
            {rows.map((order) => (
              <OrderRow
                key={order.id}
                clientId={clientId}
                order={order}
                nets={nets}
                cost={costOf(order)}
                onCostChange={(value) => setCostOf(order, value)}
                tax={tax}
                onTaxChange={setTax}
                share={1}
              />
            ))}

            {rows.length < Number(totals.lines) && (
              <tr>
                <td colSpan={11} className="px-5 py-4 text-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="rounded-lg border border-navy/10 px-4 py-2 text-xs font-semibold text-navy transition-colors hover:bg-brand-gray disabled:opacity-50"
                  >
                    {loadingMore
                      ? "Carregando..."
                      : `Ver mais ${ORDERS_PAGE} — mostrando ${rows.length} de ${totals.lines}`}
                  </button>
                </td>
              </tr>
            )}

            {!rows.length && (
              <tr>
                <td colSpan={11} className="px-5 py-8 text-center text-[#94A0BD]">
                  Nenhum pedido com esses filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
