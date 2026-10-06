import type { SupabaseClient } from "@supabase/supabase-js";
import type { DateRange } from "@/lib/sales-summary";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { isReturnedOrder } from "@/lib/parsers/order-breakdown";
import {
  coveredByAmazonOrders,
  loadAmazonOrderPeriods,
  loadReportPeriods,
  monthEnd,
  daysIn,
  shareOfPeriod,
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
  /** Revenue from product reports (Amazon without its orders file), spread evenly over their days. */
  monthlyRevenue: number;
  /**
   * What buyers actually paid for the same sales — the product price less
   * discounts and coupons, plus shipping. Null until the database returns it.
   */
  paid: number | null;
  /** Sales sent back in the period: out of revenue, shown beside it. */
  returns: Returns;
  /**
   * What the marketplace left after its fees, less cost, extras, tax and ads.
   * Null until migration 0042 has run — better a dash than a figure that is
   * only the ad spend with a minus in front of it.
   */
  profit: number | null;
  previousProfit: number | null;
  /** Profit over revenue, as a fraction. Null when nothing was sold. */
  margin: number | null;
  previousMargin: number | null;
  /** Spent on the marketplaces' own ads in the period. */
  adSpend: number;
  previousAdSpend: number;
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
  client_id: string;
  marketplace: string;
  report_month: string;
  net_sales: number;
  units_net: number;
  net_revenue: number;
  unit_cost: number | null;
  extra_costs: number | null;
  tax_percent: number | null;
};

type AdRow = {
  report_month: string;
  started_on: string | null;
  ended_on: string | null;
  expense: number;
};

type ProfitRow = { net: number; cost: number; extra: number; tax: number; profit: number };

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

