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
  } = await getOrdersSummary(supabase, range, { clientId: id });

  return (
    <div>
      <VendasSubTabs clientId={id} team={team} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-navy">
          Período{" "}
          <span className="font-normal text-[#5B647E]">
            ({formatBR(range.start)} a {formatBR(range.end)})
          </span>
        </h2>
        <DateRangePicker start={range.start} end={range.end} />
      </div>

      <div className="mb-5 grid grid-cols-3 gap-5">
        <KpiCard
          label="Faturamento"
          value={formatCurrency(revenue)}
          trend={trendOf(revenue, previousRevenue)}
          icon="wallet"
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
      </div>

      <div className="mb-5 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-1 font-bold text-navy">Faturamento por dia</h2>
        <p className="mb-4 text-xs text-[#94A0BD]">Só os marketplaces que reportam por pedido.</p>
        <AreaChart data={chartData} />
        <MonthlyRevenueNote value={monthlyRevenue} />
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="border-b border-navy/[.08] px-5 py-4">
          <h2 className="font-bold text-navy">Por marketplace</h2>
        </div>
        {platformRows.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-gray">
              <tr>
                <th className="px-5 py-2 font-semibold text-navy">Marketplace</th>
                <th className="px-5 py-2 font-semibold text-navy">Faturamento</th>
                <th className="px-5 py-2 font-semibold text-navy">Pedidos</th>
                <th className="px-5 py-2 font-semibold text-navy">Ticket médio</th>
              </tr>
            </thead>
            <tbody>
              {platformRows.map(([platform, data]) => (
                <tr key={platform} className="border-t border-navy/[.06]">
                  <td className="px-5 py-2.5 text-navy">
                    {MARKETPLACE_LABEL[platform] ?? platform}
                  </td>
                  <td className="px-5 py-2.5 text-navy">{formatCurrency(data.revenue)}</td>
                  <td className="px-5 py-2.5 text-[#5B647E]">{data.orders}</td>
                  <td className="px-5 py-2.5 text-[#5B647E]">
                    {formatCurrency(data.orders > 0 ? data.revenue / data.orders : 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-[#94A0BD]">
            Nenhum pedido nesse período. Importe um documento em &quot;Importar documentos&quot;.
          </p>
        )}
      </div>

      <p className="mt-3 text-xs text-[#94A0BD]">
        Faturamento é o valor vendido aos compradores, vindo dos documentos importados. Pedidos
        cancelados e reembolsados ficam de fora. Marketplaces que reportam por produto e não por
        pedido — a Amazon — entram por mês inteiro, e só quando o período escolhido cobre o mês
        do começo ao fim; deles vêm unidades no lugar de pedidos, e eles não aparecem no gráfico
        por dia, porque o relatório não diz em que dia cada venda aconteceu.
      </p>
    </div>
  );
}
