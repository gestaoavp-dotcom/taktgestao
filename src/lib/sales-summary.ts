import type { SupabaseClient } from "@supabase/supabase-js";

export type SalesSummary = {
  currentRevenue: number;
  previousRevenue: number;
  currentOrders: number;
  previousOrders: number;
  currentTicket: number;
  previousTicket: number;
  chartData: { date: string; value: number }[];
  platformRows: [string, { revenue: number; orders: number }][];
};

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getSalesSummary(
  supabase: SupabaseClient,
  clientId: string,
  days: number,
): Promise<SalesSummary> {
  const today = new Date();
  const periodStart = new Date(today);
  periodStart.setDate(periodStart.getDate() - (days - 1));
  const prevStart = new Date(periodStart);
  prevStart.setDate(prevStart.getDate() - days);

  const periodStartISO = toISODate(periodStart);

  const { data: sales } = await supabase
    .from("sales_daily")
    .select("date, revenue, orders_count, platform")
    .eq("client_id", clientId)
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
  const chartData = Array.from({ length: days }, (_, i) => {
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

  return {
    currentRevenue,
    previousRevenue,
    currentOrders,
    previousOrders,
    currentTicket,
    previousTicket,
    chartData,
    platformRows,
  };
}

export function trendOf(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}
