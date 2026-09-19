import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AreaChart } from "@/components/area-chart";
import { KpiCard } from "@/components/kpi-card";
import { DateRangePicker } from "@/components/date-range-picker";
import { MARKETPLACES } from "@/lib/marketplaces";
import { lastDays, trendOf, formatCurrency } from "@/lib/sales-summary";
import { getOrdersSummary } from "@/lib/orders-summary";

const DEFAULT_DAYS = 30;

function formatBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; de?: string; ate?: string }>;
}) {
  const { platform, de, ate } = await searchParams;
  const supabase = await createClient();

  const fallback = lastDays(DEFAULT_DAYS);
  const range = { start: de ?? fallback.start, end: ate ?? fallback.end };

  const [{ data: clients }, summary] = await Promise.all([
    supabase.from("clients").select("id, created_at"),
    getOrdersSummary(supabase, range, { marketplace: platform }),
  ]);

  const { revenue, orders, ticket, previousRevenue, previousOrders, previousTicket, chartData } =
    summary;

  const totalClients = clients?.length ?? 0;
  const newClientsCurrent =
    clients?.filter((c) => c.created_at.slice(0, 10) >= range.start).length ?? 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-navy">Dashboard</h1>
        <nav className="flex gap-1 rounded-lg bg-white p-1 shadow-sm">
          <Link
            href="/"
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              !platform ? "bg-navy text-white" : "text-[#5B647E] hover:bg-brand-gray"
            }`}
          >
            Todos
          </Link>
          {MARKETPLACES.map((p) => (
            <Link
              key={p.value}
              href={`/?platform=${p.value}&de=${range.start}&ate=${range.end}`}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                platform === p.value ? "bg-navy text-white" : "text-[#5B647E] hover:bg-brand-gray"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#5B647E]">
          Período: {formatBR(range.start)} a {formatBR(range.end)}
        </p>
        <DateRangePicker start={range.start} end={range.end} />
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        <KpiCard
          label="Clientes"
          value={String(totalClients)}
          trend={newClientsCurrent > 0 ? 100 : 0}
          icon="users"
        />
        <KpiCard
          label="Faturamento sob gestão"
          value={formatCurrency(revenue)}
          trend={trendOf(revenue, previousRevenue)}
          icon="wallet"
        />
        <KpiCard
          label="Pedidos gerados"
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

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-display text-base font-semibold text-navy">Faturamento por dia</h2>
        <AreaChart data={chartData} />
      </div>

      <p className="mt-3 text-xs text-[#94A0BD]">
        Soma de todos os clientes sob gestão, a partir dos documentos de pedidos importados.
        Cancelados e reembolsados ficam de fora.
      </p>
    </div>
  );
}
