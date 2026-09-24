import { createClient } from "@/lib/supabase/server";
import type { SalesOrder } from "@/lib/types";
import { distinctMarketplaces } from "@/lib/marketplaces";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { ORDER_LIST_COLUMNS } from "@/lib/sales-columns";
import { orderNet, orderShares } from "@/lib/parsers/order-breakdown";
import { VendasSubTabs } from "@/components/vendas-sub-tabs";
import { SalesOrdersTable } from "@/components/sales-orders-table";

export default async function PedidosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: accounts }, orders] = await Promise.all([
    supabase.from("client_accounts").select("marketplace").eq("client_id", id),
    fetchAll<SalesOrder>((from, to) =>
      supabase
        .from("sales_orders")
        .select(ORDER_LIST_COLUMNS)
        .eq("client_id", id)
        // Dates repeat, so the id keeps the order stable between pages.
        .order("created_on", { ascending: false })
        .order("id")
        .range(from, to)
        .returns<SalesOrder[]>(),
    ),
  ]);

  // Mercado Livre states its settled figure in a column; Shopee's has to be
  // worked out from the report row. So the report row is fetched for those
  // orders alone — 46 of 5223 across every client, against a column that
  // doubles how long the whole page takes to read.
  const needsRaw = orders.filter((o) => o.marketplace !== "mercado_livre").map((o) => o.id);
  const rawById = new Map<string, Record<string, unknown>>();

  if (needsRaw.length) {
    const rows = await fetchAll<{ id: string; raw: Record<string, unknown> | null }>((from, to) =>
      supabase
        .from("sales_orders")
        .select("id, raw")
        .in("id", needsRaw)
        .order("id")
        .range(from, to)
        .returns<{ id: string; raw: Record<string, unknown> | null }[]>(),
    );
    for (const row of rows) if (row.raw) rawById.set(row.id, row.raw);
  }

  const withRaw = orders.map((o) => ({ ...o, raw: rawById.get(o.id) ?? null }));
  const shares = orderShares(withRaw);
  const nets = Object.fromEntries(
    withRaw.map((o) => [o.id, orderNet(o, shares.get(o.id) ?? 1)]),
  );

  // The table needs to know a breakdown can be opened, not to carry one.
  const slim = orders.map((o) => ({
    ...o,
    raw: null,
    hasRaw: o.marketplace === "mercado_livre" || rawById.has(o.id),
  }));

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
