"use client";

import { useActionState, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ProductCostChange, SalesProduct } from "@/lib/types";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { MarketplaceBadge } from "@/components/marketplace-badge";
import { formatCurrency } from "@/lib/sales-summary";
import { costKey } from "@/lib/product-costs";
import {
  updateDerivedProductCost,
  updateProductCosts,
} from "@/app/(dashboard)/clientes/[id]/vendas/actions";

const CELL_INPUT_CLASS =
  "w-16 rounded border border-line bg-panel px-1.5 py-1 text-right text-xs text-ink outline-none focus:border-accent";

/**
 * Rows folded from the Pedidos tab carry no row of their own, so their cost
 * lives on the orders and is typed there.
 */
function isDerived(product: SalesProduct) {
  return product.id.startsWith("derivado:");
}

/** Per unit, so a cost can be compared with what the product brought in. */
function perUnit(value: number, units: number) {
  return units > 0 ? value / units : 0;
}

// The month's result per listing. Amazon settles this way — no orders anywhere
// in the report — so the table is a small P&L per product rather than a list of
// sales.

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** The month a row belongs to, or the whole window of a multi-month report. */
function periodKey(p: SalesProduct) {
  return p.period ? `${p.period.start}|${p.period.end}` : p.report_month;
}

function periodLabel(key: string) {
  if (!key.includes("|")) return monthLabel(key);
  const br = (iso: string) => iso.split("-").reverse().join("/");
  const [start, end] = key.split("|");
  return `${br(start)} a ${br(end)}`;
}

function monthLabel(reportMonth: string) {
  const [y, m] = reportMonth.split("-").map(Number);
  return `${MONTHS[m - 1]} de ${y}`;
}

