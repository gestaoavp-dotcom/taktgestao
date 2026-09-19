"use client";

import { useMemo, useState } from "react";
import type { SalesTraffic } from "@/lib/types";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { formatCurrency } from "@/lib/sales-summary";

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

function monthLabel(reportMonth: string) {
  const [y, m] = reportMonth.split("-").map(Number);
  return `${MONTHS[m - 1]} de ${y}`;
}

function pct(value: number) {
  return `${value.toFixed(2).replace(".", ",")}%`;
}

function int(value: number) {
  return Math.round(value).toLocaleString("pt-BR");
}

/** Ratios divide the sums, never an average of each product's own ratio. */
function totalsOf(products: SalesTraffic[]) {
  const t = products.reduce(
    (acc, p) => {
      acc.impressions += p.impressions;
      acc.clicks += p.clicks;
      acc.visitors += p.visitors;
      acc.pageViews += p.page_views;
      acc.bounced += p.bounced_visitors;
      acc.cartUnits += p.cart_units;
      acc.buyers += p.buyers_paid;
      acc.likes += p.likes;
      acc.sales += Number(p.sales_paid);
      return acc;
    },
    {
      impressions: 0,
      clicks: 0,
      visitors: 0,
      pageViews: 0,
      bounced: 0,
      cartUnits: 0,
      buyers: 0,
      likes: 0,
      sales: 0,
    },
  );

  return {
    ...t,
    ctr: t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0,
    bounceRate: t.visitors > 0 ? (t.bounced / t.visitors) * 100 : 0,
    conversion: t.visitors > 0 ? (t.buyers / t.visitors) * 100 : 0,
    pagesPerVisitor: t.visitors > 0 ? t.pageViews / t.visitors : 0,
  };
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-navy">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-[#94A0BD]">{hint}</p>}
    </div>
  );
}

export function SalesTrafficTable({
  products,
  clientMarketplaces,
}: {
  products: SalesTraffic[];
  clientMarketplaces: string[];
}) {
  const [marketplace, setMarketplace] = useState<string>("all");
  const months = useMemo(
    () => Array.from(new Set(products.map((p) => p.report_month))).sort().reverse(),
    [products],
  );
  const [month, setMonth] = useState<string>("all");

  const filtered = products.filter(
    (p) =>
      !p.is_variation &&
      (marketplace === "all" || p.marketplace === marketplace) &&
      (month === "all" || p.report_month === month),
  );

  const t = totalsOf(filtered);
  const ranked = [...filtered].sort((a, b) => b.visitors - a.visitors);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
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

      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#94A0BD]">
        Todos os produtos somados ({filtered.length})
      </h2>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Impressões" value={int(t.impressions)} hint="quantas vezes apareceu" />
        <Stat label="Cliques" value={int(t.clicks)} hint={`CTR ${pct(t.ctr)}`} />
        <Stat
          label="Visitantes"
          value={int(t.visitors)}
          hint={`${t.pagesPerVisitor.toFixed(1).replace(".", ",")} páginas cada`}
        />
        <Stat label="Taxa de rejeição" value={pct(t.bounceRate)} hint="saíram sem interagir" />
        <Stat label="Adições ao carrinho" value={int(t.cartUnits)} />
        <Stat label="Compradores" value={int(t.buyers)} hint="pedidos pagos" />
        <Stat label="Conversão" value={pct(t.conversion)} hint="compradores ÷ visitantes" />
        <Stat label="Vendas pagas" value={formatCurrency(t.sales)} />
      </div>

      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#94A0BD]">
        Por produto (mais visitados primeiro)
      </h2>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-brand-gray">
            <tr>
              <th className="px-4 py-2 font-semibold text-navy">Produto</th>
              <th className="px-4 py-2 font-semibold text-navy">SKU</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">Impressões</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">Cliques</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">CTR</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">Visitantes</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">Rejeição</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">Carrinho</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">Conversão</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">Vendas</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p) => {
              const ctr = p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0;
              const bounce = p.visitors > 0 ? (p.bounced_visitors / p.visitors) * 100 : 0;
              const conv = p.visitors > 0 ? (p.buyers_paid / p.visitors) * 100 : 0;

              return (
                <tr key={p.id} className="border-t border-navy/[.06]">
                  <td className="max-w-[240px] truncate px-4 py-2 text-navy" title={p.product_name}>
                    {p.product_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-[#5B647E]">{p.sku ?? "—"}</td>
                  <td className="px-4 py-2 text-right text-[#5B647E]">{int(p.impressions)}</td>
                  <td className="px-4 py-2 text-right text-[#5B647E]">{int(p.clicks)}</td>
                  <td className="px-4 py-2 text-right text-[#5B647E]">{pct(ctr)}</td>
                  <td className="px-4 py-2 text-right text-navy">{int(p.visitors)}</td>
                  <td
                    className={`px-4 py-2 text-right ${
                      bounce >= 50 ? "font-semibold text-red-600" : "text-[#5B647E]"
                    }`}
                  >
                    {pct(bounce)}
                  </td>
                  <td className="px-4 py-2 text-right text-[#5B647E]">{int(p.cart_units)}</td>
                  <td
                    className={`px-4 py-2 text-right font-semibold ${
                      conv >= 3 ? "text-green-700" : conv >= 1 ? "text-navy" : "text-red-600"
                    }`}
                  >
                    {pct(conv)}
                  </td>
                  <td className="px-4 py-2 text-right text-navy">
                    {formatCurrency(Number(p.sales_paid))}
                  </td>
                </tr>
              );
            })}
            {!ranked.length && (
              <tr>
                <td colSpan={10} className="px-5 py-8 text-center text-[#94A0BD]">
                  Nenhum dado de tráfego nesse filtro. Importe um documento de Tráfego em
                  &quot;Importar documentos&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-[#94A0BD]">
        Variações de produto não aparecem aqui: o relatório da Shopee registra o tráfego no produto
        principal, então contá-las somaria o mesmo visitante duas vezes.
      </p>
    </div>
  );
}
