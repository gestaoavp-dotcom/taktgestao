import { formatCurrency } from "@/lib/sales-summary";

/**
 * Said under a day chart whenever the total carries revenue the chart cannot:
 * a monthly product report (Amazon) has no days to spread over, so its value
 * counts in the totals and nowhere on the line — and without this note the two
 * look like they disagree.
 */
export function MonthlyRevenueNote({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <p className="mt-3 text-xs text-[#94A0BD]">
      O total inclui {formatCurrency(value)} de relatórios mensais por produto (Amazon), que não
      têm valor por dia e por isso ficam fora do gráfico.
    </p>
  );
}
