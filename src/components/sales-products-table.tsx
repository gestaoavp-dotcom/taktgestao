"use client";

import { useActionState, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { SalesProduct } from "@/lib/types";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { formatCurrency } from "@/lib/sales-summary";
import { updateProductCosts } from "@/app/(dashboard)/clientes/[id]/vendas/actions";

const CELL_INPUT_CLASS =
  "w-16 rounded border border-navy/10 bg-white px-1.5 py-1 text-right text-xs text-navy outline-none focus:border-blue";

/** Per unit, so a cost can be compared with what the product brought in. */
function perUnit(value: number, units: number) {
  return units > 0 ? value / units : 0;
}

// The month's result per listing. Amazon settles this way — no orders anywhere
// in the report — so the table is a small P&L per product rather than a list of
// sales.

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function monthLabel(reportMonth: string) {
  const [y, m] = reportMonth.split("-").map(Number);
  return `${MONTHS[m - 1]} de ${y}`;
}

function ProductRow({
  clientId,
  product,
  cost,
  onCostChange,
  tax,
  onTaxChange,
}: {
  clientId: string;
  product: SalesProduct;
  cost: string;
  onCostChange: (value: string) => void;
  tax: string;
  onTaxChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [extra, setExtra] = useState(product.extra_costs != null ? String(product.extra_costs) : "");
  const [, formAction] = useActionState(updateProductCosts, null);

  const costs = Object.entries(product.costs ?? {});
  const negative = product.net_revenue < 0;

  const units = product.units_net;
  const unitCost = parseFloat(cost.replace(",", ".")) || 0;
  const extraNum = parseFloat(extra.replace(",", ".")) || 0;
  const taxNum = parseFloat(tax.replace(",", ".")) || 0;

  const costTotal = unitCost * units;
  const taxTotal = (Number(product.net_revenue) * taxNum) / 100;
  const profit = Number(product.net_revenue) - costTotal - extraNum - taxTotal;

  return (
    <>
      <tr
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer border-t border-navy/[.06] hover:bg-brand-gray/30"
      >
        <td className="px-2 py-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-[#94A0BD]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#94A0BD]" />
          )}
        </td>
        <td className="max-w-[320px] px-4 py-2">
          <p className="truncate text-navy" title={product.product_name ?? undefined}>
            {product.product_name ?? "—"}
          </p>
          <p className="font-mono text-[11px] text-[#94A0BD]">
            {product.external_id ?? "—"}
            {product.sku && ` · ${product.sku}`}
          </p>
        </td>
        <td className="whitespace-nowrap px-4 py-2 text-center text-[#5B647E]">
          {product.units_net}
          {product.units_refunded > 0 && (
            <span className="ml-1 text-[11px] text-red-600">−{product.units_refunded}</span>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-2 text-right text-navy">
          {formatCurrency(product.net_sales)}
        </td>
        <td
          className={`whitespace-nowrap px-4 py-2 text-right font-semibold ${
            negative ? "text-red-600" : "text-navy"
          }`}
        >
          {formatCurrency(product.net_revenue)}
          <span className="ml-1 text-[11px] font-normal text-[#94A0BD]">
            {formatCurrency(perUnit(Number(product.net_revenue), units))}/un
          </span>
        </td>
        <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
          <form
            action={formAction}
            onBlur={(e) => e.currentTarget.requestSubmit()}
            className="flex items-center gap-1"
          >
            <input type="hidden" name="id" value={product.id} />
            <input type="hidden" name="client_id" value={clientId} />
            <input
              name="unit_cost"
              value={cost}
              onChange={(e) => onCostChange(e.target.value)}
              placeholder="Custo/un"
              inputMode="decimal"
              title={
                product.sku
                  ? `Custo por unidade do SKU ${product.sku} — vale para todos os meses dele`
                  : undefined
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
              placeholder="Imp.%"
              inputMode="decimal"
              className={CELL_INPUT_CLASS}
            />
          </form>
        </td>
        <td
          className={`whitespace-nowrap px-4 py-2 text-right font-bold ${
            profit >= 0 ? "text-green-700" : "text-red-600"
          }`}
        >
          {formatCurrency(profit)}
          <span className="ml-1 block text-[11px] font-normal text-[#94A0BD]">
            {formatCurrency(perUnit(profit, units))}/un
          </span>
        </td>
      </tr>

      {open && (
        <tr className="border-t border-navy/[.04] bg-brand-gray/20">
          <td />
          <td colSpan={6} className="px-4 py-3">
            <ul className="flex max-w-lg flex-col gap-1 text-sm">
              <li className="flex justify-between border-b border-navy/[.06] py-1">
                <span className="text-[#5B647E]">Vendas líquidas</span>
                <span className="text-navy">{formatCurrency(product.net_sales)}</span>
              </li>
              {costs.map(([label, value]) => (
                <li key={label} className="flex justify-between border-b border-navy/[.04] py-1">
                  <span className="text-[#5B647E]">{label}</span>
                  <span className={value >= 0 ? "text-red-600" : "text-green-700"}>
                    {value >= 0 ? "− " : "+ "}
                    {formatCurrency(Math.abs(value))}
                  </span>
                </li>
              ))}
              <li className="mt-1 flex justify-between rounded bg-brand-gray px-2 py-1.5">
                <span className="font-bold text-navy">Receita líquida da Amazon</span>
                <span className="font-bold text-navy">{formatCurrency(product.net_revenue)}</span>
              </li>
              <li className="flex justify-between border-b border-navy/[.04] py-1">
                <span className="text-[#5B647E]">
                  Custo do produto{units > 0 && ` (${formatCurrency(unitCost)} × ${units} un)`}
                </span>
                <span className="text-red-600">− {formatCurrency(costTotal)}</span>
              </li>
              {extraNum !== 0 && (
                <li className="flex justify-between border-b border-navy/[.04] py-1">
                  <span className="text-[#5B647E]">Outros custos</span>
                  <span className="text-red-600">− {formatCurrency(extraNum)}</span>
                </li>
              )}
              <li className="flex justify-between border-b border-navy/[.04] py-1">
                <span className="text-[#5B647E]">Imposto ({taxNum}%)</span>
                <span className="text-red-600">− {formatCurrency(taxTotal)}</span>
              </li>
              <li
                className={`mt-1 flex justify-between rounded px-2 py-1.5 ${
                  profit >= 0 ? "bg-green-50" : "bg-red-50"
                }`}
              >
                <span className={`font-bold ${profit >= 0 ? "text-green-800" : "text-red-700"}`}>
                  Sobrou
                </span>
                <span className={`font-bold ${profit >= 0 ? "text-green-800" : "text-red-700"}`}>
                  {formatCurrency(profit)}
                  {units > 0 && (
                    <span className="ml-1 font-normal">
                      ({formatCurrency(perUnit(profit, units))}/un)
                    </span>
                  )}
                </span>
              </li>
              <li className="flex justify-between pt-1 text-xs text-[#94A0BD]">
                <span>Total de vendas (antes de devoluções)</span>
                <span>{formatCurrency(product.gross_sales)}</span>
              </li>
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}

export function SalesProductsTable({
  clientId,
  products,
}: {
  clientId: string;
  products: SalesProduct[];
}) {
  // One cost per SKU and one tax rate per client, both shared across the table
  // so typing in any row updates every row it applies to at once.
  const [costBySku, setCostBySku] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const p of products) {
      if (p.sku && p.unit_cost != null) map[p.sku] = String(p.unit_cost);
    }
    return map;
  });
  const [costById, setCostById] = useState<Record<string, string>>({});
  const [tax, setTax] = useState(() => {
    const withTax = products.find((p) => p.tax_percent != null);
    return withTax?.tax_percent != null ? String(withTax.tax_percent) : "";
  });

  const costOf = (p: SalesProduct) =>
    (p.sku ? costBySku[p.sku] : costById[p.id]) ?? (p.unit_cost != null ? String(p.unit_cost) : "");

  const setCostOf = (p: SalesProduct, value: string) => {
    if (p.sku) setCostBySku((prev) => ({ ...prev, [p.sku as string]: value }));
    else setCostById((prev) => ({ ...prev, [p.id]: value }));
  };

  const months = useMemo(
    () => [...new Set(products.map((p) => p.report_month))].sort().reverse(),
    [products],
  );
  const [month, setMonth] = useState<string>("all");

  const scoped = products.filter((p) => month === "all" || p.report_month === month);
  const rows = scoped.filter((p) => !p.is_total);
  const totals = scoped.filter((p) => p.is_total);

  const sumNet = rows.reduce((s, p) => s + Number(p.net_revenue), 0);
  const sumSales = rows.reduce((s, p) => s + Number(p.net_sales), 0);
  const sumUnits = rows.reduce((s, p) => s + p.units_net, 0);
  const sumProfit = rows.reduce((s, p) => {
    const unitCost = parseFloat(costOf(p).replace(",", ".")) || 0;
    const taxNum = parseFloat(tax.replace(",", ".")) || 0;
    return (
      s +
      Number(p.net_revenue) -
      unitCost * p.units_net -
      (p.extra_costs ?? 0) -
      (Number(p.net_revenue) * taxNum) / 100
    );
  }, 0);

  // Amazon bills some things to the account rather than to a listing, so its
  // own total is not the sum of the products. The gap is shown, not hidden.
  const reported = totals.reduce((s, p) => s + Number(p.net_revenue), 0);
  const unassigned = totals.length ? Math.round((reported - sumNet) * 100) / 100 : 0;

  if (!products.length) {
    return (
      <p className="rounded-lg bg-white px-5 py-10 text-center text-sm text-[#94A0BD] shadow-sm">
        Nenhum relatório de produtos importado ainda. Envie um em &quot;Importar
        documentos&quot; escolhendo o tipo Produtos.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
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

        <div className="flex items-stretch gap-2">
          <div className="rounded-lg bg-brand-gray/60 px-4 py-2 text-right">
            <div className="font-display text-xl font-bold leading-none text-navy">
              {formatCurrency(sumSales)}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#5B647E]">
              vendas líquidas
            </div>
          </div>
          <div className="rounded-lg bg-brand-gray/60 px-4 py-2 text-right">
            <div className="font-display text-xl font-bold leading-none text-navy">{sumUnits}</div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#5B647E]">
              unidades
            </div>
          </div>
          <div className="rounded-lg bg-brand-gray/60 px-4 py-2 text-right">
            <div className="font-display text-xl font-bold leading-none text-navy">
              {formatCurrency(sumNet)}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#5B647E]">
              receita líquida
            </div>
          </div>
          <div className="rounded-lg bg-green-50 px-5 py-2 text-right">
            <div
              className={`font-display text-2xl font-bold leading-none ${
                sumProfit >= 0 ? "text-green-800" : "text-red-600"
              }`}
            >
              {formatCurrency(sumProfit)}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#5B647E]">
              sobrou ({rows.length} produtos)
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-brand-gray">
            <tr>
              <th className="px-2 py-2" />
              <th className="px-4 py-2 font-semibold text-navy">Produto</th>
              <th className="px-4 py-2 text-center font-semibold text-navy">Unid.</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">Vendas líquidas</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">Receita líquida</th>
              <th className="px-2 py-2 font-semibold text-navy">Custo/un · Outros · Imp.%</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">Sobrou</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((product) => (
              <ProductRow
                key={product.id}
                clientId={clientId}
                product={product}
                cost={costOf(product)}
                onCostChange={(value) => setCostOf(product, value)}
                tax={tax}
                onTaxChange={setTax}
              />
            ))}
          </tbody>
        </table>
      </div>

      {unassigned !== 0 && (
        <p className="mt-3 rounded-lg bg-yellow/10 px-4 py-2.5 text-xs text-[#5B647E]">
          A {MARKETPLACE_LABEL[scoped[0].marketplace] ?? scoped[0].marketplace} informa{" "}
          <strong className="text-navy">{formatCurrency(reported)}</strong> de receita líquida no
          período — <strong className="text-navy">{formatCurrency(unassigned)}</strong> a mais que a
          soma dos produtos. É o que ela cobra ou credita da conta inteira, sem atribuir a nenhum
          anúncio.
        </p>
      )}
    </div>
  );
}
