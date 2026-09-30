// Works out what Shein pays for one order line.
//
// Shein exports a "Receita estimada de mercadoria" column and leaves it empty,
// so there is nothing to take the way Mercado Livre's total is taken. The net
// is the sale price less what the store itself funded and what Shein charged:
//
//   Preço do produto
//   − cupom − desconto de campanha da loja        (funded by the store)
//   − comissão − intermediação de frete − estocagem  (charged by Shein)
//
// A refunded line nets nothing: the money went back and the product with it.

import {
  round,
  toNumber,
  type BreakdownLine,
  type BreakdownSection,
  type OrderBreakdown,
} from "./breakdown";

/** Funded by the store: each comes off the advertised price. */
const STORE_DISCOUNTS = [
  { key: "Valor do cupom", label: "Cupom" },
  { key: "Desconto de campanha da loja", label: "Desconto de campanha da loja" },
];

/** Charged by Shein. */
const FEES = [
  { key: "Comissão" },
  { key: "Taxa de intermediação de frete", label: "Intermediação de frete" },
  { key: "Taxa de operação de estocagem", label: "Operação de estocagem" },
];

/** Statuses where the money went back to the buyer. */
const REFUNDED = /reembols|cancelad|devolv/i;

export function isSheinVoided(raw: Record<string, unknown>) {
  return REFUNDED.test(String(raw["Status do pedido"] ?? ""));
}

function priceAfterDiscounts(raw: Record<string, unknown>) {
  return round(
    toNumber(raw["Preço do produto"]) -
      STORE_DISCOUNTS.reduce((sum, d) => sum + toNumber(raw[d.key]), 0),
  );
}

function feesTotal(raw: Record<string, unknown>) {
  return round(FEES.reduce((sum, f) => sum + toNumber(raw[f.key]), 0));
}

export function computeSheinNet(raw: Record<string, unknown>): number {
  if (isSheinVoided(raw)) return 0;
  return round(priceAfterDiscounts(raw) - feesTotal(raw));
}

export function buildSheinBreakdown(raw: Record<string, unknown>): OrderBreakdown {
  const seen = new Set<string>(["Preço do produto"]);

  const take = (
    { key, label }: { key: string; label?: string },
    kind: BreakdownLine["kind"],
  ): BreakdownLine => {
    seen.add(key);
    return { label: label ?? key, value: toNumber(raw[key]), kind };
  };

  const products: BreakdownLine[] = [
    {
      label: "Preço do produto",
      note: "valor anunciado",
      value: toNumber(raw["Preço do produto"]),
      kind: "item",
    },
    ...STORE_DISCOUNTS.filter((d) => d.key in raw).map((d) => take(d, "deduction")),
  ];

  const fees = FEES.filter((f) => f.key in raw).map((f) => take(f, "deduction"));

  const sections: BreakdownSection[] = [
    { title: "Preço de venda", lines: products, total: priceAfterDiscounts(raw) },
    { title: "Tarifas da Shein", lines: fees, total: feesTotal(raw), subtracted: true },
  ];

  const otherFields = Object.entries(raw)
    .filter(([key]) => !seen.has(key))
    .map(([label, value]) => ({ label, value }));

  return {
    sections,
    net: computeSheinNet(raw),
    voided: isSheinVoided(raw),
    shared: false,
    otherFields,
  };
}
