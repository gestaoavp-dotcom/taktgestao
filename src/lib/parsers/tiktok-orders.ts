// Parses the order export TikTok Shop's seller centre produces as CSV.
//
// One row per item line. Amounts arrive as "BRL 49,90" — the currency in the
// cell, and a comma for the decimal — and dates in US order, 09/29/2026 being
// the 29th of September.
//
// What it does not carry is TikTok's commission: the export has columns for
// shipping and for discounts, and none for what the platform keeps. The net
// here is therefore what the buyer paid, before a fee we cannot see, and
// tiktok-breakdown says so on every order rather than letting the figure pass
// as a settlement.

import { stripPersonal } from "./strip-personal";
import { sellerPrice, tiktokFees } from "./tiktok-breakdown";

export type ParsedTikTokOrder = {
  order_id: string;
  status: string | null;
  refund_status: string | null;
  created_on: string | null;
  product_name: string | null;
  sku: string | null;
  quantity: number;
  returned_quantity: number;
  /** The price the marketplace charges against, and what it charges. */
  gross_base: number;
  fee_amount: number;
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

const HEADER_MARKER = "Order ID";

/** "BRL 1.234,56" — currency inside the cell, comma for the decimal. */
function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const s = String(value ?? "")
    .replace(/[A-Za-z$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function toText(value: unknown): string | null {
  // Cells arrive padded with tabs, which a trim alone leaves behind.
  const s = String(value ?? "").replace(/[\t\u0000]/g, "").replace(/\s+/g, " ").trim();
  return s ? s : null;
}

/** "09/29/2026 11:59:16 PM" — month first. */
function toDateOnly(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);

  const match = String(value ?? "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  return `${match[3]}-${match[1]}-${match[2]}`;
}

export function findTikTokHeaderRow(rows: unknown[][]): number {
  const index = rows.findIndex((row) =>
    row?.some((cell) => String(cell ?? "").replace(/^﻿/, "").trim() === HEADER_MARKER),
  );
  if (index === -1) {
    throw new Error(
      `Não achei a coluna "${HEADER_MARKER}" nesse arquivo. ` +
        "No TikTok Shop, exporte o relatório de Pedidos.",
    );
  }
  return index;
}

export function parseTikTokOrders(rows: unknown[][]): ParsedTikTokOrder[] {
  const headerRow = findTikTokHeaderRow(rows);
  // The first cell carries a byte-order mark that would hide "Order ID".
  const header = (rows[headerRow] ?? []).map((h) =>
    String(h ?? "").replace(/^﻿/, "").replace(/\s+/g, " ").trim(),
  );
  const at = (row: unknown[], name: string) => {
    const i = header.indexOf(name);
    return i === -1 ? undefined : row[i];
  };

  return rows
    .slice(headerRow + 1)
    .filter((row) => toText(at(row, "Order ID")))
    .map((row) => {
      const paid = toNumber(at(row, "SKU Subtotal After Discount"));
      const clean = stripPersonal(
        Object.fromEntries(header.map((name, i) => [name || `col${i}`, row[i]])),
      );
      const fees = tiktokFees(clean);

      return {
        order_id: toText(at(row, "Order ID"))!,
        status: toText(at(row, "Order Status")),
        refund_status: toText(at(row, "Cancelation/Return Type")),
        created_on: toDateOnly(at(row, "Created Time")),
        product_name: toText(at(row, "Product Name")),
        sku: toText(at(row, "Seller SKU")),
        quantity: toNumber(at(row, "Quantity")) || 1,
        returned_quantity: toNumber(at(row, "Sku Quantity of return")),
        unit_price: toNumber(at(row, "SKU Unit Original Price")),
        // Before the seller's own discount, which is what "sold" means here.
        subtotal: toNumber(at(row, "SKU Subtotal Before Discount")),
        total_value: paid,
        shipping_fee_buyer: toNumber(at(row, "Shipping Fee After Discount")),
        transaction_fee: 0,
        // TikTok's cut is not in this export. Left at zero, and named as
        // missing in the breakdown rather than quietly assumed to be nothing.
        commission_fee: 0,
        service_fee: 0,
        net_settlement: 0,
        gross_base: sellerPrice(clean),
        fee_amount: round2(fees.commission + fees.perItem),
        raw: clean,
      };
    });
}