function dayBeforeISO(iso: string) {
  const d = fromISO(iso);
  d.setDate(d.getDate() - 1);
  return toISO(d);
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
      .select(
        "sales_report_id, client_id, marketplace, report_month, net_sales, units_net, " +
          "net_revenue, unit_cost, extra_costs, tax_percent",
      )
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

  // What the orders left, added up in the database for the same two windows
  // the figures above compare. Both at once: one waits on the other otherwise.
  const profitIn = async (start: string, end: string): Promise<number | null> => {
    const { data, error } = await supabase.rpc("orders_profit", {
      p_start: start,
      p_end: end,
      p_client_id: filters.clientId ?? null,
      p_marketplace: filters.marketplace ?? null,
    });
    if (error) return null;
    return Number((data as ProfitRow[] | null)?.[0]?.profit ?? 0);
  };

  // Ads are reported by month, and some reports by week inside it. Either way
  // the spend is spread over the days it covers, the way a product report is:
  // counting a month only when the period holds all of it would show zero for
  // "last 30 days", which almost never holds a calendar month.
  const [orderProfit, previousOrderProfit, ads] = await Promise.all([
    profitIn(range.start, range.end),
    profitIn(toISO(prevStart), dayBeforeISO(range.start)),
    fetchAll<AdRow>((from, to) => {
      let q = supabase
        .from("sales_ads")
        .select("report_month, started_on, ended_on, expense")
        .gte("report_month", `${toISO(prevStart).slice(0, 7)}-01`)
        .lte("report_month", range.end);
      if (filters.clientId) q = q.eq("client_id", filters.clientId);
      if (filters.marketplace) q = q.eq("marketplace", filters.marketplace);
      return q.order("id").range(from, to).returns<AdRow[]>();
    }),
  ]);

  const adSpendIn = (start: string, end: string) =>
    ads.reduce((sum, a) => {
      const period: ReportPeriod = {
        start: a.started_on ?? a.report_month,
        end: a.ended_on ?? monthEnd(a.report_month),
      };
      return sum + Number(a.expense) * shareOfPeriod(period, start, end);
    }, 0);

  // A product report (Amazon without its orders file) settles its whole
  // window in one figure, with no date per sale. Counting it only when the
  // period held the whole window made Amazon vanish from every rolling view
  // ("last 30 days" rarely holds a calendar month). So it is spread evenly over
  // its days: a period gets the share of the days it covers, and a whole month
  // still adds up to exactly the report. The orders file, when sent, replaces
  // the estimate with each sale's own day.
  const [periods, amazonOrders] = await Promise.all([
    loadReportPeriods(
      supabase,
      products.map((p) => p.sales_report_id),
    ),
    loadAmazonOrderPeriods(supabase, filters.clientId),
  ]);
  const periodOf = (p: ProductRow): ReportPeriod =>
    periods.get(p.sales_report_id) ?? { start: p.report_month, end: monthEnd(p.report_month) };

  // Where the client's Amazon orders cover the days, they are the revenue.
  const counted = products.filter(
    (p) => !coveredByAmazonOrders(amazonOrders, p.client_id, periodOf(p)),
  );
  const sharesIn = (start: string, end: string) =>
    counted
      .map((p) => ({ p, share: shareOfPeriod(periodOf(p), start, end) }))
      .filter((x) => x.share > 0);
  const currentShares = sharesIn(range.start, range.end);
  const previousShares = sharesIn(toISO(prevStart), dayBeforeISO(range.start));

  type Share = { p: ProductRow; share: number };
  const productRevenue = (rows: Share[]) =>
    rows.reduce((s, x) => s + Number(x.p.net_sales) * x.share, 0);
  // A product report counts units, not orders — and units are what its own
  // average price divides by, so the ticket comes out right.
  const productUnits = (rows: Share[]) =>
    Math.round(rows.reduce((s, x) => s + Number(x.p.units_net) * x.share, 0));

  // The same arithmetic the Produtos tab shows per line: what Amazon paid for
  // the product, less what it cost to buy, the extras and the tax on it.
  const productProfit = (rows: Share[]) =>
    rows.reduce((sum, x) => {
      const net = Number(x.p.net_revenue);
      const line =
        net -
        Number(x.p.unit_cost ?? 0) * x.p.units_net -
        Number(x.p.extra_costs ?? 0) -
        (net * Number(x.p.tax_percent ?? 0)) / 100;
      return sum + line * x.share;
    }, 0);

  const revenue = revenueOf(current) + productRevenue(currentShares);
  const orders = countOrders(current) + productUnits(currentShares);
  const previousRevenue = revenueOf(previous) + productRevenue(previousShares);
  const previousOrders = countOrders(previous) + productUnits(previousShares);

  // Ads are a cost of the sale like any other, so they come out before the
  // margin — a margin that ignores a known cost flatters the month.
  const adSpend = adSpendIn(range.start, range.end);
  const previousAdSpend = adSpendIn(toISO(prevStart), dayBeforeISO(range.start));
  const profit =
    orderProfit == null ? null : orderProfit + productProfit(currentShares) - adSpend;
  const previousProfit =
    previousOrderProfit == null
      ? null
      : previousOrderProfit + productProfit(previousShares) - previousAdSpend;
  const marginOf = (p: number | null, r: number) => (p != null && r > 0 ? p / r : null);

  // A product report has one figure per sale, so it is both the price and
  // what was paid.
  const paidKnown = current.every((r) => r.paid != null);
  const paidOf = (rows: DayRow[]) => rows.reduce((s, r) => s + Number(r.paid ?? 0), 0);
  const paid = paidKnown ? paidOf(current) + productRevenue(currentShares) : null;

  const byDate = new Map<string, number>();
  for (const r of current) {
    byDate.set(r.day, (byDate.get(r.day) ?? 0) + Number(r.revenue));
  }

  const chartData = Array.from({ length: days }, (_, i) => {
    const d = new Date(periodStart);
    d.setDate(d.getDate() + i);
    const iso = toISO(d);
    // Each product report's even share of this day.
    const estimated = currentShares.reduce((s, x) => {
      const period = periodOf(x.p);
      if (iso < period.start || iso > period.end) return s;
      return s + Number(x.p.net_sales) / daysIn(period);
    }, 0);
    return { date: iso, value: (byDate.get(iso) ?? 0) + estimated };
  });

  const byPlatform = new Map<string, { revenue: number; orders: number; paid: number }>();
  for (const r of current) {
    const entry = byPlatform.get(r.marketplace) ?? { revenue: 0, orders: 0, paid: 0 };
    entry.revenue += Number(r.revenue);
    entry.paid += Number(r.paid ?? 0);
    entry.orders += Number(r.orders);
    byPlatform.set(r.marketplace, entry);
  }

  const productMarketplaces = [...new Set(currentShares.map((x) => x.p.marketplace))];
  for (const m of productMarketplaces) {
    const rows = currentShares.filter((x) => x.p.marketplace === m);
    const entry = byPlatform.get(m) ?? { revenue: 0, orders: 0, paid: 0 };
    entry.revenue += productRevenue(rows);
    entry.paid += productRevenue(rows);
    entry.orders += productUnits(rows);
    byPlatform.set(m, entry);
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
            orders: v.orders,
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
    monthlyRevenue: productRevenue(currentShares),
    paid,
    returns: returnsOf(returned),
    profit,
    previousProfit,
    margin: marginOf(profit, revenue),
    previousMargin: marginOf(previousProfit, previousRevenue),
    adSpend,
    previousAdSpend,
    platformRows,
  };
}
