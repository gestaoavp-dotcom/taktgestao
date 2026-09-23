// Parses the campaign report Mercado Livre's Publicidade section exports.
//
// The workbook opens with Ajuda and Glossário sheets; the figures are in
// "Relatório de campanha", where row 1 is a title, row 2 the headers and the
// rest one campaign each. Header cells carry line breaks ("CPC \n(Custo por
// clique)"), so columns are matched on a whitespace-collapsed name rather than
// read as object keys.
//
// A campaign is not an ad: this report groups by campaign, so one row can cover
// many listings. Only absolute figures are stored — CPC, CTR, CVR, ACOS and
// ROAS are all derivable, and a stored ratio is a ratio that can go stale or be
// averaged when it should be recomputed.

export type ParsedMercadoLivreAd = {
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

export const MERCADO_LIVRE_ADS_SHEET = "Relatório de campanha";

/** Where the header row sits, counted from zero. */
export const MERCADO_LIVRE_ADS_HEADER_ROW = 1;

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  // Mercado Livre writes an em dash where a ratio has no denominator.
  const s = String(value ?? "").trim();
  if (!s || s === "-" || s === "—") return 0;
  const n = parseFloat(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function toDateOnly(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? match[0] : null;
}

export function parseMercadoLivreAds(rows: unknown[][]): ParsedMercadoLivreAd[] {
  const header = (rows[MERCADO_LIVRE_ADS_HEADER_ROW] ?? []).map(clean);
  const body = rows.slice(MERCADO_LIVRE_ADS_HEADER_ROW + 1);

  const index = (name: string) => header.indexOf(name);
  const at = (row: unknown[], name: string) => {
    const i = index(name);
    return i === -1 ? undefined : row[i];
  };

  return body
    .filter((row) => clean(row[0]))
    .map((row) => ({
      ad_name: clean(row[0]),
      status: clean(at(row, "Status")) || null,
      // The report is grouped by campaign, and says so rather than leaving the
      // column empty and the reader guessing.
      ad_type: "Campanha",
      bid_method: null,
      placement: null,
      product_id: null,
      started_on: toDateOnly(at(row, "Desde")),
      ended_on: toDateOnly(at(row, "Até")),
      impressions: Math.round(toNumber(at(row, "Impressões"))),
      clicks: Math.round(toNumber(at(row, "Cliques"))),
      // Mercado Livre does not report adds to cart.
      add_to_cart: 0,
      conversions: Math.round(toNumber(at(row, "Vendas atribuídas (Diretas + Indiretas)"))),
      direct_conversions: Math.round(toNumber(at(row, "Vendas diretas"))),
      items_sold: Math.round(toNumber(at(row, "Unidades vendidas atribuídas"))),
      direct_items_sold: 0,
      gmv: toNumber(at(row, "Receita (Moeda local)")),
      direct_revenue: toNumber(at(row, "Receita por ventas diretas (Moeda local)")),
      expense: toNumber(at(row, "Investimento (Moeda local)")),
      raw: Object.fromEntries(header.map((name, i) => [name || `col${i}`, row[i]])),
    }));
}
