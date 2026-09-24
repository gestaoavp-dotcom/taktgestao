import { createClient } from "@/lib/supabase/server";
import type { SalesOrder } from "@/lib/types";
import { distinctMarketplaces } from "@/lib/marketplaces";
import { orderNet, orderShares } from "@/lib/parsers/order-breakdown";
import { VendasSubTabs } from "@/components/vendas-sub-tabs";
import { SalesOrdersTable } from "@/components/sales-orders-table";

/** PostgREST caps a response at 1000 rows, and a month can be busier than that. */
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
      .order("created_on", { ascending: false })
      // Dates repeat, so the id keeps the order stable between pages —
      // without it a row can be skipped or fetched twice.
      .order("id")
      .range(from, from + PAGE - 1)
      .returns<SalesOrder[]>();

    if (!data?.length) return all;
    all.push(...data);
    if (data.length < PAGE) return all;
  }
}

export default async function PedidosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: accounts }, orders] = await Promise.all([
    supabase.from("client_accounts").select("marketplace").eq("client_id", id),
    fetchOrders(supabase, id),
  ]);

  // The net needs the raw report row for Shopee, so it is worked out here and
  // the row itself is dropped. It is three quarters of what this page weighed,
  // and only one order's is ever read — when someone opens it.
  const shares = orderShares(orders);
  const nets = Object.fromEntries(
    orders.map((o) => [o.id, orderNet(o, shares.get(o.id) ?? 1)]),
  );
  const slim = orders.map(({ raw, ...rest }) => ({ ...rest, raw: null, hasRaw: raw != null }));

  return (
    <div>
      <VendasSubTabs clientId={id} />
      <SalesOrdersTable
        clientId={id}
        orders={slim}
        nets={nets}
        clientMarketplaces={distinctMarketplaces(accounts ?? [])}
      />
    </div>
  );
}
