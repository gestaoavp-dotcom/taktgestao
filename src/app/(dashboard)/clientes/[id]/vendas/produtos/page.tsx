import { createClient } from "@/lib/supabase/server";
import type { SalesOrder, SalesProduct } from "@/lib/types";
import { productsFromOrders } from "@/lib/products-from-orders";
import { VendasSubTabs } from "@/components/vendas-sub-tabs";
import { SalesProductsTable } from "@/components/sales-products-table";

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

  const [{ data: reported }, orders] = await Promise.all([
    supabase
      .from("sales_products")
      .select("*")
      .eq("client_id", id)
      .returns<SalesProduct[]>(),
    fetchOrders(supabase, id),
  ]);

  // Folded here rather than in the browser: a few dozen products cross the
  // wire instead of a few thousand orders.
  const derived = productsFromOrders(orders);

  const products = [...(reported ?? []), ...derived].sort(
    (a, b) =>
      b.report_month.localeCompare(a.report_month) ||
      Number(b.net_revenue) - Number(a.net_revenue),
  );

  return (
    <div>
      <VendasSubTabs clientId={id} />
      <SalesProductsTable clientId={id} products={products} />
    </div>
  );
}
