// Parses the business report Amazon's Seller Central exports by ASIN.
//
// The sheet is two rows of headers deep: row 1 names a group ("Vendas",
// "Comissão"), row 2 names the columns inside it, and a group's name appears
// only above its first column. Row 3 is Amazon's own "Total" line, and every
// row after it is one product.
//
// Groups nest — "Custo de logística" contains "Tarifas de logística do FBA",
// which contains "Tarifas do FBA", all holding the same money. Summing them all
// would count that money three times, so only the outermost charges count, and
// the result is checked against Amazon's own net figure:
//
//   Receita líquida = Vendas líquidas − (tarifas + ads + logística
//                                        + devoluções + outras cobranças)
//
// The Total line is not the sum of the products. Amazon bills some things to
// the account rather than to a listing — a seller reward, a stray adjustment —
// and the header says as much: "Inclui tarifas de produto e conta". That row is
// kept, flagged, so the difference can be shown instead of quietly vanishing.

export type ParsedAmazonProduct = {
  external_id: string | null;
  sku: string | null;
  product_name: string | null;
  brand: string | null;
  gross_sales: number;
  net_sales: number;
  net_revenue: number;
  units_sold: number;
  units_refunded: number;
  units_net: number;
  average_price: number;
  costs: Record<string, number>;
  is_total: boolean;
  raw: Record<string, unknown>;
};

/** The outermost charge of each kind. Anything below these repeats their money. */
const COST_GROUPS = [
  "Tarifas de venda",
  "Custo de vendas por anúncio",
  "Custo de logística",
  "Operações de devolução e recuperação",
  "Outras cobranças e reembolsos",
];

const RESIDUAL = "Outros ajustes da Amazon";

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const n = parseFloat(String(value).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function toText(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s && s !== "null" ? s : null;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

/**
 * `rows` is the sheet read with `header: 1` — an array of raw rows, because the
 * two header rows have to be read together and SheetJS's object mode would
 * flatten them into one.
 */
export function parseAmazonProducts(rows: unknown[][]): ParsedAmazonProduct[] {
  const [groupRow = [], columnRow = [], ...body] = rows;

  // A group's name is written once, above its first column; carry it right.
  const groups: string[] = [];
  let current = "";
  for (let i = 0; i < columnRow.length; i++) {
    if (groupRow[i]) current = clean(groupRow[i]);
    groups[i] = current;
  }

  const columns = columnRow.map(clean);

  const find = (group: string, column: string) =>
    columns.findIndex((c, i) => groups[i] === group && c === column);

  const at = (row: unknown[], group: string, column: string) => {
    const i = find(group, column);
    return i === -1 ? 0 : toNumber(row[i]);
  };

  return body
    .filter((row) => toText(row[0]))
    .map((row, index) => {
      const netSales = at(row, "Vendas", "Vendas líquidas (receita)");
      const netRevenue = at(row, "Receita líquida", "Total");

      const costs: Record<string, number> = {};
      for (const group of COST_GROUPS) {
        const value = round(at(row, group, "Total"));
        if (value) costs[group] = value;
      }

      // Whatever Amazon's own net says that these buckets do not explain gets
      // named, so the column always adds up to the figure Amazon settled.
      const residual = round(
        netSales - Object.values(costs).reduce((s, v) => s + v, 0) - netRevenue,
      );
      if (residual) costs[RESIDUAL] = residual;

      const raw = Object.fromEntries(
        columns
          .map((column, i) => [groups[i] ? `${groups[i]} — ${column}` : column, row[i]])
          .filter(([, value]) => value !== null && value !== undefined && value !== ""),
      );

      return {
        // Amazon's Total line puts its label where the ASIN goes.
        external_id: index === 0 ? null : toText(row[0]),
        sku: index === 0 ? null : toText(row[1]),
        product_name: index === 0 ? null : toText(row[2]),
        brand: index === 0 ? null : toText(row[3]),
        gross_sales: round(at(row, "Vendas", "Total de vendas (receita)")),
        net_sales: round(netSales),
        net_revenue: round(netRevenue),
        units_sold: Math.round(at(row, "Vendas", "Total de unidades vendidas")),
        units_refunded: Math.round(at(row, "Vendas", "Unidades reembolsadas")),
        units_net: Math.round(at(row, "Vendas", "Unidades líquidas vendidas")),
        average_price: round(at(row, "Vendas", "Preço médio de venda")),
        costs,
        is_total: index === 0,
        raw,
      };
    });
}
