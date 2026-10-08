import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { formatCurrency } from "@/lib/sales-summary";
import type { OrdersSummary } from "@/lib/orders-summary";

type Row = OrdersSummary["platformRows"][number];

/**
 * The period split by marketplace.
 *
 * Four or five columns do not fit a phone, and this card clipped its last one
 * rather than scrolling — the returns were simply unreachable. Below sm each
 * marketplace is a block with its figures stacked and labelled; from sm up it
 * is the table it always was.
 */
export function MarketplaceBreakdown({
  rows,
  showTicket = false,
  empty,
}: {
  rows: Row[];
  showTicket?: boolean;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-ink-3">{empty}</p>;
  }

  const ticketOf = (data: Row[1]) =>
    formatCurrency(data.orders > 0 ? data.revenue / data.orders : 0);
  const returnsOf = (data: Row[1]) =>
    data.returns.orders
      ? `${formatCurrency(data.returns.value)} (${data.returns.orders})`
      : "—";

  return (
    <>
      <div className="flex flex-col divide-y divide-line-soft sm:hidden">
        {rows.map(([platform, data]) => (
          <div key={platform} className="px-5 py-3">
            <p className="mb-2 font-bold text-ink">
              {MARKETPLACE_LABEL[platform] ?? platform}
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-ink-3">Faturamento</dt>
                <dd className="text-ink">
                  {formatCurrency(data.revenue)}
                  {data.paid != null && (
                    <div className="text-[11px] text-ink-3">pago {formatCurrency(data.paid)}</div>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-ink-3">Pedidos</dt>
                <dd className="text-ink">{data.orders.toLocaleString("pt-BR")}</dd>
              </div>
              {showTicket && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-ink-3">Ticket médio</dt>
                  <dd className="text-ink-2">{ticketOf(data)}</dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-ink-3">Devoluções</dt>
                <dd className="text-ink-2">{returnsOf(data)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel-2">
            <tr>
              <th className="px-5 py-2 font-semibold text-ink">Marketplace</th>
              <th className="px-5 py-2 font-semibold text-ink">Faturamento</th>
              <th className="px-5 py-2 font-semibold text-ink">Pedidos</th>
              {showTicket && <th className="px-5 py-2 font-semibold text-ink">Ticket médio</th>}
              <th className="px-5 py-2 font-semibold text-ink">Devoluções</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([platform, data]) => (
              <tr key={platform} className="border-t border-line-soft">
                <td className="px-5 py-2.5 text-ink">
                  {MARKETPLACE_LABEL[platform] ?? platform}
                </td>
                <td className="px-5 py-2.5 text-ink">
                  {formatCurrency(data.revenue)}
                  {data.paid != null && (
                    <div className="text-[11px] text-ink-3">pago {formatCurrency(data.paid)}</div>
                  )}
                </td>
                <td className="px-5 py-2.5 text-ink-2">{data.orders.toLocaleString("pt-BR")}</td>
                {showTicket && <td className="px-5 py-2.5 text-ink-2">{ticketOf(data)}</td>}
                <td className="px-5 py-2.5 text-ink-2">{returnsOf(data)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
