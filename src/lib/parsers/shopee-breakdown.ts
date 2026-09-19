// The price → discounts → net waterfall for a Shopee order line.
//
// Verified against the seller-center export: for every row,
// "Preço original" × qtd − "Desconto do vendedor" = "Subtotal do produto"
// (the advertised sale price). Everything the seller funds after that —
// coupons and platform fees — comes off that price, and what is left is what
// Shopee actually deposits.
//
// Shopee's own "Total global" is NOT the net: it is the buyer's payment minus
// the seller coupon, with commission and service fees still inside it, so it
// is shown as reference only.

export type BreakdownLine = {
  label: string;
  note?: string;
  value: number;
  kind: "positive" | "negative" | "subtotal" | "total" | "info";
};

// Funded by the seller: each one comes off what Shopee deposits.
const SELLER_DEDUCTIONS: { key: string; label?: string }[] = [
  { key: "Cupom do vendedor" },
  { key: "Coin Cashback Voucher Amount Sponsored by Seller", label: "Cashback em moedas (vendedor)" },
  { key: "Desconto da Leve Mais por Menos do vendedor" },
  { key: "Compensar Moedas Shopee" },
  { key: "Total descontado Cartão de Crédito" },
  { key: "Ajuste por pagamento via PIX" },
  { key: "Ajuste por participação em ação comercial" },
  { key: "Taxa de transação" },
  { key: "Taxa de comissão líquida" },
  { key: "Taxa de serviço líquida" },
  { key: "Taxa de Envio Reversa" },
];

// Shown for reference, never subtracted: money the buyer paid, discounts
// Shopee itself funded, gross versions of fees, and Shopee's own totals.
const REFERENCE_FIELDS: { key: string; label?: string; note?: string }[] = [
  {
    key: "Taxa de envio pagas pelo comprador",
    label: "Frete pago pelo comprador",
    note: "não é custo do vendedor",
  },
  { key: "Taxa de Serviço Instantâneo pago pelo comprador", note: "pago pelo comprador" },
  { key: "Desconto de Frete Aproximado", note: "subsídio de frete da Shopee" },
  { key: "Incentivo Shopee para ação comercial", note: "bancado pela Shopee" },
  { key: "Cupom", label: "Cupom Shopee", note: "bancado pela Shopee" },
  { key: "Incentivo de cupom", note: "bancado pela Shopee" },
  { key: "Desconto Shopee da Leve Mais por Menos", note: "bancado pela Shopee" },
  { key: "Taxa de comissão bruta", note: "versão bruta da comissão já descontada acima" },
  { key: "Taxa de serviço bruta", note: "versão bruta da taxa de serviço já descontada acima" },
  { key: "Valor Total", label: "Valor pago pelo comprador", note: "produto + frete" },
  {
    key: "Total global",
    label: "Total global (Shopee)",
    note: "valor do pedido menos cupom, ainda com as taxas dentro",
  },
  { key: "Valor estimado do frete" },
];

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const n = parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Nothing was charged to the buyer: cancelled or fully refunded. */
function isVoided(raw: Record<string, unknown>) {
  return toNumber(raw["Valor Total"]) === 0;
}

/** What the seller is left with before their own product cost and taxes. */
export function computeShopeeNet(raw: Record<string, unknown>): number {
  if (isVoided(raw)) return 0;

  const salePrice = toNumber(raw["Subtotal do produto"]);
  const deductions = SELLER_DEDUCTIONS.reduce((sum, d) => sum + toNumber(raw[d.key]), 0);

  return Math.round((salePrice - deductions) * 100) / 100;
}

export function buildShopeeBreakdown(raw: Record<string, unknown>): {
  lines: BreakdownLine[];
  net: number;
  voided: boolean;
  otherFields: { label: string; value: unknown }[];
} {
  const lines: BreakdownLine[] = [];
  const seen = new Set<string>(["Quantidade", "Desconto do vendedor_1"]);
  const voided = isVoided(raw);
  const quantity = toNumber(raw["Quantidade"]) || 1;

  const push = (key: string, line: Omit<BreakdownLine, "value"> & { value?: number }) => {
    seen.add(key);
    lines.push({ ...line, value: line.value ?? toNumber(raw[key]) });
  };

  push("Preço original", {
    label: quantity > 1 ? `Preço original (× ${quantity})` : "Preço original",
    value: toNumber(raw["Preço original"]) * quantity,
    kind: "positive",
  });

  push("Desconto do vendedor", { label: "Desconto do vendedor", kind: "negative" });

  push("Subtotal do produto", {
    label: "Preço de venda",
    note: "o que o cliente pagou pelo produto",
    kind: "subtotal",
  });

  for (const { key, label } of SELLER_DEDUCTIONS) {
    if (!(key in raw)) continue;
    push(key, { label: label ?? key, kind: "negative" });
  }

  lines.push({
    label: "Quanto sobra",
    note: voided
      ? "pedido cancelado/reembolsado — nada foi recebido"
      : "antes do custo do produto e do imposto",
    value: computeShopeeNet(raw),
    kind: "total",
  });

  for (const { key, label, note } of REFERENCE_FIELDS) {
    if (!(key in raw)) continue;
    push(key, { label: label ?? key, note, kind: "info" });
  }

  const otherFields = Object.entries(raw)
    .filter(([key]) => !seen.has(key))
    .map(([label, value]) => ({ label, value }));

  return { lines, net: computeShopeeNet(raw), voided, otherFields };
}
