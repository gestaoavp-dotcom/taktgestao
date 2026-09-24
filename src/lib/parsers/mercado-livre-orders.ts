// Parses the "Vendas BR" report Mercado Livre exports from Faturas e relatórios.
//
// The sheet opens with headings and links before the table starts, and how
// many varies between exports — the same account produced five rows one month
// and four the next. So the header is found by looking for the column every
// version has, never by counting rows.
//
// One row per sale. A sale that shipped together with others carries
// "Pacote de diversos produtos = Sim" but keeps its own money, so rows are
// never merged. The exception is a sale split across lines: the first line
// holds every amount and the following ones only the extra products, with all
// money blank. Those rows add nothing to a sum, which is exactly right.

import { stripPersonal } from "./strip-personal";

export type ParsedMercadoLivreOrder = {
  order_id: string;
  status: string | null;
  refund_status: string | null;
  created_on: string | null;
  product_name: string | null;
  sku: string | null;
  quantity: number;
  returned_quantity: number;
  unit_price: number;
  subtotal: number;
  total_value: number;
  shipping_fee_buyer: number;
  transaction_fee: number;
  commission_fee: number;
  service_fee: number;
  net_settlement: number;
  raw: Record<string, unknown>;
};

/** The column that identifies the table, present in every version of this export. */
const HEADER_MARKER = "N.º de venda";

/**
 * Where the header row is, counted from zero — pass as `range` to SheetJS.
 *
 * Takes the sheet as raw rows, because the preamble has no fixed height and
 * reading it as objects would make its first line the header whatever it says.
 */
export function findMercadoLivreHeaderRow(rows: unknown[][]): number {
  const index = rows.findIndex((row) =>
    row?.some((cell) => String(cell ?? "").trim() === HEADER_MARKER),
  );

  if (index === -1) {
    throw new Error(
      `Não achei a coluna "${HEADER_MARKER}" nesse arquivo. ` +
        "Ele parece ser outro relatório: em Faturas e relatórios, baixe o de Vendas.",
    );
  }
  return index;
}

const MONTHS: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  março: 3,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const n = parseFloat(String(value).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function toText(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

/** "31 de agosto de 2026 21:30 hs." — written out, in Portuguese. */
function toDateOnly(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);

  const match = String(value ?? "")
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2}) de ([a-zç]+) de (\d{4})/);
  if (!match) return null;

  const month = MONTHS[match[2]];
  if (!month) return null;

  return `${match[3]}-${String(month).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

export function parseMercadoLivreOrders(
  rows: Record<string, unknown>[],
): ParsedMercadoLivreOrder[] {
  return rows
    .filter((row) => row["N.º de venda"])
    .map((row) => {
      const products = toNumber(row["Receita por produtos (BRL)"]);
      const surcharge = toNumber(row["Receita por acréscimo no preço (pago pelo comprador)"]);
      const shipping = toNumber(row["Receita por envio (BRL)"]);

      // Mercado Livre writes deductions as negative numbers; the breakdown
      // shows magnitudes and applies the sign itself.
      const shippingCosts =
        toNumber(row["Tarifas de envio (BRL)"]) +
        toNumber(row["Custo de envio por troca de produto"]) +
        toNumber(row["Custo de envio com base nas medidas e peso declarados"]) +
        toNumber(row["Custo por diferenças nas medidas e no peso do pacote"]);

      return {
        order_id: String(row["N.º de venda"]).trim(),
        status: toText(row["Estado"]),
        refund_status: toText(row["Descrição do status"]),
        created_on: toDateOnly(row["Data da venda"]),
        product_name: toText(row["Título do anúncio"]),
        sku: toText(row["SKU"]),
        quantity: toNumber(row["Unidades"]),
        // Not reported per sale; the status says whether it came back.
        returned_quantity: 0,
        unit_price: toNumber(row["Preço unitário de venda do anúncio (BRL)"]),
        subtotal: products,
        total_value: products + surcharge + shipping,
        shipping_fee_buyer: shipping,
        transaction_fee: Math.abs(toNumber(row["Taxa de parcelamento equivalente ao acréscimo"])),
        commission_fee: Math.abs(toNumber(row["Tarifa de venda e impostos (BRL)"])),
        service_fee: Math.abs(shippingCosts),
        net_settlement: toNumber(row["Total (BRL)"]),
        raw: stripPersonal(row),
      };
    });
}
