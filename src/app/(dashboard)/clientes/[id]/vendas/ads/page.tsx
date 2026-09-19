import { createClient } from "@/lib/supabase/server";
import type { Client, SalesAd } from "@/lib/types";
import { VendasSubTabs } from "@/components/vendas-sub-tabs";
import { SalesAdsTable } from "@/components/sales-ads-table";

export default async function AdsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: ads }] = await Promise.all([
    supabase
      .from("clients")
      .select("marketplaces")
      .eq("id", id)
      .maybeSingle<Pick<Client, "marketplaces">>(),
    supabase
      .from("sales_ads")
      .select("*")
      .eq("client_id", id)
      .order("expense", { ascending: false })
      .returns<SalesAd[]>(),
  ]);

  return (
    <div>
      <VendasSubTabs clientId={id} />
      <SalesAdsTable ads={ads ?? []} clientMarketplaces={client?.marketplaces ?? []} />
    </div>
  );
}
