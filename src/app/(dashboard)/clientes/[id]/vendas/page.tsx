import { createClient } from "@/lib/supabase/server";
import { AreaChart } from "@/components/area-chart";
import { KpiCard } from "@/components/kpi-card";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";

const DAYS = 30;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function trendOf(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export default async function ClienteVendasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const today = new Date();
  const periodStart = new Date(today);
  periodStart.setDate(periodStart.getDate() - (DAYS - 1));
  const prevStart = new Date(periodStart);
  prevStart.setDate(prevStart.getDate() - DAYS);

  const periodStartISO = toISODate(periodStart);

  const { data: sales } = await supabase
    .from("sales_daily")
    .select("date, revenue, orders_count, platform")
    .eq("client_id", id)
    .gte("date", toISODate(prevStart))
    .lte("date", toISODate(today));

  const rows = sales ?? [];
  const current = rows.filter((s) => s.date >= periodStartISO);
  const previous = rows.filter((s) => s.date < periodStartISO);

  const sum = (list: typeof rows, key: "revenue" | "orders_count") =>
    list.reduce((total, s) => total + Number(s[key]), 0);

  const currentRevenue = sum(current, "revenue");
  const previousRevenue = sum(previous, "revenue");
  const currentOrders = sum(current, "orders_count");
  const previousOrders = sum(previous, "orders_count");
  const currentTicket = currentOrders > 0 ? currentRevenue / currentOrders : 0;
  const previousTicket = previousOrders > 0 ? previousRevenue / previousOrders : 0;

  const byDate = new Map<string, number>();
  for (const s of current) {
    byDate.set(s.date, (byDate.get(s.date) ?? 0) + Number(s.revenue));
  }
  const chartData = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(periodStart);
    d.setDate(d.getDate() + i);
    const iso = toISODate(d);
    return { date: iso, value: byDate.get(iso) ?? 0 };
  });

  const byPlatform = new Map<string, { revenue: number; orders: number }>();
  for (const s of current) {
    const entry = byPlatform.get(s.platform) ?? { revenue: 0, orders: 0 };
    entry.revenue += Number(s.revenue);
    entry.orders += s.orders_count;
    byPlatform.set(s.platform, entry);
  }
  const platformRows = Array.from(byPlatform.entries()).sort(
    (a, b) => b[1].revenue - a[1].revenue,
  );

  return (
    <div>
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
