import { createClient } from "@/lib/supabase/server";
import { isTeam } from "@/lib/profile";
import type { SalesAd } from "@/lib/types";
import { distinctMarketplaces } from "@/lib/marketplaces";
import { VendasSubTabs } from "@/components/vendas-sub-tabs";
import { SalesAdsTable } from "@/components/sales-ads-table";

export default async function AdsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const team = await isTeam();

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
      <VendasSubTabs clientId={id} team={team} />
      <SalesAdsTable
        ads={ads ?? []}
        clientMarketplaces={distinctMarketplaces(accounts ?? [])}
      />
    </div>
  );
}
