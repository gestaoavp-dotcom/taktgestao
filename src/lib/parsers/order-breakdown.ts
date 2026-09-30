// Picks the right reading of an order for the marketplace it came from.
//
// Every platform reports the same sale differently: Shopee itemises the fees
// and leaves the net to be worked out, Mercado Livre states the net and keeps
// part of the arithmetic to itself. The Pedidos table shouldn't have to know
// which — it asks here.

import type { SalesOrder } from "@/lib/types";
import type { OrderBreakdown } from "./breakdown";
import { buildShopeeBreakdown, computeShopeeNet } from "./shopee-breakdown";
import {
  buildSheinBreakdown,
  computeSheinNet,
  isSheinVoided,
} from "./shein-breakdown";
import {
  buildMercadoLivreBreakdown,
  computeMercadoLivreNet,
  isMercadoLivreExtraLine,
  isMercadoLivreVoided,
} from "./mercado-livre-breakdown";

/**
 * What the marketplace actually deposits, before the seller's own costs.
 *
 * Prefers the figure stored at import. Recomputing it from the report row on
 * every page load is what forced that 66-column blob to be read, and what kept
 * the database from adding these up itself.
 */
export function orderNet(order: SalesOrder, share = 1): number {
  if (order.net_amount != null) return Number(order.net_amount);
  if (!order.raw) return order.net_settlement;
  if (order.marketplace === "mercado_livre") return computeMercadoLivreNet(order.raw);
  if (order.marketplace === "shein") return computeSheinNet(order.raw);
  return computeShopeeNet(order.raw, share);
}

export function buildOrderBreakdown(order: SalesOrder, share = 1): OrderBreakdown | null {
  if (!order.raw) return null;
  if (order.marketplace === "mercado_livre") return buildMercadoLivreBreakdown(order.raw);
  if (order.marketplace === "shein") return buildSheinBreakdown(order.raw);
  return buildShopeeBreakdown(order.raw, share);
}

/**
 * Cancelled or refunded: the platform charged nothing and the product never
 * left the shelf, so the order costs nothing either.
 */
export function isOrderVoided(order: SalesOrder): boolean {
  if (order.marketplace === "mercado_livre") {
    return order.raw
      ? isMercadoLivreVoided(order.raw)
      : Number(order.net_settlement) === 0 && Number(order.subtotal) > 0;
  }
  // Shein keeps the price on a refunded line and says so in the status.
  if (order.marketplace === "shein") {
    return order.raw ? isSheinVoided(order.raw) : Number(order.net_amount) === 0;
  }
  return Number(order.total_value) === 0;
}

/** A sale Mercado Livre split across lines, with the money on the first one. */
export function isExtraLine(order: SalesOrder): boolean {
  return (
    order.marketplace === "mercado_livre" && !!order.raw && isMercadoLivreExtraLine(order.raw)
  );
}

/**
 * Shopee repeats order-level amounts on every line of a multi-item order, so
 * each line takes its slice by how much of the order's products it accounts
 * for. Mercado Livre doesn't repeat anything, so its lines stay whole.
 */
export function orderShares(orders: SalesOrder[]): Map<string, number> {
  const lines = new Map<string, SalesOrder[]>();
  for (const order of orders) {
    lines.set(order.order_id, [...(lines.get(order.order_id) ?? []), order]);
  }

  const shares = new Map<string, number>();
  for (const group of lines.values()) {
    const total = group.reduce((sum, o) => sum + o.subtotal, 0);
    for (const order of group) {
      const split =
        group.length === 1 || order.marketplace === "mercado_livre"
          ? 1
          : total > 0
            ? order.subtotal / total
            : 1 / group.length;
      shares.set(order.id, split);
    }
  }
  return shares;
}

/**
 * A sale that actually brought money in, for revenue figures.
 *
 * Shopee zeroes the buyer's payment when an order is cancelled, so a non-zero
 * "Valor Total" is enough. Mercado Livre keeps the revenue columns filled and
 * reverses the sale in its own total instead — its settled figure is the only
 * column that tells a paid sale from a cancelled or returned one.
 */
export function isBilledOrder(row: {
  marketplace: string;
  total_value: number | string;
  net_settlement?: number | string | null;
  net_amount?: number | string | null;
}): boolean {
  if (row.marketplace === "mercado_livre") return Number(row.net_settlement ?? 0) > 0;
  // Shein bills the line whatever its status; a refund shows in net_amount.
  if (row.marketplace === "shein") return Number(row.net_amount ?? 0) > 0;
  return Number(row.total_value) > 0;
}
