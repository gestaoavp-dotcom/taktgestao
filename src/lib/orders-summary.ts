import type { SupabaseClient } from "@supabase/supabase-js";
import type { DateRange } from "@/lib/sales-summary";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { isReturnedOrder } from "@/lib/parsers/order-breakdown";
import {
  loadReportPeriods,
  monthEnd,
  periodOverlaps,
  periodWithin,
  type ReportPeriod,
} from "@/lib/report-periods";

export type OrdersSummary = {
  revenue: number;
  orders: number;
  ticket: number;
  previousRevenue: number;
  previousOrders: number;
  previousTicket: number;
  chartData: { date: string; value: number }[];
  /** Revenue from monthly product reports (Amazon): in the totals, not in the day chart. */
  monthlyRevenue: number;
  /**
   * Product reports (Amazon) that cover more than the period on screen, so
   * they cannot count in it: their total has no day to split by.
   */
  productsLeftOut: (ReportPeriod & { value: number })[];
  /**
   * What buyers actually paid for the same sales — the product price less
   * discounts and coupons, plus shipping. Null until the database returns it.
   */
  paid: number | null;
  /** Sales sent back in the period: out of revenue, shown beside it. */
  returns: Returns;
  platformRows: [string, PlatformTotals][];
};

export type Returns = { value: number; orders: number };
type PlatformTotals = { revenue: number; orders: number; paid: number | null; returns: Returns };

type ReturnRow = {
  order_id: string;
  marketplace: string;
  status: string | null;
  refund_status: string | null;
  subtotal: number;
  total_value: number;
  net_settlement: number | null;
  net_amount: number | null;
};

type DayRow = {
  day: string;
  marketplace: string;
  revenue: number;
  orders: number;
  /** Absent until migration 0040 has run. */
  paid?: number | null;
};

type ProductRow = {
  sales_report_id: string;
  marketplace: string;
  report_month: string;
  net_sales: number;
  units_net: number;
};

/**
 * The sales sent back within a scope — a period, or a report month as the
 * Pedidos tab filters. Returns are few, so the rows come back as they are and
 * the rule that tells a return from a cancellation runs here, the one the
 * report uses too.
 */
export async function loadReturnedOrders(
  supabase: SupabaseClient,
  scope: {
    start?: string;
    end?: string;
    month?: string | null;
    clientId?: string;
    marketplace?: string | null;
    accountId?: string | null;
  },
): Promise<ReturnRow[]> {
  const rows = await fetchAll<ReturnRow>((from, to) => {
    let q = supabase
      .from("sales_orders")
      .select(
        "order_id, marketplace, status, refund_status, subtotal, total_value, net_settlement, net_amount",
      )
      .gt("subtotal", 0)
      .or(
        "status.ilike.*devolu*,status.ilike.*devolvid*,status.ilike.*reembols*," +
          "refund_status.ilike.*devolu*,refund_status.ilike.*reembols*," +
          "refund_status.ilike.*aprovada*,refund_status.ilike.*return*,refund_status.ilike.*refund*",
      );
    if (scope.start) q = q.gte("created_on", scope.start);
    if (scope.end) q = q.lte("created_on", scope.end);
    if (scope.month) q = q.eq("report_month", scope.month);
    if (scope.clientId) q = q.eq("client_id", scope.clientId);
    if (scope.marketplace) q = q.eq("marketplace", scope.marketplace);
    if (scope.accountId) q = q.eq("account_id", scope.accountId);
    return q.order("id").range(from, to).returns<ReturnRow[]>();
  });
  return rows.filter(isReturnedOrder);
}

export function returnsOf(rows: { order_id: string; subtotal: number }[]): Returns {
  return {
    value: rows.reduce((s, r) => s + Number(r.subtotal), 0),
    orders: new Set(rows.map((r) => r.order_id)).size,
  };
}

