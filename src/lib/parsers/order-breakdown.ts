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
  buildTikTokBreakdown,
  computeTikTokNet,
  isTikTokVoided,
} from "./tiktok-breakdown";
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
  // Amazon's orders report carries no fees; what was paid is all it knows.
  if (order.marketplace === "amazon") return Number(order.net_settlement);
  if (order.marketplace === "mercado_livre") return computeMercadoLivreNet(order.raw);
  if (order.marketplace === "shein") return computeSheinNet(order.raw);
  if (order.marketplace === "tiktok") {
    return computeTikTokNet(order.raw, order.affiliate_percent);
  }
  return computeShopeeNet(order.raw, share);
}

export function buildOrderBreakdown(order: SalesOrder, share = 1): OrderBreakdown | null {
  if (!order.raw) return null;
  // No fees in Amazon's orders report to break down; they are in Produtos.
  if (order.marketplace === "amazon") return null;
  if (order.marketplace === "mercado_livre") return buildMercadoLivreBreakdown(order.raw);
  if (order.marketplace === "shein") return buildSheinBreakdown(order.raw);
  if (order.marketplace === "tiktok") {
    return buildTikTokBreakdown(order.raw, order.affiliate_percent);
  }
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
  // Shein and TikTok keep the price on a cancelled line and say so in the
  // status, so the status is what settles it.
  if (order.marketplace === "shein") {
    return order.raw ? isSheinVoided(order.raw) : Number(order.net_amount) === 0;
  }
  if (order.marketplace === "tiktok") {
    return order.raw ? isTikTokVoided(order.raw) : Number(order.net_amount) === 0;
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
  // Shein and TikTok bill the line whatever its status; a cancellation shows
  // in net_amount instead.
  if (row.marketplace === "shein" || row.marketplace === "tiktok") {
    return Number(row.net_amount ?? 0) > 0;
  }
  return Number(row.total_value) > 0;
}

/** Words every marketplace uses for a sale that came back, in status or detail. */
const RETURN_WORDS = /devolu|devolvid|reembols|solicitação aprovada|return|refund/i;

/**
 * A sale the buyer sent back or was refunded for — out of revenue like a
 * cancellation, but shown on its own: it was sold, and losing it says
 * something a cancellation does not. A cancellation never left the shelf, so
 * it is neither. The database applies the same rule in orders_totals.
 */
export function isReturnedOrder(row: {
  marketplace: string;
  status?: string | null;
  refund_status?: string | null;
  subtotal: number | string;
  total_value: number | string;
  net_settlement?: number | string | null;
  net_amount?: number | string | null;
}): boolean {
  if (isBilledOrder(row)) return false;
  if (!(Number(row.subtotal) > 0)) return false;
  if (/cancel/i.test(row.status ?? "")) return false;
  return RETURN_WORDS.test(`${row.status ?? ""} ${row.refund_status ?? ""}`);
}
