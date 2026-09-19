// Reproduces the money side of one line of Mercado Livre's "Vendas BR" report.
//
// Unlike Shopee, Mercado Livre publishes the settled figure itself, in
// "Total (BRL)" — so that column is the net, not something to re-derive. The
// breakdown exists to show where it came from.
//
// The itemised columns do not always add up to it. In the August 2026 report
// 442 of 1754 lines came up short by exactly 5% of the product revenue, all of
// them sales made between the 1st and the 7th — a deduction Mercado Livre
// applies without giving it a column. Rather than quietly absorbing the
// difference, it gets a line of its own so the breakdown always reconciles.

import {
  round,
  toNumber,
  type BreakdownLine,
  type BreakdownSection,
  type OrderBreakdown,
} from "./breakdown";

/** Money the sale brought in. */
const REVENUE: { key: string; label?: string; note?: string }[] = [
  { key: "Receita por produtos (BRL)", label: "Receita por produtos" },
  {
    key: "Receita por acréscimo no preço (pago pelo comprador)",
    label: "Acréscimo do parcelamento",
    note: "pago pelo comprador, devolvido em tarifa logo abaixo",
  },
  { key: "Receita por envio (BRL)", label: "Frete pago pelo comprador" },
  { key: "Descontos e bônus", label: "Descontos e bônus", note: "crédito do Mercado Livre" },
];

/** What Mercado Livre keeps. Stored negative in the report, shown as magnitude. */
const FEES: { key: string; label?: string; note?: string }[] = [
  { key: "Tarifa de venda e impostos (BRL)", label: "Tarifa de venda e impostos" },
  {
    key: "Taxa de parcelamento equivalente ao acréscimo",
    label: "Tarifa de parcelamento",
    note: "anula o acréscimo cobrado do comprador",
  },
  { key: "Tarifas de envio (BRL)", label: "Tarifa de envio" },
  { key: "Custo de envio por troca de produto", label: "Envio por troca de produto" },
  {
    key: "Custo de envio com base nas medidas e peso declarados",
    label: "Envio por medidas e peso declarados",
  },
  {
    key: "Custo por diferenças nas medidas e no peso do pacote",
    label: "Diferença nas medidas e no peso",
  },
  { key: "Cancelamentos e reembolsos (BRL)", label: "Cancelamentos e reembolsos" },
];

/** What Mercado Livre says it settled: its own figure, not a reconstruction. */
export function computeMercadoLivreNet(raw: Record<string, unknown>): number {
  return round(toNumber(raw["Total (BRL)"]));
}

function revenueTotal(raw: Record<string, unknown>) {
  return round(REVENUE.reduce((sum, r) => sum + toNumber(raw[r.key]), 0));
}

function feesTotal(raw: Record<string, unknown>) {
  return round(FEES.reduce((sum, f) => sum + Math.abs(toNumber(raw[f.key])), 0));
}

/**
 * Nothing was settled although the sale had revenue: cancelled or fully
 * refunded. The product went back on the shelf, so the order costs nothing.
 */
export function isMercadoLivreVoided(raw: Record<string, unknown>) {
  return computeMercadoLivreNet(raw) === 0 && toNumber(raw["Receita por produtos (BRL)"]) > 0;
}

/** A sale split across lines keeps every amount on the first one. */
export function isMercadoLivreExtraLine(raw: Record<string, unknown>) {
  return toNumber(raw["Receita por produtos (BRL)"]) === 0 && toNumber(raw["Total (BRL)"]) === 0;
}

export function buildMercadoLivreBreakdown(raw: Record<string, unknown>): OrderBreakdown {
  const seen = new Set<string>(["Total (BRL)"]);

  const take = (
    { key, label, note }: { key: string; label?: string; note?: string },
    kind: BreakdownLine["kind"],
  ): BreakdownLine => {
    seen.add(key);
    const value = toNumber(raw[key]);
    return {
      label: label ?? key,
      note,
      value: kind === "deduction" ? Math.abs(value) : value,
      kind,
    };
  };

  const revenue = REVENUE.filter((r) => r.key in raw).map((r) => take(r, "item"));
  const fees = FEES.filter((f) => f.key in raw).map((f) => take(f, "deduction"));

  const income = revenueTotal(raw);
  const charged = feesTotal(raw);
  const net = computeMercadoLivreNet(raw);
  const residual = round(income - charged - net);

  const sections: BreakdownSection[] = [
    { title: "Receita do pedido", lines: revenue, total: income },
    { title: "Tarifas do Mercado Livre", lines: fees, total: charged, subtracted: true },
  ];

  if (Math.abs(residual) >= 0.01) {
    const products = toNumber(raw["Receita por produtos (BRL)"]);
    const share = products ? Math.round((residual / products) * 1000) / 10 : 0;

    sections.push({
      title: "Não detalhado pelo Mercado Livre",
      lines: [
        {
          label: "Diferença para o total pago",
          note: share
            ? `${share.toString().replace(".", ",")}% da receita do pedido — o relatório não abre essa linha`
            : "o relatório não abre essa linha",
          value: Math.abs(residual),
          kind: residual > 0 ? "deduction" : "item",
        },
      ],
      total: Math.abs(residual),
      subtracted: residual > 0,
    });
  }

  const otherFields = Object.entries(raw)
    .filter(([key]) => !seen.has(key))
    .map(([label, value]) => ({ label, value }));

  return {
    sections,
    net,
    voided: isMercadoLivreVoided(raw),
    shared: false,
    otherFields,
  };
}
