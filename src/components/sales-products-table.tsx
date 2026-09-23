"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { SalesProduct } from "@/lib/types";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { formatCurrency } from "@/lib/sales-summary";

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

function ProductRow({ product }: { product: SalesProduct }) {
  const [open, setOpen] = useState(false);
  const costs = Object.entries(product.costs ?? {});
  const negative = product.net_revenue < 0;

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
        <td className="whitespace-nowrap px-4 py-2 text-right text-[#5B647E]">
          {formatCurrency(product.average_price)}
        </td>
        <td
          className={`whitespace-nowrap px-4 py-2 text-right font-semibold ${
            negative ? "text-red-600" : "text-navy"
          }`}
        >
          {formatCurrency(product.net_revenue)}
        </td>
        <td className="whitespace-nowrap px-4 py-2 text-right text-[#5B647E]">
          {product.net_sales > 0
            ? `${Math.round((product.net_revenue / product.net_sales) * 100)}%`
            : "—"}
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
              <li className="mt-1 flex justify-between rounded bg-green-50 px-2 py-1.5">
                <span className="font-bold text-green-800">Receita líquida</span>
                <span className="font-bold text-green-800">
                  {formatCurrency(product.net_revenue)}
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

export function SalesProductsTable({ products }: { products: SalesProduct[] }) {
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
          <div className="rounded-lg bg-green-50 px-5 py-2 text-right">
            <div
              className={`font-display text-2xl font-bold leading-none ${
                sumNet >= 0 ? "text-green-800" : "text-red-600"
              }`}
            >
              {formatCurrency(sumNet)}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#5B647E]">
              receita líquida ({rows.length} produtos)
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
              <th className="px-4 py-2 text-right font-semibold text-navy">Preço médio</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">Receita líquida</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">Margem</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((product) => (
              <ProductRow key={product.id} product={product} />
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
