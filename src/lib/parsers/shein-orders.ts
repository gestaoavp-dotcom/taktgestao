// Parses the order export Shein's seller centre produces.
//
// Two header rows: the first groups columns, the second names them, so the
// real header is row two and the data starts at row three.
//
// One row per item line — 384 orders across 422 lines in the first export —
// and every amount is already that line's own, so nothing is prorated.
//
// Shein leaves "Receita estimada de mercadoria" empty, so unlike Mercado Livre
// there is no settled figure to take: the net has to be worked out from the
// charges, and shein-breakdown does it in one place.

import { stripPersonal } from "./strip-personal";

export type ParsedSheinOrder = {
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

/** The column that identifies the table, whatever the preamble does. */
const HEADER_MARKER = "Número do pedido";

const MONTHS: Record<string, number> = {
  janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

export function findSheinHeaderRow(rows: unknown[][]): number {
  const index = rows.findIndex((row) =>
    row?.some((cell) => String(cell ?? "").replace(/\s+/g, " ").trim() === HEADER_MARKER),
  );
  if (index === -1) {
    throw new Error(
      `Não achei a coluna "${HEADER_MARKER}" nesse arquivo. ` +
        "Na Shein, exporte o relatório de Pedidos.",
    );
  }
  return index;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const n = parseFloat(String(value).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function toText(value: unknown): string | null {
  const s = String(value ?? "").replace(/\s+/g, " ").trim();
  return s ? s : null;
}

/** "30 setembro 2026 02:29" — day, month name, year. */
function toDateOnly(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);

  const match = String(value ?? "")
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})\s+([a-zç]+)\s+(\d{4})/);
  if (!match) return null;

  const month = MONTHS[match[2]];
  if (!month) return null;
  return `${match[3]}-${String(month).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

export function parseSheinOrders(rows: unknown[][]): ParsedSheinOrder[] {
  const headerRow = findSheinHeaderRow(rows);
  const header = (rows[headerRow] ?? []).map((h) =>
    String(h ?? "").replace(/\s+/g, " ").trim(),
  );
  const at = (row: unknown[], name: string) => {
    const i = header.indexOf(name);
    return i === -1 ? undefined : row[i];
  };

  return rows
    .slice(headerRow + 1)
    .filter((row) => toText(at(row, "Número do pedido")))
    .map((row) => {
      const price = toNumber(at(row, "Preço do produto"));
      const coupon = toNumber(at(row, "Valor do cupom"));
      const campaign = toNumber(at(row, "Desconto de campanha da loja"));

      return {
        order_id: String(at(row, "Número do pedido")).trim(),
        status: toText(at(row, "Status do pedido")),
        refund_status: toText(at(row, "Motivo do reembolso")),
        created_on: toDateOnly(at(row, "Data e hora de criação do pedido")),
        product_name: toText(at(row, "Nome do produto")),
        sku: toText(at(row, "SKU do vendedor")),
        quantity: toNumber(at(row, "Número de artigos vendidos")) || 1,
        returned_quantity: 0,
        unit_price: price,
        subtotal: price,
        // What the buyer actually paid for the line, after the store's own
        // discounts. Zero on nothing, so a refund is told apart by its status.
        total_value: price - coupon - campaign,
        shipping_fee_buyer: 0,
        transaction_fee: toNumber(at(row, "Taxa de intermediação de frete")),
        commission_fee: toNumber(at(row, "Comissão")),
        service_fee: toNumber(at(row, "Taxa de operação de estocagem")),
        // Shein leaves its own estimate blank; the net comes from the charges.
        net_settlement: 0,
        raw: stripPersonal(
          Object.fromEntries(header.map((name, i) => [name || `col${i}`, row[i]])),
        ),
      };
    });
}
