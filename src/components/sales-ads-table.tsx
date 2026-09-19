"use client";

import { useMemo, useState } from "react";
import type { SalesAd } from "@/lib/types";
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
  return value.toLocaleString("pt-BR");
}

const STATUS_STYLE: Record<string, string> = {
  "Em Andamento": "bg-green-100 text-green-700",
  Pausado: "bg-brand-gray text-navy",
  Encerrado: "bg-red-50 text-red-700",
};

/** Ratios always divide the sums — never an average of each ad's own ratio. */
function totalsOf(ads: SalesAd[]) {
  const t = ads.reduce(
    (acc, a) => {
      acc.impressions += a.impressions;
      acc.clicks += a.clicks;
      acc.addToCart += a.add_to_cart;
      acc.conversions += a.conversions;
      acc.itemsSold += a.items_sold;
      acc.gmv += Number(a.gmv);
      acc.expense += Number(a.expense);
      return acc;
    },
    { impressions: 0, clicks: 0, addToCart: 0, conversions: 0, itemsSold: 0, gmv: 0, expense: 0 },
  );

  return {
    ...t,
    ctr: t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0,
    conversionRate: t.clicks > 0 ? (t.conversions / t.clicks) * 100 : 0,
    roas: t.expense > 0 ? t.gmv / t.expense : 0,
    acos: t.gmv > 0 ? (t.expense / t.gmv) * 100 : 0,
    costPerConversion: t.conversions > 0 ? t.expense / t.conversions : 0,
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

export function SalesAdsTable({
  ads,
  clientMarketplaces,
}: {
  ads: SalesAd[];
  clientMarketplaces: string[];
}) {
  const [marketplace, setMarketplace] = useState<string>("all");
  const months = useMemo(
    () => Array.from(new Set(ads.map((a) => a.report_month))).sort().reverse(),
    [ads],
  );
  const [month, setMonth] = useState<string>("all");

  const filtered = ads.filter(
    (a) =>
      (marketplace === "all" || a.marketplace === marketplace) &&
      (month === "all" || a.report_month === month),
  );

  const t = totalsOf(filtered);

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
        Todos os anúncios somados ({filtered.length})
      </h2>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Investimento" value={formatCurrency(t.expense)} />
        <Stat label="GMV gerado" value={formatCurrency(t.gmv)} hint="venda atribuída aos anúncios" />
        <Stat label="ROAS" value={t.roas.toFixed(2)} hint="retorno por real investido" />
        <Stat label="ACOS" value={pct(t.acos)} hint="quanto do GMV foi para anúncio" />
        <Stat label="Impressões" value={int(t.impressions)} />
        <Stat label="Cliques" value={int(t.clicks)} hint={`CTR ${pct(t.ctr)}`} />
        <Stat
          label="Conversões"
          value={int(t.conversions)}
          hint={`taxa ${pct(t.conversionRate)} · ${formatCurrency(t.costPerConversion)} cada`}
        />
        <Stat label="Itens vendidos" value={int(t.itemsSold)} />
      </div>

      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#94A0BD]">
        Por anúncio
      </h2>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-brand-gray">
            <tr>
              <th className="px-4 py-2 font-semibold text-navy">Anúncio</th>
              <th className="px-4 py-2 font-semibold text-navy">Status</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">Impressões</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">Cliques</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">CTR</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">Conversões</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">Itens</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">Investido</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">GMV</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">ROAS</th>
              <th className="px-4 py-2 text-right font-semibold text-navy">ACOS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ad) => {
              const expense = Number(ad.expense);
              const gmv = Number(ad.gmv);
              const roas = expense > 0 ? gmv / expense : 0;
              const acos = gmv > 0 ? (expense / gmv) * 100 : 0;
              const ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0;

              return (
                <tr key={ad.id} className="border-t border-navy/[.06]">
                  <td className="max-w-[260px] truncate px-4 py-2 text-navy" title={ad.ad_name}>
                    {ad.ad_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        STATUS_STYLE[ad.status ?? ""] ?? "bg-brand-gray text-navy"
                      }`}
                    >
                      {ad.status ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-[#5B647E]">{int(ad.impressions)}</td>
                  <td className="px-4 py-2 text-right text-[#5B647E]">{int(ad.clicks)}</td>
                  <td className="px-4 py-2 text-right text-[#5B647E]">{pct(ctr)}</td>
                  <td className="px-4 py-2 text-right text-[#5B647E]">{int(ad.conversions)}</td>
                  <td className="px-4 py-2 text-right text-[#5B647E]">{int(ad.items_sold)}</td>
                  <td className="px-4 py-2 text-right text-navy">{formatCurrency(expense)}</td>
                  <td className="px-4 py-2 text-right text-navy">{formatCurrency(gmv)}</td>
                  <td
                    className={`px-4 py-2 text-right font-semibold ${
                      roas >= 4 ? "text-green-700" : roas >= 2 ? "text-navy" : "text-red-600"
                    }`}
                  >
                    {roas.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right text-[#5B647E]">{pct(acos)}</td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td colSpan={11} className="px-5 py-8 text-center text-[#94A0BD]">
                  Nenhum anúncio nesse filtro. Importe um documento de Ads em &quot;Importar
                  documentos&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
