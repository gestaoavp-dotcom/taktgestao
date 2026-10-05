// Parses the orders report Amazon's Seller Central exports as a tab-separated
// .txt ("Todos os pedidos" / All Orders): one row per item of an order, with
// its purchase moment, status, quantity and price.
//
// Unlike the business report by product, it dates every sale — so Amazon fills
// the day chart, any period and a file spanning months like the others. What
// it lacks is Amazon's fees: those are only in the product report, which stays
// the source for the margin.
//
// Amounts are plain decimals ("229.98"). A cancelled item comes with no price
// at all, which is what tells it apart; the purchase moment is in UTC and the
// day is taken in Brazil's time, as everywhere else.

import { stripPersonal } from "./strip-personal";

export type ParsedAmazonOrder = {
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

/** The column every version of this export opens with. */
export const AMAZON_ORDERS_MARKER = "amazon-order-id";

const STATUS: Record<string, string> = {
  Shipped: "Enviado",
  Shipping: "Enviando",
  Pending: "Pendente",
  Cancelled: "Cancelado",
  Unshipped: "Não enviado",
};

/** The buyer's data in this export. Dropped before anything is stored. */
const PERSONAL = new Set([
  "cpf",
  "ship-city",
  "ship-state",
  "ship-postal-code",
  "ship-country",
  "ship-county",
  "buyer-name",
  "buyer-email",
  "buyer-phone-number",
  "recipient-name",
  "ship-address-1",
  "ship-address-2",
  "ship-address-3",
]);

function toNumber(value: unknown): number {
  const n = parseFloat(String(value ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function toText(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

/** "2026-07-31T02:15:09+00:00" → the day it was in Brazil: "2026-07-30". */
function toBrazilDay(value: unknown): string | null {
  const date = new Date(String(value ?? "").trim());
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);
}

/** Whether a file's text is this report — read before choosing a parser. */
export function isAmazonOrdersText(text: string) {
  return text.replace(/^﻿/, "").trimStart().startsWith(AMAZON_ORDERS_MARKER);
}

export function parseAmazonOrders(text: string): ParsedAmazonOrder[] {
  const [headerLine = "", ...lines] = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  const header = headerLine.split("\t").map((h) => h.trim());

  return lines
    .map((line) => {
      const cells = line.split("\t");
      return Object.fromEntries(header.map((h, i) => [h, cells[i]?.trim() ?? ""]));
    })
    .filter((row) => row[AMAZON_ORDERS_MARKER])
    .map((row) => {
      const quantity = toNumber(row["quantity"]);
      const price = toNumber(row["item-price"]);
      const shipping = toNumber(row["shipping-price"]);
      // Amazon writes discounts as negative or positive depending on the
      // export; the magnitude is what comes off.
      const discounts =
        Math.abs(toNumber(row["item-promotion-discount"])) +
        Math.abs(toNumber(row["ship-promotion-discount"]));
      const paid = Math.max(price + shipping - discounts, 0);

      const raw = stripPersonal(
        Object.fromEntries(Object.entries(row).filter(([key]) => !PERSONAL.has(key))),
      );

      return {
        order_id: String(row[AMAZON_ORDERS_MARKER]).trim(),
        status: STATUS[row["order-status"]] ?? toText(row["order-status"]),
        refund_status: null,
        created_on: toBrazilDay(row["purchase-date"]),
        product_name: toText(row["product-name"]),
        sku: toText(row["sku"]),
        quantity,
        returned_quantity: 0,
        unit_price: quantity > 0 ? Math.round((price / quantity) * 100) / 100 : 0,
        // The product price, as revenue is everywhere; what the buyer paid
        // — discounts off, shipping on — beside it.
        subtotal: price,
        total_value: paid,
        shipping_fee_buyer: shipping,
        // Not in this report: Amazon's fees come in the product report.
        transaction_fee: 0,
        commission_fee: 0,
        service_fee: 0,
        net_settlement: paid,
        raw,
      };
    });
}
