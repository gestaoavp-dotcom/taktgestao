import { KpiCard } from "@/components/kpi-card";
import { trendOf, formatCurrency } from "@/lib/sales-summary";
import type { OrdersSummary } from "@/lib/orders-summary";

/**
 * What the period actually left: the ads it cost, the profit after them and
 * that profit over the revenue.
 *
 * One component for all three dashboards, because the three figures only mean
 * anything together — a profit shown without the ad spend it already carries
 * invites the reader to subtract it twice.
 */

function percent(value: number | null) {
  return value == null ? "—" : `${(value * 100).toFixed(1).replace(".", ",")}%`;
}

type Figures = Pick<
  OrdersSummary,
  "adSpend" | "previousAdSpend" | "profit" | "previousProfit" | "margin" | "previousMargin"
>;

export function ResultKpis({ summary }: { summary: Figures }) {
  const { adSpend, previousAdSpend, profit, previousProfit, margin, previousMargin } = summary;

  return (
    <>
      <KpiCard
        label="Gasto com Ads"
        value={formatCurrency(adSpend)}
        trend={trendOf(adSpend, previousAdSpend)}
        icon="megaphone"
        invert
      />
      <KpiCard
        label="Lucro"
        value={profit == null ? "—" : formatCurrency(profit)}
        trend={
          profit != null && previousProfit != null ? trendOf(profit, previousProfit) : undefined
        }
        icon="profit"
        // The one line left on these tiles: without it a dash has nothing
        // saying why it is a dash.
        note={profit == null ? "Falta rodar a migration 0042 no banco." : undefined}
      />
      <KpiCard
        label="Margem"
        value={percent(margin)}
        icon="percent"
        sub={previousMargin != null ? `Antes: ${percent(previousMargin)}` : undefined}
      />
    </>
  );
}
