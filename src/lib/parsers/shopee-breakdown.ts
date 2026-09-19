// Which raw columns from the Shopee report to show in the order breakdown,
// in the sheet's own order, and how each one should read: the sale price
// anchors the waterfall, everything after it is a discount/fee (shown
// negative) unless it's one of Shopee's own running totals.

export type BreakdownLine = {
  label: string;
  note?: string;
  value: number;
  kind: "positive" | "negative" | "marker" | "total";
};

// Shopee's own wording is ambiguous in a few places; these read better in the
// breakdown and say where the number actually comes from.
const LABEL_OVERRIDES: Record<string, { label: string; note?: string }> = {
  "Preço original": { label: "Preço original (de tabela)" },
  "Preço acordado": { label: "Preço de venda", note: "valor anunciado, já com desconto aplicado" },
  "Taxa de envio pagas pelo comprador": {
    label: "Frete pago pelo comprador",
    note: "não é custo do vendedor — não entra na conta",
  },
  "Valor Total": { label: "Valor pago pelo comprador", note: "produto + frete" },
  "Total global": {
    label: "Total recebido",
    note: "valor líquido da Shopee, já descontado tudo acima",
  },
};

const POSITIVE_KEYS = ["Preço original", "Preço acordado", "Subtotal do produto"];

// Not deductions: money the buyer paid or totals Shopee itself computes.
const MARKER_KEYS = ["Taxa de envio pagas pelo comprador", "Valor Total"];

const TOTAL_KEYS = ["Total global"];

const NEGATIVE_KEYS = [
  "Desconto do vendedor",
  "Desconto do vendedor_1",
  "Incentivo Shopee para ação comercial",
  "Ajuste por participação em ação comercial",
  "Cupom do vendedor",
  "Coin Cashback Voucher Amount Sponsored by Seller",
  "Cupom",
  "Incentivo de cupom",
  "Ajuste por pagamento via PIX",
  "Desconto Shopee da Leve Mais por Menos",
  "Desconto da Leve Mais por Menos do vendedor",
  "Compensar Moedas Shopee",
  "Total descontado Cartão de Crédito",
  "Taxa de Serviço Instantâneo pago pelo comprador",
  "Desconto de Frete Aproximado",
  "Taxa de Envio Reversa",
  "Taxa de transação",
  "Taxa de comissão bruta",
  "Taxa de comissão líquida",
  "Taxa de serviço bruta",
  "Taxa de serviço líquida",
];

export const SHOPEE_BREAKDOWN_KEYS = [
  ...POSITIVE_KEYS,
  ...NEGATIVE_KEYS,
  ...MARKER_KEYS,
  ...TOTAL_KEYS,
];

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const n = parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function kindOf(key: string): BreakdownLine["kind"] {
  if (POSITIVE_KEYS.includes(key)) return "positive";
  if (MARKER_KEYS.includes(key)) return "marker";
  if (TOTAL_KEYS.includes(key)) return "total";
  return "negative";
}

export function buildShopeeBreakdown(raw: Record<string, unknown>): {
  lines: BreakdownLine[];
  otherFields: { label: string; value: unknown }[];
} {
  const lines: BreakdownLine[] = [];
  const seen = new Set<string>();

  for (const key of SHOPEE_BREAKDOWN_KEYS) {
    if (!(key in raw)) continue;
    seen.add(key);
    const override = LABEL_OVERRIDES[key];
    lines.push({
      label: override?.label ?? key.replace(/_1$/, " (2)"),
      note: override?.note,
      value: toNumber(raw[key]),
      kind: kindOf(key),
    });
  }

  const otherFields = Object.entries(raw)
    .filter(([key]) => !seen.has(key))
    .map(([label, value]) => ({ label, value }));

  return { lines, otherFields };
}
