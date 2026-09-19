// Reproduces Shopee's own "Informações de Pagamento" breakdown for one order
// line, so the number here matches "Renda estimada do pedido" in seller center:
//
//   Subtotal dos Produtos + Subtotal estimado do frete − Taxas e Encargos
//
// Verified against the seller-center export: for every row,
// "Preço original" × qtd − "Desconto do vendedor" = "Subtotal do produto"
// (the advertised sale price), and the three shipping columns net out the way
// Shopee shows them (buyer's shipping − logistics partner's charge + Shopee's
// shipping subsidy).
//
// Shopee's "Total global" column is NOT the net — it is what the buyer paid,
// with commission and service fees still inside — so it is reference only.

import { round, toNumber, type BreakdownLine, type BreakdownSection } from "./breakdown";

export type { BreakdownLine, BreakdownSection };

/** Funded by the seller: each one comes off the product subtotal. */
const SELLER_DISCOUNTS: { key: string; label?: string }[] = [
  { key: "Cupom do vendedor" },
  { key: "Coin Cashback Voucher Amount Sponsored by Seller", label: "Cashback em moedas (vendedor)" },
  { key: "Desconto da Leve Mais por Menos do vendedor" },
  { key: "Compensar Moedas Shopee" },
  { key: "Ajuste por pagamento via PIX" },
  { key: "Ajuste por participação em ação comercial" },
  { key: "Total descontado Cartão de Crédito" },
];

/** Shopee's "Taxas e Encargos" block. */
const FEES: { key: string; label?: string }[] = [
  { key: "Taxa de comissão líquida" },
  { key: "Taxa de serviço líquida" },
  { key: "Taxa de Devolução Fácil Shopee" },
  { key: "Taxa de transação" },
  { key: "Taxa de Envio Reversa" },
];

/** Shown for reference only — Shopee-funded or duplicated figures. */
const REFERENCE: { key: string; label?: string; note?: string }[] = [
  { key: "Incentivo Shopee para ação comercial", note: "bancado pela Shopee" },
  { key: "Cupom", label: "Cupom Shopee", note: "bancado pela Shopee" },
  { key: "Incentivo de cupom", note: "bancado pela Shopee" },
  { key: "Desconto Shopee da Leve Mais por Menos", note: "bancado pela Shopee" },
  { key: "Taxa de Serviço Instantâneo pago pelo comprador", note: "pago pelo comprador" },
  { key: "Taxa de comissão bruta", note: "versão bruta da taxa já descontada acima" },
  { key: "Taxa de serviço bruta", note: "versão bruta da taxa já descontada acima" },
  { key: "Valor Total", label: "Valor pago pelo comprador", note: "produto + frete" },
  {
    key: "Total global",
    label: "Total global (Shopee)",
    note: "o que o comprador pagou, ainda com as taxas dentro",
  },
];

/** Nothing was charged to the buyer: cancelled or fully refunded. */
function isVoided(raw: Record<string, unknown>) {
  return toNumber(raw["Valor Total"]) === 0;
}

function productsTotal(raw: Record<string, unknown>, share = 1) {
  const salePrice = toNumber(raw["Subtotal do produto"]);
  const discounts = SELLER_DISCOUNTS.reduce((sum, d) => sum + toNumber(raw[d.key]), 0);
  return round(salePrice - discounts * share);
}

/** Buyer's shipping minus the carrier's charge plus Shopee's subsidy. */
function shippingTotal(raw: Record<string, unknown>) {
  return round(
    toNumber(raw["Taxa de envio pagas pelo comprador"]) -
      toNumber(raw["Valor estimado do frete"]) +
      toNumber(raw["Desconto de Frete Aproximado"]),
  );
}

function feesTotal(raw: Record<string, unknown>, share = 1) {
  return round(FEES.reduce((sum, f) => sum + toNumber(raw[f.key]), 0) * share);
}

