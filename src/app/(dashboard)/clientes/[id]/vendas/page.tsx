import { createClient } from "@/lib/supabase/server";
import { AreaChart } from "@/components/area-chart";
import { KpiCard } from "@/components/kpi-card";
import { VendasSubTabs } from "@/components/vendas-sub-tabs";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { getSalesSummary, trendOf, formatCurrency } from "@/lib/sales-summary";

const DAYS = 30;

export default async function ClienteVendasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    currentRevenue,
    previousRevenue,
    currentOrders,
    previousOrders,
    currentTicket,
    previousTicket,
    chartData,
    platformRows,
  } = await getSalesSummary(supabase, id, DAYS);

  return (
    <div>
      <VendasSubTabs clientId={id} />
      <div className="mb-5 grid grid-cols-3 gap-5">
        <KpiCard
          label="Faturamento (30 dias)"
          value={formatCurrency(currentRevenue)}
          trend={trendOf(currentRevenue, previousRevenue)}
          icon="wallet"
        />
        <KpiCard
          label="Pedidos (30 dias)"
          value={String(currentOrders)}
          trend={trendOf(currentOrders, previousOrders)}
          icon="package"
        />
        <KpiCard
          label="Ticket médio"
          value={formatCurrency(currentTicket)}
          trend={trendOf(currentTicket, previousTicket)}
          icon="receipt"
        />
      </div>

      <div className="mb-5 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-navy">Faturamento por dia</h2>
        <AreaChart data={chartData} />
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
            Nenhuma venda importada para este cliente ainda.
          </p>
        )}
      </div>
    </div>
  );
}
