import { createClient } from "@/lib/supabase/server";
import { isTeam } from "@/lib/profile";
import { AreaChart } from "@/components/area-chart";
import { MonthlyRevenueNote } from "@/components/monthly-revenue-note";
import { KpiCard } from "@/components/kpi-card";
import { ResultKpis } from "@/components/result-kpis";
import { VendasSubTabs } from "@/components/vendas-sub-tabs";
import { DateRangePicker } from "@/components/date-range-picker";
import { MarketplaceBreakdown } from "@/components/marketplace-breakdown";
import { trendOf, formatCurrency } from "@/lib/sales-summary";
import { reportRange } from "@/lib/report-week";
import { getOrdersSummary } from "@/lib/orders-summary";
import { paidNote } from "@/lib/returns-note";


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

  const summary = await getOrdersSummary(supabase, range, { clientId: id });
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
    paid,
  } = summary;

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

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
        <KpiCard
          label="Faturamento"
          value={formatCurrency(revenue)}
          trend={trendOf(revenue, previousRevenue)}
          icon="wallet"
          sub={paidNote(paid)}
        />
        <KpiCard
          label="Pedidos"
          value={orders.toLocaleString("pt-BR")}
          trend={trendOf(orders, previousOrders)}
          icon="package"
        />
        <KpiCard
          label="Ticket médio"
          value={formatCurrency(ticket)}
          trend={trendOf(ticket, previousTicket)}
          icon="receipt"
        />
        <ResultKpis summary={summary} />
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
        <MarketplaceBreakdown
          rows={platformRows}
          showTicket
          empty={'Nenhum pedido nesse período. Importe um documento em "Importar documentos".'}
        />
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