function CostHistory({ changes }: { changes: ProductCostChange[] }) {
  if (!changes.length) return null;

  const monthLabelOf = (iso: string) => {
    const [y, m] = iso.split("-").map(Number);
    return `${MONTHS[m - 1]}/${String(y).slice(2)}`;
  };

  return (
    <div className="mt-4 border-t border-line-soft pt-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-3">
        Histórico de custo ({changes.length})
      </p>
      <ul className="flex flex-col gap-1 text-xs">
        {changes.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3">
            <span className="text-ink-2">
              {new Date(c.changed_at).toLocaleDateString("pt-BR")} · vale de{" "}
              {monthLabelOf(c.effective_month)} em diante
            </span>
            <span className="whitespace-nowrap">
              {c.previous_cost != null ? (
                <span className="text-ink-3 line-through">
                  {formatCurrency(Number(c.previous_cost))}
                </span>
              ) : (
                <span className="text-ink-3">sem custo</span>
              )}
              <span className="mx-1.5 text-ink-3">→</span>
              <span className="font-semibold text-ink">
                {c.new_cost != null ? formatCurrency(Number(c.new_cost)) : "sem custo"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProductRow({
  clientId,
  product,
  costChanges,
  cost,
  onCostChange,
  tax,
  onTaxChange,
}: {
  clientId: string;
  product: SalesProduct;
  costChanges: ProductCostChange[];
  cost: string;
  onCostChange: (value: string) => void;
  tax: string;
  onTaxChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [extra, setExtra] = useState(product.extra_costs != null ? String(product.extra_costs) : "");
  const [saveState, formAction] = useActionState(updateProductCosts, null);
  const [derivedError, setDerivedError] = useState<string | null>(null);

  // A product folded out of the orders has no row to post a form to, so the
  // cost goes back to the orders it came from.
  async function saveDerived() {
    const result = await updateDerivedProductCost({
      clientId,
      marketplace: product.marketplace,
      reportMonth: product.report_month,
      sku: product.sku,
      productName: product.product_name,
      unitCost: cost,
      tax,
    });
    setDerivedError("error" in result ? result.error : null);
  }

  const costs = Object.entries(product.costs ?? {});
  const negative = product.net_revenue < 0;

  const units = product.units_net;
  const unitCost = parseFloat(cost.replace(",", ".")) || 0;
  const extraNum = parseFloat(extra.replace(",", ".")) || 0;
  const taxNum = parseFloat(tax.replace(",", ".")) || 0;

  const costTotal = unitCost * units;
  const taxTotal = (Number(product.net_revenue) * taxNum) / 100;
  const profit = Number(product.net_revenue) - costTotal - extraNum - taxTotal;

  return (
    <>
      <tr
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer border-t border-line-soft hover:bg-panel-2/30"
      >
        <td className="px-2 py-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-ink-3" />
          ) : (
            <ChevronRight className="h-4 w-4 text-ink-3" />
          )}
        </td>
        <td className="px-2 py-2">
          <MarketplaceBadge marketplace={product.marketplace} />
        </td>
        <td className="max-w-[300px] px-4 py-2">
          <p className="truncate text-ink" title={product.product_name ?? undefined}>
            {product.product_name ?? "—"}
          </p>
          <p className="truncate font-mono text-[11px] text-ink-3">
            {product.external_id ?? product.sku ?? "—"}
            {product.external_id && product.sku && ` · ${product.sku}`}
          </p>
        </td>
        <td className="whitespace-nowrap px-4 py-2 text-center text-ink-2">
          {product.units_net}
          {product.units_refunded > 0 && (
            <span className="ml-1 text-[11px] text-danger">−{product.units_refunded}</span>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-2 text-right text-ink">
          {formatCurrency(product.net_sales)}
        </td>
        <td
          className={`whitespace-nowrap px-4 py-2 text-right font-semibold ${
            negative ? "text-danger" : "text-ink"
          }`}
        >
          {formatCurrency(product.net_revenue)}
          <span className="ml-1 text-[11px] font-normal text-ink-3">
            {formatCurrency(perUnit(Number(product.net_revenue), units))}/un
          </span>
        </td>
        <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
          {/* Silence is what "it is not saving" looks like from the outside. */}
          {(derivedError || (saveState && "error" in saveState)) && (
            <p className="mb-1 text-[11px] font-semibold text-danger">
              {derivedError ?? (saveState as { error: string }).error}
            </p>
          )}
          {isDerived(product) ? (
            <div className="flex items-center gap-1" onBlur={saveDerived}>
              <input
                name="unit_cost"
                value={cost}
                onChange={(e) => onCostChange(e.target.value)}
                placeholder="Custo/un"
                inputMode="decimal"
                title={
                  product.sku
                    ? `Custo por unidade do SKU ${product.sku} — grava nos pedidos, deste mês em diante`
                    : "Custo por unidade — grava nos pedidos deste produto, deste mês em diante"
                }
                className={CELL_INPUT_CLASS}
              />
              {/* Extras belong to one order, and a figure typed per product
                  has no one order to land on. */}
              <span
                title="Outros custos ficam por pedido — edite na aba Pedidos"
                className="w-16 rounded border border-transparent bg-panel-2/60 px-1.5 py-1 text-right text-xs text-ink-3"
              >
                {product.extra_costs ? formatCurrency(Number(product.extra_costs)) : "—"}
              </span>
              <input
                name="tax_percent"
                value={tax}
                onChange={(e) => onTaxChange(e.target.value)}
                placeholder="Imp.%"
                inputMode="decimal"
                title="Imposto do cliente — vale deste mês em diante"
                className={CELL_INPUT_CLASS}
              />
            </div>
          ) : (
          <form
            action={formAction}
            onBlur={(e) => e.currentTarget.requestSubmit()}
            className="flex items-center gap-1"
          >
            <input type="hidden" name="id" value={product.id} />
            <input type="hidden" name="client_id" value={clientId} />
            <input
              name="unit_cost"
              value={cost}
              onChange={(e) => onCostChange(e.target.value)}
              placeholder="Custo/un"
              inputMode="decimal"
              title={
                product.sku
                  ? `Custo por unidade do SKU ${product.sku} — vale para todos os meses dele`
                  : undefined
              }
              className={CELL_INPUT_CLASS}
            />
            <input
              name="extra_costs"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder="Outros"
              inputMode="decimal"
              className={CELL_INPUT_CLASS}
            />
            <input
              name="tax_percent"
              value={tax}
              onChange={(e) => onTaxChange(e.target.value)}
              placeholder="Imp.%"
              inputMode="decimal"
              className={CELL_INPUT_CLASS}
            />
          </form>
          )}
        </td>
        <td
          className={`whitespace-nowrap px-4 py-2 text-right font-bold ${
            profit >= 0 ? "text-pos" : "text-danger"
          }`}
        >
          {formatCurrency(profit)}
          <span className="ml-1 block text-[11px] font-normal text-ink-3">
            {formatCurrency(perUnit(profit, units))}/un
          </span>
        </td>
      </tr>

      {open && (
        <tr className="border-t border-line-soft bg-panel-2/20">
          <td />
          <td colSpan={7} className="px-4 py-3">
            <ul className="flex max-w-lg flex-col gap-1 text-sm">
              <li className="flex justify-between border-b border-line-soft py-1">
                <span className="text-ink-2">Vendas líquidas</span>
                <span className="text-ink">{formatCurrency(product.net_sales)}</span>
              </li>
              {costs.map(([label, value]) => (
                <li key={label} className="flex justify-between border-b border-line-soft py-1">
                  <span className="text-ink-2">{label}</span>
                  <span className={value >= 0 ? "text-danger" : "text-pos"}>
                    {value >= 0 ? "− " : "+ "}
                    {formatCurrency(Math.abs(value))}
                  </span>
                </li>
              ))}
              <li className="mt-1 flex justify-between rounded bg-panel-2 px-2 py-1.5">
                <span className="font-bold text-ink">Receita líquida da Amazon</span>
                <span className="font-bold text-ink">{formatCurrency(product.net_revenue)}</span>
              </li>
              <li className="flex justify-between border-b border-line-soft py-1">
                <span className="text-ink-2">
                  Custo do produto{units > 0 && ` (${formatCurrency(unitCost)} × ${units} un)`}
                </span>
                <span className="text-danger">− {formatCurrency(costTotal)}</span>
              </li>
              {extraNum !== 0 && (
                <li className="flex justify-between border-b border-line-soft py-1">
                  <span className="text-ink-2">Outros custos</span>
                  <span className="text-danger">− {formatCurrency(extraNum)}</span>
                </li>
              )}
              <li className="flex justify-between border-b border-line-soft py-1">
                <span className="text-ink-2">Imposto ({taxNum}%)</span>
                <span className="text-danger">− {formatCurrency(taxTotal)}</span>
              </li>
              <li
                className={`mt-1 flex justify-between rounded px-2 py-1.5 ${
                  profit >= 0 ? "bg-pos/10" : "bg-danger/10"
                }`}
              >
                <span className={`font-bold ${profit >= 0 ? "text-pos" : "text-danger"}`}>
                  Lucro
                </span>
                <span className={`font-bold ${profit >= 0 ? "text-pos" : "text-danger"}`}>
                  {formatCurrency(profit)}
                  {units > 0 && (
                    <span className="ml-1 font-normal">
                      ({formatCurrency(perUnit(profit, units))}/un)
                    </span>
                  )}
                </span>
              </li>
              <li className="flex justify-between pt-1 text-xs text-ink-3">
                <span>Total de vendas (antes de devoluções)</span>
                <span>{formatCurrency(product.gross_sales)}</span>
              </li>
            </ul>
            <CostHistory changes={costChanges} />
          </td>
        </tr>
      )}
    </>
  );
}

export function SalesProductsTable({
  clientId,
  products,
  costChanges,
}: {
  clientId: string;
  products: SalesProduct[];
  costChanges: ProductCostChange[];
}) {
  // One cost per SKU and one tax rate per client, both shared across the table
  // so typing in any row updates every row it applies to at once.
  const [costByKey, setCostByKey] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const p of products) {
      if (p.sku && p.unit_cost != null) map[p.sku] = String(p.unit_cost);
    }
    return map;
  });
  const [costById, setCostById] = useState<Record<string, string>>({});
  const [tax, setTax] = useState(() => {
    const withTax = products.find((p) => p.tax_percent != null);
    return withTax?.tax_percent != null ? String(withTax.tax_percent) : "";
  });

  const costOf = (p: SalesProduct) => {
    const key = costKey(p);
    return (key ? costByKey[key] : costById[p.id]) ?? (p.unit_cost != null ? String(p.unit_cost) : "");
  };

  const setCostOf = (p: SalesProduct, value: string) => {
    const key = costKey(p);
    if (key) setCostByKey((prev) => ({ ...prev, [key]: value }));
    else setCostById((prev) => ({ ...prev, [p.id]: value }));
  };

  const months = useMemo(
    () => [...new Set(products.map(periodKey))].sort().reverse(),
    [products],
  );
  const [month, setMonth] = useState<string>("all");
  const [marketplace, setMarketplace] = useState<string>("all");

  const marketplaces = useMemo(
    () => [...new Set(products.map((p) => p.marketplace))].sort(),
    [products],
  );

  const scoped = products.filter(
    (p) =>
      (month === "all" || periodKey(p) === month) &&
      (marketplace === "all" || p.marketplace === marketplace),
  );
  const rows = scoped.filter((p) => !p.is_total);
  const totals = scoped.filter((p) => p.is_total);

  const sumNet = rows.reduce((s, p) => s + Number(p.net_revenue), 0);
  const sumSales = rows.reduce((s, p) => s + Number(p.net_sales), 0);
  const sumUnits = rows.reduce((s, p) => s + p.units_net, 0);
  const sumProfit = rows.reduce((s, p) => {
    const unitCost = parseFloat(costOf(p).replace(",", ".")) || 0;
    const taxNum = parseFloat(tax.replace(",", ".")) || 0;
    return (
      s +
      Number(p.net_revenue) -
      unitCost * p.units_net -
      (p.extra_costs ?? 0) -
      (Number(p.net_revenue) * taxNum) / 100
    );
  }, 0);

  // Amazon bills some things to the account rather than to a listing, so its
  // own total is not the sum of the products. The gap is shown, not hidden.
  const reported = totals.reduce((s, p) => s + Number(p.net_revenue), 0);
  const unassigned = totals.length ? Math.round((reported - sumNet) * 100) / 100 : 0;

  if (!products.length) {
    return (
      <p className="lift rounded-2xl bg-panel px-5 py-10 text-center text-sm text-ink-3 shadow-sm">
        Nenhum relatório de produtos importado ainda. Envie um em &quot;Importar
        documentos&quot; escolhendo o tipo Produtos.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
        <select
          value={marketplace}
          onChange={(e) => setMarketplace(e.target.value)}
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        >
          <option value="all">Todos os marketplaces</option>
          {marketplaces.map((m) => (
            <option key={m} value={m}>
              {MARKETPLACE_LABEL[m] ?? m}
            </option>
          ))}
        </select>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        >
          <option value="all">Todos os meses</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {periodLabel(m)}
            </option>
          ))}
        </select>
        </div>

        <div className="flex items-stretch gap-2">
          <div className="rounded-lg bg-panel-2/60 px-4 py-2 text-right">
            <div className="font-display text-xl font-bold leading-none text-ink">
              {formatCurrency(sumSales)}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-2">
              vendas líquidas
            </div>
          </div>
          <div className="rounded-lg bg-panel-2/60 px-4 py-2 text-right">
            <div className="font-display text-xl font-bold leading-none text-ink">{sumUnits}</div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-2">
              unidades
            </div>
          </div>
          <div className="rounded-lg bg-panel-2/60 px-4 py-2 text-right">
            <div className="font-display text-xl font-bold leading-none text-ink">
              {formatCurrency(sumNet)}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-2">
              receita líquida
            </div>
          </div>
          <div className="rounded-lg bg-pos/10 px-5 py-2 text-right">
            <div
              className={`font-display text-2xl font-bold leading-none ${
                sumProfit >= 0 ? "text-pos" : "text-danger"
              }`}
            >
              {formatCurrency(sumProfit)}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-2">
              lucro ({rows.length} produtos)
            </div>
          </div>
        </div>
      </div>

      <div className="lift overflow-x-auto rounded-2xl bg-panel shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-panel-2">
            <tr>
              <th className="px-2 py-2" />
              <th className="px-2 py-2 font-semibold text-ink">Canal</th>
              <th className="px-4 py-2 font-semibold text-ink">Produto</th>
              <th className="px-4 py-2 text-center font-semibold text-ink">Unid.</th>
              <th className="px-4 py-2 text-right font-semibold text-ink">Vendas líquidas</th>
              <th className="px-4 py-2 text-right font-semibold text-ink">Receita líquida</th>
              <th className="px-2 py-2 font-semibold text-ink">Custo/un · Outros · Imp.%</th>
              <th className="px-4 py-2 text-right font-semibold text-ink">Lucro</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((product) => (
              <ProductRow
                key={product.id}
                clientId={clientId}
                product={product}
                costChanges={costChanges.filter((c) => product.sku && c.sku === product.sku)}
                cost={costOf(product)}
                onCostChange={(value) => setCostOf(product, value)}
                tax={tax}
                onTaxChange={setTax}
              />
            ))}
          </tbody>
        </table>
      </div>

      {unassigned !== 0 && (
        <p className="mt-3 rounded-lg bg-gold/10 px-4 py-2.5 text-xs text-ink-2">
          A {MARKETPLACE_LABEL[totals[0].marketplace] ?? totals[0].marketplace} informa{" "}
          <strong className="text-ink">{formatCurrency(reported)}</strong> de receita líquida no
          período — <strong className="text-ink">{formatCurrency(unassigned)}</strong> a mais que a
          soma dos produtos. É o que ela cobra ou credita da conta inteira, sem atribuir a nenhum
          anúncio.
        </p>
      )}
    </div>
  );
}