/**
 * What the platform deposits. Shipping is left out on purpose: the buyer's
 * payment plus Shopee's subsidy cover the carrier's charge, so the seller
 * neither pays nor keeps anything there.
 *
 * `share` is this line's slice of its order. Shopee repeats order-level
 * amounts (coupons, fees) on every line of a multi-item order, so without it
 * those amounts would be counted once per line.
 */
export function computeShopeeNet(raw: Record<string, unknown>, share = 1): number {
  if (isVoided(raw)) return 0;
  return round(productsTotal(raw, share) - feesTotal(raw, share));
}

export function buildShopeeBreakdown(
  raw: Record<string, unknown>,
  share = 1,
): {
  sections: BreakdownSection[];
  net: number;
  voided: boolean;
  shared: boolean;
  otherFields: { label: string; value: unknown }[];
} {
  const seen = new Set<string>(["Quantidade", "Desconto do vendedor_1"]);
  const quantity = toNumber(raw["Quantidade"]) || 1;
  const shared = share !== 1;
  const sharedNote = shared ? `${Math.round(share * 100)}% do pedido` : undefined;

  const take = (key: string, label?: string, note?: string, kind: BreakdownLine["kind"] = "deduction") => {
    seen.add(key);
    return { label: label ?? key, note, value: toNumber(raw[key]), kind };
  };

  /** Order-level amount, split across the order's lines. */
  const takeShared = (key: string, label?: string) => {
    seen.add(key);
    return {
      label: label ?? key,
      note: sharedNote,
      value: round(toNumber(raw[key]) * share),
      kind: "deduction" as const,
    };
  };

  seen.add("Preço original");
  seen.add("Subtotal do produto");

  const products: BreakdownLine[] = [
    {
      label: quantity > 1 ? `Preço original (× ${quantity})` : "Preço original",
      value: round(toNumber(raw["Preço original"]) * quantity),
      kind: "item",
    },
    take("Desconto do vendedor"),
    {
      label: "Preço de venda",
      note: "valor anunciado, o que o cliente paga pelo produto",
      value: toNumber(raw["Subtotal do produto"]),
      kind: "item",
    },
    ...SELLER_DISCOUNTS.filter((d) => d.key in raw).map((d) => takeShared(d.key, d.label)),
  ];

  const shipping: BreakdownLine[] = [
    take("Taxa de envio pagas pelo comprador", "Frete pago pelo comprador", undefined, "item"),
    take("Valor estimado do frete", "Frete cobrado pelo parceiro logístico"),
    take("Desconto de Frete Aproximado", "Desconto de frete da Shopee", undefined, "item"),
  ];

  const fees: BreakdownLine[] = FEES.filter((f) => f.key in raw).map((f) =>
    takeShared(f.key, f.label),
  );

  const reference: BreakdownLine[] = REFERENCE.filter((r) => r.key in raw).map((r) =>
    take(r.key, r.label, r.note, "info"),
  );

  const freight = shippingTotal(raw);

  const sections: BreakdownSection[] = [
    {
      title: "Subtotal dos Produtos",
      note: shared ? "pedido com mais de um item — valores do pedido rateados" : undefined,
      lines: products,
      total: productsTotal(raw, share),
    },
    { title: "Taxas e Encargos", lines: fees, total: feesTotal(raw, share), subtracted: true },
    {
      title: "Frete (não entra na conta)",
      // Zero means the buyer's payment plus Shopee's subsidy covered the
      // carrier exactly; anything else is worth a second look. A voided order
      // keeps an estimated freight it never incurred, so it doesn't count.
      note:
        freight === 0 || isVoided(raw) ? undefined : "atenção: esse frete não fechou em zero",
      lines: shipping,
      total: freight,
      counted: false,
    },
  ];

  if (reference.length) {
    sections.push({
      title: "Referência (não entra na conta)",
      lines: reference,
      total: 0,
      counted: false,
    });
  }

  const otherFields = Object.entries(raw)
    .filter(([key]) => !seen.has(key))
    .map(([label, value]) => ({ label, value }));

  return {
    sections,
    net: computeShopeeNet(raw, share),
    voided: isVoided(raw),
    shared,
    otherFields,
  };
}
