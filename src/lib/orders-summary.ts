import type { SupabaseClient } from "@supabase/supabase-js";
import type { DateRange } from "@/lib/sales-summary";

export type OrdersSummary = {
  revenue: number;
  orders: number;
  ticket: number;
  previousRevenue: number;
  previousOrders: number;
  previousTicket: number;
  chartData: { date: string; value: number }[];
  platformRows: [string, { revenue: number; orders: number }][];
};

type OrderRow = {
  order_id: string;
  created_on: string | null;
  marketplace: string;
  subtotal: number;
  total_value: number;
};

function toISO(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function fromISO(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function revenueOf(rows: OrderRow[]) {
  return rows.reduce((sum, r) => sum + Number(r.subtotal), 0);
}

/** An order spanning several product lines is still one order. */
function countOrders(rows: OrderRow[]) {
  return new Set(rows.map((r) => r.order_id)).size;
}

/**
 * Revenue as billed to buyers, from the orders imported off the marketplace
 * reports. Cancelled and refunded orders are left out: the platform charged
 * nothing for them.
 *
 * With no `clientId`, it covers every client under management.
 */
export async function getOrdersSummary(
  supabase: SupabaseClient,
  range: DateRange,
  filters: { clientId?: string; marketplace?: string } = {},
): Promise<OrdersSummary> {
  const periodStart = fromISO(range.start);
  const periodEnd = fromISO(range.end);
  const days = Math.round((periodEnd.getTime() - periodStart.getTime()) / 86_400_000) + 1;

  const prevStart = new Date(periodStart);
  prevStart.setDate(prevStart.getDate() - days);

  let query = supabase
    .from("sales_orders")
    .select("order_id, created_on, marketplace, subtotal, total_value")
    .gte("created_on", toISO(prevStart))
    .lte("created_on", range.end);

  if (filters.clientId) query = query.eq("client_id", filters.clientId);
  if (filters.marketplace) query = query.eq("marketplace", filters.marketplace);

  const { data } = await query.returns<OrderRow[]>();

  const billed = (data ?? []).filter((r) => Number(r.total_value) > 0 && r.created_on);
  const current = billed.filter((r) => r.created_on! >= range.start);
  const previous = billed.filter((r) => r.created_on! < range.start);

  const revenue = revenueOf(current);
  const orders = countOrders(current);
  const previousRevenue = revenueOf(previous);
  const previousOrders = countOrders(previous);

  const byDate = new Map<string, number>();
  for (const r of current) {
    byDate.set(r.created_on!, (byDate.get(r.created_on!) ?? 0) + Number(r.subtotal));
  }

  const chartData = Array.from({ length: days }, (_, i) => {
    const d = new Date(periodStart);
    d.setDate(d.getDate() + i);
    const iso = toISO(d);
    return { date: iso, value: byDate.get(iso) ?? 0 };
  });

  const byPlatform = new Map<string, { revenue: number; orderIds: Set<string> }>();
  for (const r of current) {
    const entry = byPlatform.get(r.marketplace) ?? { revenue: 0, orderIds: new Set<string>() };
    entry.revenue += Number(r.subtotal);
    entry.orderIds.add(r.order_id);
    byPlatform.set(r.marketplace, entry);
  }

  const platformRows = Array.from(byPlatform.entries())
    .map(([platform, v]) => [platform, { revenue: v.revenue, orders: v.orderIds.size }] as const)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map((entry) => entry as [string, { revenue: number; orders: number }]);

  return {
    revenue,
    orders,
    ticket: orders > 0 ? revenue / orders : 0,
    previousRevenue,
    previousOrders,
    previousTicket: previousOrders > 0 ? previousRevenue / previousOrders : 0,
    chartData,
    platformRows,
  };
}
