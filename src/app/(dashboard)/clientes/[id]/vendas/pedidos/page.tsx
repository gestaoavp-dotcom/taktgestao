import { createClient } from "@/lib/supabase/server";
import type { Client, SalesOrder } from "@/lib/types";
import { VendasSubTabs } from "@/components/vendas-sub-tabs";
import { SalesOrdersTable } from "@/components/sales-orders-table";

export default async function PedidosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: orders }] = await Promise.all([
    supabase
      .from("clients")
      .select("marketplaces")
      .eq("id", id)
      .maybeSingle<Pick<Client, "marketplaces">>(),
    supabase
      .from("sales_orders")
      .select("*")
      .eq("client_id", id)
      .order("created_on", { ascending: false })
      .returns<SalesOrder[]>(),
  ]);

  return (
    <div>
      <VendasSubTabs clientId={id} />
      <SalesOrdersTable
        clientId={id}
        orders={orders ?? []}
        clientMarketplaces={client?.marketplaces ?? []}
      />
    </div>
  );
}
