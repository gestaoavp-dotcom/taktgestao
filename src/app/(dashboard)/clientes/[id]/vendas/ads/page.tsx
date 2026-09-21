import { createClient } from "@/lib/supabase/server";
import type { SalesAd } from "@/lib/types";
import { distinctMarketplaces } from "@/lib/marketplaces";
import { VendasSubTabs } from "@/components/vendas-sub-tabs";
import { SalesAdsTable } from "@/components/sales-ads-table";

export default async function AdsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: accounts }, { data: ads }] = await Promise.all([
    supabase.from("client_accounts").select("marketplace").eq("client_id", id),
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
      <SalesAdsTable
        ads={ads ?? []}
        clientMarketplaces={distinctMarketplaces(accounts ?? [])}
      />
    </div>
  );
}
