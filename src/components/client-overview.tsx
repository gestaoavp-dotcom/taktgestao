import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import type { OrdersSummary } from "@/lib/orders-summary";

/**
 * What a client opens the app to see: how much was sold, how much was left,
 * and where it came from.
 *
 * Four figures and one list — no trends, no footnotes, no ad spend. The
 * agency's dashboard keeps all of that; this is the shape the client asked
 * for, and every line of it is a number rather than a sentence about one.
 */

function compact(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function Tile({
  label,
  value,
  gold = false,
  trend,
  invert = false,
}: {
  label: string;
  value: string;
  gold?: boolean;
  /** Left off where there is nothing to compare against — the client's view. */
  trend?: number;
  /** For a figure where going up is the bad direction, such as a cost. */
  invert?: boolean;
}) {
  const up = (trend ?? 0) >= 0;
  const good = invert ? !up : up;

  return (
    <div
      className={`lift flex flex-col gap-2 rounded-2xl p-4 shadow-sm sm:p-5 ${
        gold ? "border border-gold/45 bg-gold/[.07]" : "bg-panel"
      }`}
    >
      <span
        className={`text-[11px] font-bold uppercase tracking-[0.1em] ${
          gold ? "text-gold-ink" : "text-ink-3"
        }`}
      >
        {label}
      </span>
      <span className="font-display text-[22px] font-extrabold leading-none tracking-[-0.02em] text-ink sm:text-[30px]">
        {value}
      </span>
      {trend !== undefined && (
        <span
          className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-bold ${
            good ? "bg-pos/10 text-pos" : "bg-danger/10 text-danger"
          }`}
        >
          {up ? "↑" : "↓"} {Math.abs(trend).toFixed(1)}%
        </span>
      )}
    </div>
  );
}

export function MarketplaceBars({
  rows,
}: {
  rows: OrdersSummary["platformRows"];
}) {
  const biggest = rows.reduce((best, [, d]) => Math.max(best, d.revenue), 0);

  return (
    <div className="lift rounded-2xl bg-panel p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 font-bold text-ink">Vendas e lucro por marketplace</h2>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-3">Nenhum pedido nesse período.</p>
      ) : (
        <>
          <div className="flex flex-col gap-3.5">
            {rows.map(([platform, data]) => (
              <div key={platform} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-semibold text-ink">
                    {MARKETPLACE_LABEL[platform] ?? platform}
                  </span>
                  <span className="flex-none font-bold text-gold-ink">
                    {data.profit == null ? "—" : compact(data.profit)}
                  </span>
                </div>
                {/* Sized by what the channel sold, against the biggest of
                    them — the figure beside it is what it left. */}
                <div className="h-2.5 overflow-hidden rounded-full bg-panel-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${biggest > 0 ? Math.max(4, (data.revenue / biggest) * 100) : 0}%`,
                      background: "linear-gradient(90deg, var(--chart-1), var(--accent-ink))",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-ink-3">Barras: vendas no período · Valor: lucro</p>
        </>
      )}
    </div>
  );
}

export function ClientOverview({
  revenue,
  orders,
  profit,
  margin,
  platformRows,
}: Pick<OrdersSummary, "revenue" | "orders" | "profit" | "margin" | "platformRows">) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Tile label="Vendas" value={compact(revenue)} />
        <Tile label="Lucro" value={profit == null ? "—" : compact(profit)} gold />
        <Tile
          label="Margem"
          value={margin == null ? "—" : `${(margin * 100).toFixed(1).replace(".", ",")}%`}
        />
        <Tile label="Pedidos" value={orders.toLocaleString("pt-BR")} />
      </div>

      <MarketplaceBars rows={platformRows} />
    </div>
  );
}

/** The same figure the tiles show, rounded to whole reais. */
export { compact as formatTile };
