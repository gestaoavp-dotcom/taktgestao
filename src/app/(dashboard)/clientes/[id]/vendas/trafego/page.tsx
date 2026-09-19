import { createClient } from "@/lib/supabase/server";
import type { Client, SalesTraffic } from "@/lib/types";
import { VendasSubTabs } from "@/components/vendas-sub-tabs";
import { SalesTrafficTable } from "@/components/sales-traffic-table";

export default async function TrafegoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: products }] = await Promise.all([
    supabase
      .from("clients")
      .select("marketplaces")
      .eq("id", id)
      .maybeSingle<Pick<Client, "marketplaces">>(),
    supabase
      .from("sales_traffic")
      .select("*")
      .eq("client_id", id)
      .order("visitors", { ascending: false })
      .returns<SalesTraffic[]>(),
  ]);

  return (
    <div>
      <VendasSubTabs clientId={id} />
      <SalesTrafficTable products={products ?? []} clientMarketplaces={client?.marketplaces ?? []} />
    </div>
  );
}
