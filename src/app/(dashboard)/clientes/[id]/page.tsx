import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isTeam } from "@/lib/profile";
import type { ClientAccount } from "@/lib/types";
import { MarketplaceBreakdown } from "@/components/marketplace-breakdown";
import { trendOf, formatCurrency } from "@/lib/sales-summary";
import { reportRange } from "@/lib/report-week";
import { getOrdersSummary } from "@/lib/orders-summary";
import { paidNote } from "@/lib/returns-note";
import { AreaChart } from "@/components/area-chart";
import { MonthlyRevenueNote } from "@/components/monthly-revenue-note";
import { KpiCard } from "@/components/kpi-card";
import { ResultKpis } from "@/components/result-kpis";
import { DateRangePicker } from "@/components/date-range-picker";


function formatBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default async function ClienteDashboardPage({
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

  const [{ data: client }, { data: accounts }, sales] = await Promise.all([
    supabase.from("clients").select("id").eq("id", id).maybeSingle<{ id: string }>(),
    supabase
      .from("client_accounts")
      .select("*")
      .eq("client_id", id)
      .order("created_at")
      .returns<ClientAccount[]>(),
    getOrdersSummary(supabase, range, { clientId: id }),
  ]);

  if (!client) return null;

  const { revenue, previousRevenue, orders, previousOrders, chartData, platformRows } = sales;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-ink">
            Vendas{" "}
            <span className="font-normal text-ink-2">
              ({formatBR(range.start)} a {formatBR(range.end)})
            </span>
          </h2>
          <DateRangePicker start={range.start} end={range.end} />
          <Link
            href={`/clientes/${id}/vendas`}
            className="flex items-center gap-1 text-xs font-semibold text-accent-ink hover:underline"
          >
            Ver detalhes
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          <KpiCard
            label="Faturamento"
            value={formatCurrency(revenue)}
            trend={trendOf(revenue, previousRevenue)}
            icon="wallet"
            sub={paidNote(sales.paid)}
          />
          <KpiCard
            label="Pedidos"
            value={orders.toLocaleString("pt-BR")}
            trend={trendOf(orders, previousOrders)}
            icon="package"
          />
          {/* The agency manages the accounts; the client owns the shops and
              already sees them named with their marketplaces above this. */}
          {team && (
            <KpiCard
              label="Contas gerenciadas"
              value={String(accounts?.length ?? 0)}
              icon="users"
            />
          )}
          <ResultKpis summary={sales} />
        </div>

        <div className="lift mb-5 rounded-2xl bg-panel p-6 shadow-sm">
          <h3 className="mb-4 font-bold text-ink">Faturamento por dia</h3>
          <AreaChart data={chartData} />
          <MonthlyRevenueNote value={sales.monthlyRevenue} />
        </div>

        <div className="lift overflow-hidden rounded-2xl bg-panel shadow-sm">
          <div className="border-b border-line px-5 py-4">
            <h3 className="font-bold text-ink">Por marketplace</h3>
          </div>
          <MarketplaceBreakdown rows={platformRows} empty="Nenhum pedido nesse período." />
        </div>
      </div>
    </div>
  );
}
