"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronRight, History, Search } from "lucide-react";
import type { ProductCostChange } from "@/lib/types";
import { setProductCost } from "@/app/(dashboard)/clientes/[id]/vendas/actions";

export type ProductCostRow = {
  product_key: string;
  sku: string | null;
  product_name: string | null;
  unit_cost: number | null;
  cost_month: string | null;
  first_month: string;
  last_month: string;
  lines: number;
  units: number;
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function monthLabel(iso: string | null) {
  if (!iso) return "—";
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} de ${y}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

/** The key the history is filed under, same as the server's. */
function keyOf(sku: string | null, name: string | null) {
  return sku ? `sku:${sku}` : `nome:${name ?? ""}`;
}

const INPUT =
  "w-28 rounded-lg border border-line bg-panel-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent";

export function ProductCostsTable({
  clientId,
  products,
  changes,
  months,
}: {
  clientId: string;
  products: ProductCostRow[];
  changes: ProductCostChange[];
  /** Newest first, as order_months returns them. */
  months: string[];
}) {
  const [search, setSearch] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const historyOf = useMemo(() => {
    const map = new Map<string, ProductCostChange[]>();
    for (const change of changes) {
      const key = keyOf(change.sku, change.product_name);
      map.set(key, [...(map.get(key) ?? []), change]);
    }
    return map;
  }, [changes]);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = term
      ? products.filter(
          (p) =>
            (p.product_name ?? "").toLowerCase().includes(term) ||
            (p.sku ?? "").toLowerCase().includes(term),
        )
      : products;
    // What has no cost comes first: that is the work waiting to be done.
    return [...rows].sort((a, b) => {
      if ((a.unit_cost == null) !== (b.unit_cost == null)) return a.unit_cost == null ? -1 : 1;
      return b.lines - a.lines;
    });
  }, [products, search]);

  const missing = products.filter((p) => p.unit_cost == null).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-ink">Custo por produto</h2>
          <p className="text-xs text-ink-2">
            Mudar o custo aqui vale do mês escolhido em diante — os meses anteriores guardam o
            que o produto custava na época, e cada mudança fica no histórico.
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto ou SKU..."
            className="w-64 rounded-full border border-line bg-panel-2 py-2 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent"
          />
        </div>
      </div>

      {missing > 0 && (
        <p className="rounded-xl bg-gold/15 px-4 py-2.5 text-xs text-ink">
          <strong className="font-bold">
            {missing} produto{missing === 1 ? "" : "s"} sem custo
          </strong>{" "}
          — um custo novo pode ser preenchido aqui ou na aba Pedidos; a mudança de um já
          existente é que pede esta aba.
        </p>
      )}

      <div className="lift overflow-hidden rounded-2xl bg-panel shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel-2">
            <tr>
              <th className="w-8 px-2 py-2.5" />
              <th className="px-4 py-2.5 font-semibold text-ink">Produto</th>
              <th className="px-4 py-2.5 font-semibold text-ink">SKU</th>
              <th className="px-4 py-2.5 text-right font-semibold text-ink">Custo</th>
              <th className="px-4 py-2.5 font-semibold text-ink">Desde</th>
              <th className="px-4 py-2.5 text-right font-semibold text-ink">Pedidos</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-ink-3">
                  {products.length === 0
                    ? "Nenhum pedido importado ainda."
                    : "Nenhum produto com esse termo."}
                </td>
              </tr>
            ) : (
              shown.map((product) => (
                <ProductRow
                  key={product.product_key}
                  clientId={clientId}
                  product={product}
                  months={months}
                  history={historyOf.get(product.product_key) ?? []}
                  open={openKey === product.product_key}
                  onToggle={() =>
                    setOpenKey((k) => (k === product.product_key ? null : product.product_key))
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductRow({
  clientId,
  product,
  months,
  history,
  open,
  onToggle,
}: {
  clientId: string;
  product: ProductCostRow;
  months: string[];
  history: ProductCostChange[];
  open: boolean;
  onToggle: () => void;
}) {
  const [cost, setCost] = useState(product.unit_cost != null ? String(product.unit_cost) : "");
  const [fromMonth, setFromMonth] = useState(months[0] ?? product.last_month);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, startSaving] = useTransition();

  function save() {
    setDone(false);
    startSaving(async () => {
      const result = await setProductCost({
        clientId,
        sku: product.sku,
        productName: product.product_name,
        fromMonth,
        cost,
      });
      if ("error" in result) setError(result.error);
      else {
        setError(null);
        setDone(true);
      }
    });
  }

  return (
    <>
      <tr onClick={onToggle} className="cursor-pointer border-t border-line-soft hover:bg-panel-2/40">
        <td className="px-2 py-2.5">
          {open ? (
            <ChevronDown className="h-4 w-4 text-ink-3" />
          ) : (
            <ChevronRight className="h-4 w-4 text-ink-3" />
          )}
        </td>
        <td className="max-w-[420px] px-4 py-2.5">
          <p className="truncate text-ink" title={product.product_name ?? undefined}>
            {product.product_name ?? "—"}
          </p>
        </td>
        <td className="px-4 py-2.5 font-mono text-[11px] text-ink-3">{product.sku ?? "—"}</td>
        <td
          className={`px-4 py-2.5 text-right font-bold ${
            product.unit_cost != null ? "text-ink" : "text-ink-3"
          }`}
        >
          {product.unit_cost != null ? formatCurrency(Number(product.unit_cost)) : "sem custo"}
        </td>
        <td className="whitespace-nowrap px-4 py-2.5 text-ink-2">
          {monthLabel(product.cost_month)}
          {history.length > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-accent-ink">
              <History className="h-3 w-3" />
              {history.length}
            </span>
          )}
        </td>
        <td className="px-4 py-2.5 text-right text-ink-2">{product.lines}</td>
      </tr>

      {open && (
        <tr className="border-t border-line-soft bg-panel-2/30">
          <td />
          <td colSpan={5} className="px-4 py-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                  Novo custo por unidade
                </span>
                <input
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  className={INPUT}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                  A partir de
                </span>
                <select
                  value={fromMonth}
                  onChange={(e) => setFromMonth(e.target.value)}
                  className="rounded-lg border border-line bg-panel-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent"
                >
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {monthLabel(m)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-full bg-gold px-5 py-2 text-sm font-extrabold text-on-gold transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar mudança"}
              </button>
              {done && <span className="text-xs font-semibold text-pos">Salvo.</span>}
              {error && <span className="text-xs font-semibold text-danger">{error}</span>}
            </div>

            <p className="mt-2 text-[11px] text-ink-3">
              Vale de {monthLabel(fromMonth)} em diante. Os meses anteriores ficam como estão.
            </p>

            <div className="mt-4">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                Histórico
              </p>
              {history.length === 0 ? (
                <p className="text-xs text-ink-3">Nenhuma mudança registrada ainda.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-xs text-ink-2">
                  {history.map((change) => (
                    <li key={change.id} className="flex flex-wrap items-center gap-2">
                      <span className="text-ink-3">
                        {new Date(change.changed_at).toLocaleDateString("pt-BR")}
                      </span>
                      <span>
                        {change.previous_cost != null
                          ? formatCurrency(Number(change.previous_cost))
                          : "sem custo"}{" "}
                        → <strong className="font-bold text-ink">
                          {change.new_cost != null
                            ? formatCurrency(Number(change.new_cost))
                            : "sem custo"}
                        </strong>
                      </span>
                      <span className="text-ink-3">
                        a partir de {monthLabel(change.effective_month)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
