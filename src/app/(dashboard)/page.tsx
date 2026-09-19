import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AreaChart } from "@/components/area-chart";
import { KpiCard } from "@/components/kpi-card";
import { MARKETPLACES } from "@/lib/marketplaces";

const DAYS = 30;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function trendOf(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>;
}) {
  const { platform } = await searchParams;
  const supabase = await createClient();

  const today = new Date();
  const periodStart = new Date(today);
  periodStart.setDate(periodStart.getDate() - (DAYS - 1));
  const prevPeriodEnd = new Date(periodStart);
  prevPeriodEnd.setDate(prevPeriodEnd.getDate() - 1);
  const prevPeriodStart = new Date(prevPeriodEnd);
  prevPeriodStart.setDate(prevPeriodStart.getDate() - (DAYS - 1));

  const periodStartISO = toISODate(periodStart);
  const prevPeriodStartISO = toISODate(prevPeriodStart);
  const todayISO = toISODate(today);

  const [{ data: clients }, salesQuery] = await Promise.all([
    supabase.from("clients").select("id, created_at"),
    (() => {
      let query = supabase
        .from("sales_daily")
        .select("date, revenue, orders_count")
        .gte("date", prevPeriodStartISO)
        .lte("date", todayISO);
      if (platform) query = query.eq("platform", platform);
      return query;
    })(),
  ]);

  const sales = salesQuery.data ?? [];
  const current = sales.filter((s) => s.date >= periodStartISO);
  const previous = sales.filter((s) => s.date < periodStartISO);

  const currentRevenue = current.reduce((sum, s) => sum + Number(s.revenue), 0);
  const previousRevenue = previous.reduce((sum, s) => sum + Number(s.revenue), 0);
  const currentOrders = current.reduce((sum, s) => sum + s.orders_count, 0);
  const previousOrders = previous.reduce((sum, s) => sum + s.orders_count, 0);
  const currentTicket = currentOrders > 0 ? currentRevenue / currentOrders : 0;
  const previousTicket = previousOrders > 0 ? previousRevenue / previousOrders : 0;

  const totalClients = clients?.length ?? 0;
  const newClientsCurrent =
    clients?.filter((c) => c.created_at.slice(0, 10) >= periodStartISO).length ?? 0;
  const newClientsPrevious =
    clients?.filter(
      (c) => c.created_at.slice(0, 10) >= prevPeriodStartISO && c.created_at.slice(0, 10) < periodStartISO,
    ).length ?? 0;

  const byDate = new Map<string, number>();
  for (const s of current) {
    byDate.set(s.date, (byDate.get(s.date) ?? 0) + Number(s.revenue));
  }
  const chartData: { date: string; value: number }[] = [];
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(periodStart);
    d.setDate(d.getDate() + i);
    const iso = toISODate(d);
    chartData.push({ date: iso, value: byDate.get(iso) ?? 0 });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
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
              href={`/?platform=${p.value}`}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                platform === p.value
                  ? "bg-navy text-white"
                  : "text-[#5B647E] hover:bg-brand-gray"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        <KpiCard
          label="Clientes"
          value={String(totalClients)}
          trend={trendOf(newClientsCurrent, newClientsPrevious)}
          icon="users"
        />
        <KpiCard
          label="Faturamento sob gestão"
          value={formatCurrency(currentRevenue)}
          trend={trendOf(currentRevenue, previousRevenue)}
          icon="wallet"
        />
        <KpiCard
          label="Pedidos gerados"
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

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-navy">
            Faturamento por dia
          </h2>
          <span className="rounded-lg border border-navy/10 px-3 py-1.5 text-xs font-medium text-[#5B647E]">
            Últimos 30 dias
          </span>
        </div>
        <AreaChart data={chartData} />
      </div>
    </div>
  );
}
