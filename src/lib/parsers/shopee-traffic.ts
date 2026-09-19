// Parses Shopee's "parentskudetail" export — product performance for a month:
// impressions, clicks, visits, bounce, cart and conversion, per product.
//
// Two traps in this file:
//  - Numbers come Brazilian-formatted as text ("1.331,65", "1,72%"), and an
//    empty cell is "-", not blank.
//  - Rows are a mix of parent items and their variations. Only parent rows
//    carry traffic (a variation's traffic reads "-"), so summing every row
//    would count the same product twice.

export type ParsedShopeeTraffic = {
  item_id: string | null;
  product_name: string;
  sku: string | null;
  variation_name: string | null;
  is_variation: boolean;
  impressions: number;
  clicks: number;
  unique_impressions: number;
  unique_clicks: number;
  visitors: number;
  page_views: number;
  bounced_visitors: number;
  search_clicks: number;
  likes: number;
  cart_visitors: number;
  cart_units: number;
  orders_placed: number;
  orders_paid: number;
  units_placed: number;
  units_paid: number;
  buyers_placed: number;
  buyers_paid: number;
  sales_placed: number;
  sales_paid: number;
  raw: Record<string, unknown>;
};

/** "1.331,65" -> 1331.65 · "1,72%" -> 1.72 · "-" -> 0 */
function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const s = String(value ?? "").trim();
  if (!s || s === "-") return 0;
  const n = parseFloat(s.replace("%", "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function toText(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return !s || s === "-" ? null : s;
}

export function parseShopeeTraffic(rows: Record<string, unknown>[]): ParsedShopeeTraffic[] {
  return rows
    .filter((row) => toText(row["Produto"]))
    .map((row) => ({
      item_id: toText(row["ID do Item"]),
      product_name: String(row["Produto"]).trim(),
      sku: toText(row["SKU da Variação"]) ?? toText(row["SKU Principle"]),
      variation_name: toText(row["Nome da Variação"]),
      is_variation: Boolean(toText(row["ID da Variação"])),
      impressions: toNumber(row["Impressão do Produto"]),
      clicks: toNumber(row["Cliques Por Produto"]),
      unique_impressions: toNumber(row["Impressões Únicas de Produto"]),
      unique_clicks: toNumber(row["Cliques Únicos no Produto"]),
      visitors: toNumber(row["Visitantes do Produto (Visita)"]),
      page_views: toNumber(row["Visualizações da Página do Produto"]),
      bounced_visitors: toNumber(row["Visitantes que saíram da página"]),
      search_clicks: toNumber(row["Cliques em buscas"]),
      likes: toNumber(row["Curtidas"]),
      cart_visitors: toNumber(row["Visitantes do Produto (Adicionar ao Carrinho)"]),
      cart_units: toNumber(row["Unidades (adicionar ao carrinho)"]),
      orders_placed: toNumber(row["Pedido Feito"]),
      orders_paid: toNumber(row["Produto Pago"]),
      units_placed: toNumber(row["Unidades (Pedido realizado)"]),
      units_paid: toNumber(row["Unidades (Pedido pago)"]),
      buyers_placed: toNumber(row["Compradores (Pedido realizado)"]),
      buyers_paid: toNumber(row["Compradores (Pedidos pago)"]),
      sales_placed: toNumber(row["Vendas (Pedido realizado) (BRL)"]),
      sales_paid: toNumber(row["Vendas (Pedido pago) (BRL)"]),
      raw: row,
    }));
}
