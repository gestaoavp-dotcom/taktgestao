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
  buildMercadoLivreBreakdown,
  computeMercadoLivreNet,
  isMercadoLivreExtraLine,
  isMercadoLivreVoided,
} from "./mercado-livre-breakdown";

/** What the marketplace actually deposits, before the seller's own costs. */
export function orderNet(order: SalesOrder, share = 1): number {
  if (!order.raw) return order.net_settlement;
  return order.marketplace === "mercado_livre"
    ? computeMercadoLivreNet(order.raw)
    : computeShopeeNet(order.raw, share);
}

export function buildOrderBreakdown(order: SalesOrder, share = 1): OrderBreakdown | null {
  if (!order.raw) return null;
  return order.marketplace === "mercado_livre"
    ? buildMercadoLivreBreakdown(order.raw)
    : buildShopeeBreakdown(order.raw, share);
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
}): boolean {
  return row.marketplace === "mercado_livre"
    ? Number(row.net_settlement ?? 0) > 0
    : Number(row.total_value) > 0;
}
