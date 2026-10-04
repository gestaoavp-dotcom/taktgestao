import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { isTeam } from "@/lib/profile";
import type { ProductCostChange, SalesOrder, SalesProduct } from "@/lib/types";
import { productsFromOrders } from "@/lib/products-from-orders";
import { VendasSubTabs } from "@/components/vendas-sub-tabs";
import { SalesProductsTable } from "@/components/sales-products-table";
import { loadReportPeriods, spansMonths } from "@/lib/report-periods";

/** PostgREST caps a response at 1000 rows. */
const PAGE = 1000;

async function fetchOrders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
) {
  const all: SalesOrder[] = [];

  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from("sales_orders")
      .select("*")
      .eq("client_id", clientId)
      .order("id")
      .range(from, from + PAGE - 1)
      .returns<SalesOrder[]>();

    if (!data?.length) return all;
    all.push(...data);
    if (data.length < PAGE) return all;
  }
}

export default async function ProdutosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const team = await isTeam();

  const [reported, orders, costChanges] = await Promise.all([
    fetchAll<SalesProduct>((from, to) =>
      supabase
        .from("sales_products")
        .select("*")
        .eq("client_id", id)
        .order("id")
        .range(from, to)
        .returns<SalesProduct[]>(),
    ),
    fetchOrders(supabase, id),
    fetchAll<ProductCostChange>((from, to) =>
      supabase
        .from("product_cost_changes")
        .select("*")
        .eq("client_id", id)
        .order("changed_at", { ascending: false })
        .order("id")
        .range(from, to)
        .returns<ProductCostChange[]>(),
    ),
  ]);

  // Folded here rather than in the browser: a few dozen products cross the
  // wire instead of a few thousand orders.
  const derived = productsFromOrders(orders);

  // A first import can bring several months in one product report; it is
  // listed under its own window, not under the month it starts in.
  const periods = await loadReportPeriods(
    supabase,
    (reported ?? []).map((p) => p.sales_report_id),
  );
  const withPeriods = (reported ?? []).map((p) => {
    const period = periods.get(p.sales_report_id);
    return period && spansMonths(period) ? { ...p, period } : p;
  });

  const products = [...withPeriods, ...derived].sort(
    (a, b) =>
      b.report_month.localeCompare(a.report_month) ||
      Number(b.net_revenue) - Number(a.net_revenue),
  );

  return (
    <div>
      <VendasSubTabs clientId={id} team={team} />
      <SalesProductsTable
        clientId={id}
        products={products}
        costChanges={costChanges ?? []}
      />
    </div>
  );
}
