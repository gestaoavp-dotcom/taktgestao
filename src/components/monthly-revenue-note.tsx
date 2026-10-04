import { formatCurrency } from "@/lib/sales-summary";

function formatBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Said under a day chart whenever the total carries revenue the chart cannot:
 * a monthly product report (Amazon) has no days to spread over, so its value
 * counts in the totals and nowhere on the line — and without this note the two
 * look like they disagree.
 *
 * Also says which product reports stayed out: one covering several months
 * counts only in a period holding all of them, and a total that silently
 * skipped it would read as missing data.
 */
export function MonthlyRevenueNote({
  value,
  leftOut = [],
}: {
  value: number;
  leftOut?: { start: string; end: string; value: number }[];
}) {
  if (value <= 0 && !leftOut.length) return null;
  return (
    <>
      {value > 0 && (
        <p className="mt-3 text-xs text-[#94A0BD]">
          O total inclui {formatCurrency(value)} de relatórios mensais por produto (Amazon), que
          não têm valor por dia e por isso ficam fora do gráfico.
        </p>
      )}
      {leftOut.map((r) => (
        <p key={`${r.start}-${r.end}`} className="mt-2 text-xs text-[#c2410c]">
          Fora do total: {formatCurrency(r.value)} de um relatório da Amazon de{" "}
          {formatBR(r.start)} a {formatBR(r.end)}. Ele não separa as vendas por dia nem por mês, então
          só entra quando o período escolhido cobre essas datas inteiras.
        </p>
      ))}
    </>
  );
}
