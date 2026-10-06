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
  "Em Andamento": "bg-pos/15 text-pos",
  Pausado: "bg-panel-2 text-ink",
  Encerrado: "bg-danger/10 text-danger",
};

/** Ratios always divide the sums — never an average of each ad's own ratio. */
/**
 * One row per campaign. Some reports split a campaign by week and by ad space
 * — Mercado Livre's placement report runs to 165 rows for 20 campaigns — and
 * listing the slices reads as the same ad repeated. The figures are absolute,
 * so the slices add up; the status is the newest slice's.
 */
function byCampaign(ads: SalesAd[]): SalesAd[] {
  const map = new Map<string, SalesAd>();
  for (const a of ads) {
    const key = `${a.marketplace}|${a.ad_name}`;
    const e = map.get(key);
    if (!e) {
      map.set(key, { ...a, id: key });
      continue;
    }
    const newer = (a.ended_on ?? a.started_on ?? "") >= (e.ended_on ?? e.started_on ?? "");
    map.set(key, {
      ...e,
      status: newer ? a.status : e.status,
      ended_on: newer ? a.ended_on : e.ended_on,
      started_on: newer ? a.started_on : e.started_on,
      impressions: e.impressions + a.impressions,
      clicks: e.clicks + a.clicks,
      add_to_cart: e.add_to_cart + a.add_to_cart,
      conversions: e.conversions + a.conversions,
      items_sold: e.items_sold + a.items_sold,
      gmv: Number(e.gmv) + Number(a.gmv),
      expense: Number(e.expense) + Number(a.expense),
    });
  }
  return [...map.values()].sort((x, y) => Number(y.expense) - Number(x.expense));
}

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
    <div className="lift rounded-2xl bg-panel p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-ink-3">{hint}</p>}
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
  const campaigns = byCampaign(filtered);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={marketplace}
          onChange={(e) => setMarketplace(e.target.value)}
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent"
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
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        >
          <option value="all">Todos os meses</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
      </div>

      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-3">
        Todos os anúncios somados ({campaigns.length})
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

      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-3">
        Por anúncio
      </h2>
      <div className="lift overflow-x-auto rounded-2xl bg-panel shadow-sm">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-panel-2">
            <tr>
              <th className="px-4 py-2 font-semibold text-ink">Anúncio</th>
              <th className="px-4 py-2 font-semibold text-ink">Status</th>
              <th className="px-4 py-2 text-right font-semibold text-ink">Impressões</th>
              <th className="px-4 py-2 text-right font-semibold text-ink">Cliques</th>
              <th className="px-4 py-2 text-right font-semibold text-ink">CTR</th>
              <th className="px-4 py-2 text-right font-semibold text-ink">Conversões</th>
              <th className="px-4 py-2 text-right font-semibold text-ink">Itens</th>
              <th className="px-4 py-2 text-right font-semibold text-ink">Investido</th>
              <th className="px-4 py-2 text-right font-semibold text-ink">GMV</th>
              <th className="px-4 py-2 text-right font-semibold text-ink">ROAS</th>
              <th className="px-4 py-2 text-right font-semibold text-ink">ACOS</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((ad) => {
              const expense = Number(ad.expense);
              const gmv = Number(ad.gmv);
              const roas = expense > 0 ? gmv / expense : 0;
              const acos = gmv > 0 ? (expense / gmv) * 100 : 0;
              const ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0;

              return (
                <tr key={ad.id} className="border-t border-line-soft">
                  <td className="max-w-[260px] truncate px-4 py-2 text-ink" title={ad.ad_name}>
                    {ad.ad_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        STATUS_STYLE[ad.status ?? ""] ?? "bg-panel-2 text-ink"
                      }`}
                    >
                      {ad.status ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-ink-2">{int(ad.impressions)}</td>
                  <td className="px-4 py-2 text-right text-ink-2">{int(ad.clicks)}</td>
                  <td className="px-4 py-2 text-right text-ink-2">{pct(ctr)}</td>
                  <td className="px-4 py-2 text-right text-ink-2">{int(ad.conversions)}</td>
                  <td className="px-4 py-2 text-right text-ink-2">{int(ad.items_sold)}</td>
                  <td className="px-4 py-2 text-right text-ink">{formatCurrency(expense)}</td>
                  <td className="px-4 py-2 text-right text-ink">{formatCurrency(gmv)}</td>
                  <td
                    className={`px-4 py-2 text-right font-semibold ${
                      roas >= 4 ? "text-pos" : roas >= 2 ? "text-ink" : "text-danger"
                    }`}
                  >
                    {roas.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right text-ink-2">{pct(acos)}</td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td colSpan={11} className="px-5 py-8 text-center text-ink-3">
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