function toISO(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function fromISO(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
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
  // Paged: a long period across several marketplaces passes the thousand rows
  // the database returns per request, and the rest would be dropped unsaid.
  const days_ = await fetchAll<DayRow>((from, to) =>
    supabase
      .rpc("orders_summary", {
        p_start: toISO(prevStart),
        p_end: range.end,
        p_client_id: filters.clientId ?? null,
        p_marketplace: filters.marketplace ?? null,
      })
      .order("day")
      .order("marketplace")
      .range(from, to),
  );
  const current = days_.filter((d) => d.day >= range.start);
  const previous = days_.filter((d) => d.day < range.start);

  // Amazon settles by product, so its revenue lives nowhere in sales_orders.
  // Left out, "faturamento" silently omits a whole marketplace.
  // Only the months that can count for either window, read in pages: one row
  // per product per month adds up past a thousand fast.
  const products = await fetchAll<ProductRow>((from, to) => {
    let q = supabase
      .from("sales_products")
      .select("sales_report_id, marketplace, report_month, net_sales, units_net")
      .eq("is_total", false)
      // A year back, for a report spanning several months that only overlaps.
      .gte("report_month", `${Number(toISO(prevStart).slice(0, 4)) - 1}${toISO(prevStart).slice(4, 7)}-01`)
      .lte("report_month", range.end);
    if (filters.clientId) q = q.eq("client_id", filters.clientId);
    if (filters.marketplace) q = q.eq("marketplace", filters.marketplace);
    return q.order("id").range(from, to).returns<ProductRow[]>();
  });

  const returned = await loadReturnedOrders(supabase, {
    start: range.start,
    end: range.end,
    clientId: filters.clientId,
    marketplace: filters.marketplace,
  });

  // A product report settles its whole window at once and says nothing about
  // days, so it counts only when the period holds that window end to end —
  // usually one month, more when a first import brings several together.
  // Splitting it would mean inventing a distribution the report never gave.
  const periods = await loadReportPeriods(
    supabase,
    products.map((p) => p.sales_report_id),
  );
  const periodOf = (p: ProductRow): ReportPeriod =>
    periods.get(p.sales_report_id) ?? { start: p.report_month, end: monthEnd(p.report_month) };
  const dayBefore = (iso: string) => {
    const d = fromISO(iso);
    d.setDate(d.getDate() - 1);
    return toISO(d);
  };

  const currentProducts = products.filter((p) =>
    periodWithin(periodOf(p), range.start, range.end),
  );
  const previousProducts = products.filter((p) =>
    periodWithin(periodOf(p), toISO(prevStart), dayBefore(range.start)),
  );

  const leftOut = new Map<string, ReportPeriod & { value: number }>();
  for (const p of products) {
    const period = periodOf(p);
    if (periodWithin(period, range.start, range.end)) continue;
    if (!periodOverlaps(period, range.start, range.end)) continue;
    const e = leftOut.get(p.sales_report_id) ?? { ...period, value: 0 };
    e.value += Number(p.net_sales);
    leftOut.set(p.sales_report_id, e);
  }

  const productRevenue = (rows: ProductRow[]) =>
    rows.reduce((s, p) => s + Number(p.net_sales), 0);
  // A product report counts units, not orders — and units are what its own
  // average price divides by, so the ticket comes out right.
  const productUnits = (rows: ProductRow[]) => rows.reduce((s, p) => s + p.units_net, 0);

  const revenue = revenueOf(current) + productRevenue(currentProducts);
  const orders = countOrders(current) + productUnits(currentProducts);
  const previousRevenue = revenueOf(previous) + productRevenue(previousProducts);
  const previousOrders = countOrders(previous) + productUnits(previousProducts);

  // A product report has one figure per sale, so it is both the price and
  // what was paid.
  const paidKnown = current.every((r) => r.paid != null);
  const paidOf = (rows: DayRow[]) => rows.reduce((s, r) => s + Number(r.paid ?? 0), 0);
  const paid = paidKnown ? paidOf(current) + productRevenue(currentProducts) : null;

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

  const byPlatform = new Map<string, { revenue: number; orders: number; paid: number }>();
  for (const r of current) {
    const entry = byPlatform.get(r.marketplace) ?? { revenue: 0, orders: 0, paid: 0 };
    entry.revenue += Number(r.revenue);
    entry.paid += Number(r.paid ?? 0);
    entry.orders += Number(r.orders);
    byPlatform.set(r.marketplace, entry);
  }

  for (const p of currentProducts) {
    const entry = byPlatform.get(p.marketplace) ?? { revenue: 0, orders: 0, paid: 0 };
    entry.revenue += Number(p.net_sales);
    entry.paid += Number(p.net_sales);
    byPlatform.set(p.marketplace, entry);
  }
  const productUnitsByPlatform = new Map<string, number>();
  for (const p of currentProducts) {
    productUnitsByPlatform.set(
      p.marketplace,
      (productUnitsByPlatform.get(p.marketplace) ?? 0) + p.units_net,
    );
  }

  // A marketplace whose every sale came back still gets its row.
  for (const r of returned) {
    if (!byPlatform.has(r.marketplace)) {
      byPlatform.set(r.marketplace, { revenue: 0, orders: 0, paid: 0 });
    }
  }

  const platformRows = Array.from(byPlatform.entries())
    .map(
      ([platform, v]) =>
        [
          platform,
          {
            revenue: v.revenue,
            orders: v.orders + (productUnitsByPlatform.get(platform) ?? 0),
            paid: paidKnown ? v.paid : null,
            returns: returnsOf(returned.filter((r) => r.marketplace === platform)),
          },
        ] as const,
    )
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map((entry) => entry as [string, PlatformTotals]);

  return {
    revenue,
    orders,
    ticket: orders > 0 ? revenue / orders : 0,
    previousRevenue,
    previousOrders,
    previousTicket: previousOrders > 0 ? previousRevenue / previousOrders : 0,
    chartData,
    monthlyRevenue: productRevenue(currentProducts),
    productsLeftOut: [...leftOut.values()],
    paid,
    returns: returnsOf(returned),
    platformRows,
  };
}
