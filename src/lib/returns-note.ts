import type { Returns } from "@/lib/orders-summary";
import { formatCurrency } from "@/lib/sales-summary";

/** Under the revenue, which is the product price: what buyers really paid. */
export function paidNote(paid: number | null): string | undefined {
  return paid == null ? undefined : `Pago pelos compradores: ${formatCurrency(paid)}`;
}

/**
 * Said under every revenue figure: returns stay out of it, and this is where
 * they show — with the figure as it would be counting them, so neither number
 * has to be worked out by hand.
 */
export function returnsNote(revenue: number, returns: Returns): string | undefined {
  if (!returns.orders) return undefined;
  return (
    `Devoluções: ${formatCurrency(returns.value)} em ${returns.orders} ` +
    `pedido${returns.orders === 1 ? "" : "s"}, fora do faturamento. ` +
    `Com elas: ${formatCurrency(revenue + returns.value)}.`
  );
}
