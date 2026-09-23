import type { SalesOrder, SalesProduct } from "@/lib/types";
import { isOrderVoided, orderNet, orderShares } from "@/lib/parsers/order-breakdown";

// Shopee and Mercado Livre report orders; Amazon reports products. To see all
// three side by side, the orders are folded into products here — by SKU, by
// month, by marketplace.
//
// This is derived, never stored. The orders remain the source of truth, so a
// cost typed in the Pedidos tab shows up here on the next load with nothing to
// keep in sync.
//
// It also happens to be what keeps the page light: the folding runs on the
// server, so the browser receives a few dozen products instead of a few
// thousand orders.

/** A product line with no row of its own — the id says where it came from. */
export type DerivedProduct = SalesProduct & { derived: true };

const PLATFORM_FEES = "Tarifas da plataforma";

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function productsFromOrders(orders: SalesOrder[]): DerivedProduct[] {
  const shares = orderShares(orders);

  type Bucket = {
    key: string;
    marketplace: string;
    account_id: string | null;
    report_month: string;
    sku: string | null;
    names: Map<string, number>;
    units: number;
    refunded: number;
    gross: number;
    net_sales: number;
    net_revenue: number;
    cost: number;
    extra: number;
    tax: number | null;
    client_id: string;
  };

  const buckets = new Map<string, Bucket>();

  for (const order of orders) {
    // A cancelled order sold nothing and cost nothing, exactly as the Pedidos
    // tab treats it.
    if (isOrderVoided(order)) continue;

    // Grouping by name when there is no SKU keeps unrelated products apart;
    // without it every SKU-less line of a marketplace would pile into one row.
    const identity = order.sku ?? `nome:${order.product_name ?? "—"}`;
    // Grouped by store as well: the same product sold by two accounts on the
    // same marketplace is two lines, which is the whole point of recording it.
    const key = `${order.marketplace}|${order.account_id ?? "-"}|${order.report_month}|${identity}`;

    const bucket = buckets.get(key) ?? {
      key,
      marketplace: order.marketplace,
      account_id: order.account_id,
      report_month: order.report_month,
      sku: order.sku,
      names: new Map<string, number>(),
      units: 0,
      refunded: 0,
      gross: 0,
      net_sales: 0,
      net_revenue: 0,
      cost: 0,
      extra: 0,
      tax: null,
      client_id: order.client_id,
    };

    if (order.product_name) {
      bucket.names.set(order.product_name, (bucket.names.get(order.product_name) ?? 0) + 1);
    }
    bucket.units += order.quantity;
    bucket.refunded += order.returned_quantity;
    bucket.gross += Number(order.total_value);
    bucket.net_sales += Number(order.subtotal);
    bucket.net_revenue += orderNet(order, shares.get(order.id) ?? 1);
    bucket.cost += Number(order.cost ?? 0);
    bucket.extra += Number(order.extra_costs ?? 0);
    if (order.tax_percent != null) bucket.tax = Number(order.tax_percent);

    buckets.set(key, bucket);
  }

  return [...buckets.values()].map((b) => {
    // The one charge an order report really tells us: everything the platform
    // kept between the advertised price and what it paid out.
    const fees = round(b.net_sales - b.net_revenue);

    return {
      id: `derivado:${b.key}`,
      client_id: b.client_id,
      sales_report_id: "",
      marketplace: b.marketplace,
      account_id: b.account_id,
      report_month: b.report_month,
      external_id: null,
      sku: b.sku,
      product_name:
        [...b.names.entries()].sort((a, c) => c[1] - a[1])[0]?.[0] ?? b.sku ?? "—",
      brand: null,
      gross_sales: round(b.gross),
      net_sales: round(b.net_sales),
      net_revenue: round(b.net_revenue),
      units_sold: b.units,
      units_refunded: b.refunded,
      units_net: b.units,
      average_price: b.units > 0 ? round(b.net_sales / b.units) : 0,
      costs: (fees ? { [PLATFORM_FEES]: fees } : {}) as Record<string, number>,
      // Per unit, to line up with how Amazon's costs are typed.
      unit_cost: b.cost && b.units > 0 ? round(b.cost / b.units) : null,
      extra_costs: b.extra || null,
      tax_percent: b.tax,
      is_total: false,
      raw: null,
      created_at: new Date().toISOString(),
      derived: true as const,
    };
  });
}
