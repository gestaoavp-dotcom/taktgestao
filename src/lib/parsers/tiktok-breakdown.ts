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

export function isTikTokVoided(raw: Record<string, unknown>) {
  return CANCELLED.test(String(raw["Order Status"] ?? ""));
}

function money(raw: Record<string, unknown>, key: string) {
  return toNumber(String(raw[key] ?? "").replace(/[A-Za-z$\s]/g, ""));
}

/** What the buyer paid for the line, before TikTok's own cut. */
export function computeTikTokNet(raw: Record<string, unknown>): number {
  if (isTikTokVoided(raw)) return 0;
  return round(money(raw, "SKU Subtotal After Discount"));
}

export function buildTikTokBreakdown(raw: Record<string, unknown>): OrderBreakdown {
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

  const sections: BreakdownSection[] = [
    {
      title: "Pago pelo comprador",
      lines: products,
      total: computeTikTokNet(raw),
    },
    {
      title: "Comissão do TikTok",
      note: "não vem neste relatório",
      lines: [
        {
          label: "A plataforma não informa sua tarifa no relatório de pedidos",
          note: "o valor acima ainda não desconta isso",
          value: 0,
          kind: "info",
        },
      ],
      total: 0,
      counted: false,
    },
  ];

  const otherFields = Object.entries(raw)
    .filter(([key]) => !seen.has(key))
    .map(([label, value]) => ({ label, value }));

  return {
    sections,
    net: computeTikTokNet(raw),
    voided: isTikTokVoided(raw),
    shared: false,
    otherFields,
  };
}
