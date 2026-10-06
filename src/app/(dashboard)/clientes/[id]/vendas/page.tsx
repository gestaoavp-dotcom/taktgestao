import { createClient } from "@/lib/supabase/server";
import { isTeam } from "@/lib/profile";
import { AreaChart } from "@/components/area-chart";
import { MonthlyRevenueNote } from "@/components/monthly-revenue-note";
import { KpiCard } from "@/components/kpi-card";
import { VendasSubTabs } from "@/components/vendas-sub-tabs";
import { DateRangePicker } from "@/components/date-range-picker";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { trendOf, formatCurrency } from "@/lib/sales-summary";
import { reportRange } from "@/lib/report-week";
import { getOrdersSummary } from "@/lib/orders-summary";
import { paidNote, returnsNote } from "@/lib/returns-note";


function formatBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default async function ClienteVendasPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  const { id } = await params;
  const { de, ate } = await searchParams;
  const supabase = await createClient();
  const team = await isTeam();

  const range = reportRange(de, ate);

  const {
    revenue,
    orders,
    ticket,
    previousRevenue,
    previousOrders,
    previousTicket,
    chartData,
    monthlyRevenue,
    platformRows,
    returns,
    paid,
    profit,
    previousProfit,
    margin,
    previousMargin,
    adSpend,
    previousAdSpend,
  } = await getOrdersSummary(supabase, range, { clientId: id });

  const percent = (v: number | null) =>
    v == null ? "—" : `${(v * 100).toFixed(1).replace(".", ",")}%`;

  return (
    <div>
      <VendasSubTabs clientId={id} team={team} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-ink">
          Período{" "}
          <span className="font-normal text-ink-2">
            ({formatBR(range.start)} a {formatBR(range.end)})
          </span>
        </h2>
        <DateRangePicker start={range.start} end={range.end} />
      </div>

      <div className="mb-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Faturamento"
          value={formatCurrency(revenue)}
          trend={trendOf(revenue, previousRevenue)}
          icon="wallet"
          sub={paidNote(paid)}
          note={returnsNote(revenue, returns)}
        />
        <KpiCard
          label="Pedidos"
          value={String(orders)}
          trend={trendOf(orders, previousOrders)}
          icon="package"
        />
        <KpiCard
          label="Ticket médio"
          value={formatCurrency(ticket)}
          trend={trendOf(ticket, previousTicket)}
          icon="receipt"
        />
        <KpiCard
          label="Gasto com Ads"
          value={formatCurrency(adSpend)}
          trend={trendOf(adSpend, previousAdSpend)}
          icon="megaphone"
          invert
          note={
            adSpend > 0
              ? "Campanhas dos marketplaces, pelos relatórios de Ads importados."
              : "Nenhum relatório de Ads importado neste período."
          }
        />
        <KpiCard
          label="Lucro"
          value={profit == null ? "—" : formatCurrency(profit)}
          trend={
            profit != null && previousProfit != null
              ? trendOf(profit, previousProfit)
              : undefined
          }
          icon="profit"
          note={
            profit == null
              ? "Falta rodar a migration 0042 no banco."
              : adSpend > 0
                ? `Depois das taxas, do custo, dos impostos e de ${formatCurrency(adSpend)} de Ads.`
                : "Depois das taxas do marketplace, do custo do produto e dos impostos."
          }
        />
        <KpiCard
          label="Margem"
          value={percent(margin)}
          icon="percent"
          sub={previousMargin != null ? `Antes: ${percent(previousMargin)}` : undefined}
          note="O lucro sobre o faturamento do período."
        />
      </div>

      <div className="lift mb-5 rounded-2xl bg-panel p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-ink">Faturamento por dia</h2>
        <AreaChart data={chartData} />
        <MonthlyRevenueNote value={monthlyRevenue} />
      </div>

      <div className="lift overflow-hidden rounded-2xl bg-panel shadow-sm">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-bold text-ink">Por marketplace</h2>
        </div>
        {platformRows.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-panel-2">
              <tr>
                <th className="px-5 py-2 font-semibold text-ink">Marketplace</th>
                <th className="px-5 py-2 font-semibold text-ink">Faturamento</th>
                <th className="px-5 py-2 font-semibold text-ink">Pedidos</th>
                <th className="px-5 py-2 font-semibold text-ink">Ticket médio</th>
                <th className="px-5 py-2 font-semibold text-ink">Devoluções</th>
              </tr>
            </thead>
            <tbody>
              {platformRows.map(([platform, data]) => (
                <tr key={platform} className="border-t border-line-soft">
                  <td className="px-5 py-2.5 text-ink">
                    {MARKETPLACE_LABEL[platform] ?? platform}
                  </td>
                  <td className="px-5 py-2.5 text-ink">
                    {formatCurrency(data.revenue)}
                    {data.paid != null && (
                      <div className="text-[11px] text-ink-3">
                        pago {formatCurrency(data.paid)}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-ink-2">{data.orders}</td>
                  <td className="px-5 py-2.5 text-ink-2">
                    {formatCurrency(data.orders > 0 ? data.revenue / data.orders : 0)}
                  </td>
                  <td className="px-5 py-2.5 text-ink-2">
                    {data.returns.orders
                      ? `${formatCurrency(data.returns.value)} (${data.returns.orders})`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-ink-3">
            Nenhum pedido nesse período. Importe um documento em &quot;Importar documentos&quot;.
          </p>
        )}
      </div>

      <p className="mt-3 text-xs text-ink-3">
        Faturamento é o valor vendido aos compradores, vindo dos documentos importados. Pedidos
        cancelados ficam de fora; devoluções também, e aparecem à parte, embaixo do
        faturamento e na coluna Devoluções. A Amazon entra pelo relatório de pedidos (.txt),
        venda a venda; sem ele, pelo relatório por produto, cujo valor do mês é dividido por igual
        entre os dias — e dele vêm unidades no lugar de pedidos.
      </p>
    </div>
  );
}
