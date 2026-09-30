// Works out what an order line on TikTok Shop is worth — and says plainly what
// it cannot work out.
//
// The order export carries the price, both discounts and the shipping, and no
// commission at all. So the figure here is what the buyer paid after the
// seller's own discount, which is not a settlement: TikTok's cut comes off it,
// and lives in a different report.
//
// Rather than let that pass as a net, the breakdown carries a line naming the
// charge as unknown. A number that looks settled and is not is worse than one
// that admits what is missing.

import {
  round,
  toNumber,
  type BreakdownLine,
  type BreakdownSection,
  type OrderBreakdown,
} from "./breakdown";

const CANCELLED = /cancelad|reembols|devolv/i;

/**
 * TikTok Shop's published fee table, which the order export never carries.
 *
 * Both bands pay a commission and a per-item fee, and which band applies is
 * decided by the item's price after the seller's own discounts. The rates
 * changed on 15 July 2026, so the order's date picks the table — a report
 * covering both sides of that date must not be charged one rate throughout.
 */
const FEE_CHANGE = "2026-07-15";

type Fees = { commission: number; perItem: number };

function feeTable(priceAfterDiscount: number, orderedOn: string | null): Fees {
  const after = !orderedOn || orderedOn >= FEE_CHANGE;
  if (!after) return { commission: 0.06, perItem: 4 };
  return priceAfterDiscount < 50
    ? { commission: 0.1, perItem: 4 }
    : { commission: 0.06, perItem: 6 };
}

/** The date the order was created, as the export writes it: month first. */
function orderDate(raw: Record<string, unknown>): string | null {
  const m = String(raw["Created Time"] ?? "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null;
}

export function isTikTokVoided(raw: Record<string, unknown>) {
  return CANCELLED.test(String(raw["Order Status"] ?? ""));
}

function money(raw: Record<string, unknown>, key: string) {
  return toNumber(String(raw[key] ?? "").replace(/[A-Za-z$\s]/g, ""));
}

export function tiktokFees(raw: Record<string, unknown>) {
  const paid = money(raw, "SKU Subtotal After Discount");
  const quantity = Math.max(1, Math.round(money(raw, "Quantity")) || 1);
  const table = feeTable(paid, orderDate(raw));

  return {
    commission: round(paid * table.commission),
    commissionRate: table.commission,
    perItem: round(table.perItem * quantity),
    perItemRate: table.perItem,
    quantity,
  };
}

/**
 * What the seller is left with, before their own product cost.
 *
 * The affiliate's share is a percentage the seller sets per product; it is not
 * in the export either, so it is typed in and stored on the order.
 */
export function computeTikTokNet(
  raw: Record<string, unknown>,
  affiliatePercent?: number | null,
): number {
  if (isTikTokVoided(raw)) return 0;

  const paid = money(raw, "SKU Subtotal After Discount");
  const fees = tiktokFees(raw);
  const affiliate = round((paid * Number(affiliatePercent ?? 0)) / 100);

  return round(paid - fees.commission - fees.perItem - affiliate);
}

export function buildTikTokBreakdown(
  raw: Record<string, unknown>,
  affiliatePercent?: number | null,
): OrderBreakdown {
  const seen = new Set<string>([
    "SKU Subtotal Before Discount",
    "SKU Seller Discount",
    "SKU Platform Discount",
    "SKU Subtotal After Discount",
  ]);

  const products: BreakdownLine[] = [
    {
      label: "Preço do produto",
      value: money(raw, "SKU Subtotal Before Discount"),
      kind: "item",
    },
    {
      label: "Desconto do vendedor",
      value: money(raw, "SKU Seller Discount"),
      kind: "deduction",
    },
    {
      label: "Desconto do TikTok",
      note: "bancado pela plataforma",
      value: money(raw, "SKU Platform Discount"),
      kind: "info",
    },
  ];

  const paid = money(raw, "SKU Subtotal After Discount");
  const fees = tiktokFees(raw);
  const affiliate = round((paid * Number(affiliatePercent ?? 0)) / 100);

  const sections: BreakdownSection[] = [
    { title: "Pago pelo comprador", lines: products, total: paid },
    {
      title: "Tarifas do TikTok",
      // Applied from the published table, because the order export carries no
      // fee column at all.
      note: "pela tabela do TikTok, não vem no relatório",
      lines: [
        {
          label: `Comissão (${Math.round(fees.commissionRate * 100)}%)`,
          note:
            paid < 50
              ? "item abaixo de R$ 50,00"
              : "item de R$ 50,00 ou mais",
          value: fees.commission,
          kind: "deduction",
        },
        {
          label: `Taxa por item (${fees.quantity} × ${fees.perItemRate.toFixed(2).replace(".", ",")})`,
          value: fees.perItem,
          kind: "deduction",
        },
      ],
      total: round(fees.commission + fees.perItem),
      subtracted: true,
    },
    {
      title: "Afiliado",
      note: affiliatePercent ? undefined : "preencha a % na linha do pedido",
      lines: [
        {
          label: `Comissão do afiliado (${Number(affiliatePercent ?? 0)}%)`,
          value: affiliate,
          kind: "deduction",
        },
      ],
      total: affiliate,
      subtracted: true,
    },
  ];

  const otherFields = Object.entries(raw)
    .filter(([key]) => !seen.has(key))
    .map(([label, value]) => ({ label, value }));

  return {
    sections,
    net: computeTikTokNet(raw, affiliatePercent),
    voided: isTikTokVoided(raw),
    shared: false,
    otherFields,
  };
}
