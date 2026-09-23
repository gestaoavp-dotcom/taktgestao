import type { SupabaseClient } from "@supabase/supabase-js";
import { isBilledOrder } from "@/lib/parsers/order-breakdown";
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

type ProductRow = {
  marketplace: string;
  report_month: string;
  net_sales: number;
  units_net: number;
};

type OrderRow = {
  id: string;
  order_id: string;
  created_on: string | null;
  marketplace: string;
  subtotal: number;
  total_value: number;
  net_settlement: number;
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

/**
 * A product report settles a whole month at once and says nothing about days,
 * so it counts only when the period contains that month end to end. Splitting
 * it across a partial range would mean inventing a distribution the report
 * never gave.
 */
function monthWithin(reportMonth: string, start: string, end: string) {
  const [y, m] = reportMonth.split("-").map(Number);
  const last = toISO(new Date(y, m, 0));
  return reportMonth >= start && last <= end;
}

/** PostgREST stops at 1000 rows, and one busy month already exceeds that. */
const PAGE = 1000;

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

  const rows: OrderRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase
      .from("sales_orders")
      .select("id, order_id, created_on, marketplace, subtotal, total_value, net_settlement")
      .gte("created_on", toISO(prevStart))
      .lte("created_on", range.end)
      .order("id")
      .range(from, from + PAGE - 1);

    if (filters.clientId) query = query.eq("client_id", filters.clientId);
    if (filters.marketplace) query = query.eq("marketplace", filters.marketplace);

    const { data } = await query.returns<OrderRow[]>();
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }

  // Amazon settles by product, so its revenue lives nowhere in sales_orders.
  // Left out, "faturamento" silently omits a whole marketplace.
  let productQuery = supabase
    .from("sales_products")
    .select("marketplace, report_month, net_sales, units_net")
    .eq("is_total", false);

  if (filters.clientId) productQuery = productQuery.eq("client_id", filters.clientId);
  if (filters.marketplace) productQuery = productQuery.eq("marketplace", filters.marketplace);

  const { data: productData } = await productQuery.returns<ProductRow[]>();
  const products = productData ?? [];

  const currentProducts = products.filter((p) =>
    monthWithin(p.report_month, range.start, range.end),
  );
  const previousProducts = products.filter((p) =>
    monthWithin(p.report_month, toISO(prevStart), range.start),
  );

  const productRevenue = (rows: ProductRow[]) =>
    rows.reduce((s, p) => s + Number(p.net_sales), 0);
  // A product report counts units, not orders — and units are what its own
  // average price divides by, so the ticket comes out right.
  const productUnits = (rows: ProductRow[]) => rows.reduce((s, p) => s + p.units_net, 0);

  const billed = rows.filter((r) => isBilledOrder(r) && r.created_on);
  const current = billed.filter((r) => r.created_on! >= range.start);
  const previous = billed.filter((r) => r.created_on! < range.start);

  const revenue = revenueOf(current) + productRevenue(currentProducts);
  const orders = countOrders(current) + productUnits(currentProducts);
  const previousRevenue = revenueOf(previous) + productRevenue(previousProducts);
  const previousOrders = countOrders(previous) + productUnits(previousProducts);

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

  for (const p of currentProducts) {
    const entry = byPlatform.get(p.marketplace) ?? { revenue: 0, orderIds: new Set<string>() };
    entry.revenue += Number(p.net_sales);
    byPlatform.set(p.marketplace, entry);
  }
  const productUnitsByPlatform = new Map<string, number>();
  for (const p of currentProducts) {
    productUnitsByPlatform.set(
      p.marketplace,
      (productUnitsByPlatform.get(p.marketplace) ?? 0) + p.units_net,
    );
  }

  const platformRows = Array.from(byPlatform.entries())
    .map(
      ([platform, v]) =>
        [
          platform,
          {
            revenue: v.revenue,
            orders: v.orderIds.size + (productUnitsByPlatform.get(platform) ?? 0),
          },
        ] as const,
    )
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
