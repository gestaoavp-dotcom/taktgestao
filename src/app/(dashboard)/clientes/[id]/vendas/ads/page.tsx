import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { isTeam } from "@/lib/profile";
import type { SalesAd } from "@/lib/types";
import { distinctMarketplaces } from "@/lib/marketplaces";
import { VendasSubTabs } from "@/components/vendas-sub-tabs";
import { SalesAdsTable } from "@/components/sales-ads-table";

export default async function AdsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const team = await isTeam();

  // Every month's ads accumulate here: read in pages, past the thousand rows
  // the API returns per request.
  const [{ data: accounts }, ads] = await Promise.all([
    supabase.from("client_accounts").select("marketplace").eq("client_id", id),
    fetchAll<SalesAd>((from, to) =>
      supabase
        .from("sales_ads")
        .select("*")
        .eq("client_id", id)
        .order("expense", { ascending: false })
        .order("id")
        .range(from, to)
        .returns<SalesAd[]>(),
    ),
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
