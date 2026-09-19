// Parses the "Relatório de Todos os Anúncios CPC" that Shopee's ads manager
// exports as CSV. The file opens with a few lines about the store and the
// period, so the real header is found rather than assumed to be line one.
//
// Only absolute figures are stored. Every ratio (CTR, ROAS, ACOS, conversion
// rate) is derived where it is shown, so a total reads GMV ÷ spend rather than
// the average of each ad's own ratio, which would be wrong.

export type ParsedShopeeAd = {
  ad_name: string;
  status: string | null;
  ad_type: string | null;
  bid_method: string | null;
  placement: string | null;
  product_id: string | null;
  started_on: string | null;
  ended_on: string | null;
  impressions: number;
  clicks: number;
  add_to_cart: number;
  conversions: number;
  direct_conversions: number;
  items_sold: number;
  direct_items_sold: number;
  gmv: number;
  direct_revenue: number;
  expense: number;
  raw: Record<string, unknown>;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const cleaned = String(value).replace("%", "").replace(/\s/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function toText(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

/**
 * Shopee writes "28/07/2026 00:00:00", or "Ilimitado" for an open end.
 *
 * Read the sheet with `raw: true`: left to itself, the CSV reader turns a
 * day-first date it can also read month-first ("11/04/2026") into a serial
 * number for the wrong month, while leaving "18/03/2026" alone.
 */
function toDateOnly(value: unknown): string | null {
  const s = String(value ?? "").trim();
  const match = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${m}-${d}`;
}

/**
 * The export starts with store and period lines, so the column header is the
 * first line beginning with the row-number column.
 */
export function stripAdsPreamble(csv: string): string {
  const lines = csv.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.startsWith("#,"));
  return headerIndex === -1 ? csv : lines.slice(headerIndex).join("\n");
}

export function parseShopeeAds(rows: Record<string, unknown>[]): ParsedShopeeAd[] {
  return rows
    .filter((row) => toText(row["Nome do Anúncio"]))
    .map((row) => ({
      ad_name: String(row["Nome do Anúncio"]).trim(),
      status: toText(row["Status"]),
      ad_type: toText(row["Tipos de Anúncios"]),
      bid_method: toText(row["Método de Lance"]),
      placement: toText(row["Posicionamento"]),
      product_id: toText(row["ID do produto"]),
      started_on: toDateOnly(row["Data de Início"]),
      ended_on: toDateOnly(row["Data de Encerramento"]),
      impressions: toNumber(row["Impressões"]),
      clicks: toNumber(row["Cliques"]),
      add_to_cart: toNumber(row["Adicionar ao carrinho"]),
      conversions: toNumber(row["Conversões"]),
      direct_conversions: toNumber(row["Conversões Diretas"]),
      items_sold: toNumber(row["Itens Vendidos"]),
      direct_items_sold: toNumber(row["Itens Vendidos Diretos"]),
      gmv: toNumber(row["GMV"]),
      direct_revenue: toNumber(row["Receita direta"]),
      expense: toNumber(row["Despesas"]),
      raw: row,
    }));
}
