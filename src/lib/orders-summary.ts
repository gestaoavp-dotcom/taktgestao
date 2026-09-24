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

type DayRow = {
  day: string;
  marketplace: string;
  revenue: number;
  orders: number;
};

type ProductRow = {
  marketplace: string;
  report_month: string;
  net_sales: number;
  units_net: number;
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

function revenueOf(rows: DayRow[]) {
  return rows.reduce((sum, r) => sum + Number(r.revenue), 0);
}

/** Already counted per day in the database, where an order line is one order. */
function countOrders(rows: DayRow[]) {
  return rows.reduce((sum, r) => sum + Number(r.orders), 0);
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

  // One row per day per marketplace, added up in the database. Fetching the
  // orders to sum them here meant six sequential requests for a 30-day window,
  // each waiting on the last.
  const { data: daily } = await supabase.rpc("orders_summary", {
    p_start: toISO(prevStart),
    p_end: range.end,
    p_client_id: filters.clientId ?? null,
    p_marketplace: filters.marketplace ?? null,
  });

  const days_ = (daily ?? []) as DayRow[];
  const current = days_.filter((d) => d.day >= range.start);
  const previous = days_.filter((d) => d.day < range.start);

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

  const revenue = revenueOf(current) + productRevenue(currentProducts);
  const orders = countOrders(current) + productUnits(currentProducts);
  const previousRevenue = revenueOf(previous) + productRevenue(previousProducts);
  const previousOrders = countOrders(previous) + productUnits(previousProducts);

  const byDate = new Map<string, number>();
  for (const r of current) {
    byDate.set(r.day, (byDate.get(r.day) ?? 0) + Number(r.revenue));
  }

  const chartData = Array.from({ length: days }, (_, i) => {
    const d = new Date(periodStart);
    d.setDate(d.getDate() + i);
    const iso = toISO(d);
    return { date: iso, value: byDate.get(iso) ?? 0 };
  });

  const byPlatform = new Map<string, { revenue: number; orders: number }>();
  for (const r of current) {
    const entry = byPlatform.get(r.marketplace) ?? { revenue: 0, orders: 0 };
    entry.revenue += Number(r.revenue);
    entry.orders += Number(r.orders);
    byPlatform.set(r.marketplace, entry);
  }

  for (const p of currentProducts) {
    const entry = byPlatform.get(p.marketplace) ?? { revenue: 0, orders: 0 };
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
            orders: v.orders + (productUnitsByPlatform.get(platform) ?? 0),
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
