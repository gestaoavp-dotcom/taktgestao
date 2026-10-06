// Parses the campaign report Mercado Livre's Publicidade section exports.
//
// The workbook opens with Ajuda and Glossário sheets; the figures are on the
// campaign sheet, where row 1 is a title, row 2 the headers and the rest one
// campaign each. Header cells carry line breaks ("CPC \n(Custo por clique)"),
// so columns are matched on a whitespace-collapsed name rather than read as
// object keys.
//
// Publicidade exports more than this one, and they arrive looking alike: the
// "Relatório de vendas por publicidade" carries sales and revenue per
// sponsored listing but no investment, clicks or impressions, so reading it
// here would fill the Ads tab with campaigns that appear to have cost nothing.
// It is turned away by name instead.
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

/**
 * The sheet holding the campaign figures, however this export spells it.
 *
 * Matched on the word rather than the full name: "Relatório de campanha" and
 * "Relatório de campanhas" are the same report, and a file that is right
 * should not be refused over a plural.
 */
export function findMercadoLivreAdsSheet(names: string[]): string | undefined {
  return names.find((name) => /campanha/i.test(name));
}

/**
 * Publicidade offers more than one export and they look alike from the
 * download folder. Naming the one that arrived is the difference between
 * "this file is wrong" and knowing which to fetch instead.
 */
export function describeMercadoLivreAdsFile(names: string[]): string | null {
  if (names.some((name) => /vendas/i.test(name))) {
    return "o Relatório de vendas por publicidade";
  }
  if (names.some((name) => /anúncio|anuncio/i.test(name))) {
    return "o relatório por anúncio";
  }
  return null;
}

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

const MONTHS: Record<string, string> = {
  jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06",
  jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12",
};

/** "2026-09-21", or "03-ago-2026" as the placement report writes it. */
function toDateOnly(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value ?? "").trim().toLowerCase();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const pt = s.match(/^(\d{1,2})-([a-z]{3})-(\d{4})/);
  if (pt && MONTHS[pt[2]]) return `${pt[3]}-${MONTHS[pt[2]]}-${pt[1].padStart(2, "0")}`;
  return null;
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
      // The placement report, one row per campaign, week and ad space, calls
      // the same figure "Vendas por publicidade".
      conversions: Math.round(
        toNumber(
          at(row, "Vendas atribuídas (Diretas + Indiretas)") ??
            at(row, "Vendas por publicidade (Diretas + Indiretas)"),
        ),
      ),
      direct_conversions: Math.round(toNumber(at(row, "Vendas diretas"))),
      items_sold: Math.round(toNumber(at(row, "Unidades vendidas atribuídas"))),
      direct_items_sold: 0,
      gmv: toNumber(at(row, "Receita (Moeda local)")),
      direct_revenue: toNumber(at(row, "Receita por ventas diretas (Moeda local)")),
      expense: toNumber(at(row, "Investimento (Moeda local)")),
      raw: Object.fromEntries(header.map((name, i) => [name || `col${i}`, row[i]])),
    }));
}
