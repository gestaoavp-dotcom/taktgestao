import { formatCurrency } from "@/lib/sales-summary";

/**
 * Said under a day chart whenever part of the total is an estimate: a product
 * report (Amazon without its orders file) has no date per sale, so its value is
 * spread evenly over the days it covers — exact for whole months, an average
 * day by day. Without this note the line would read as Amazon's real days.
 */
export function MonthlyRevenueNote({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <p className="mt-3 text-xs text-ink-3">
      Inclui {formatCurrency(value)} da Amazon vindos do relatório por produto, que não tem a data
      de cada venda: o valor do mês foi dividido por igual entre os dias. Envie o relatório de
      pedidos da Amazon (.txt) para ter o valor exato de cada dia.
    </p>
  );
}
