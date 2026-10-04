import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { isTeam } from "@/lib/profile";
import type { SalesTraffic } from "@/lib/types";
import { distinctMarketplaces } from "@/lib/marketplaces";
import { VendasSubTabs } from "@/components/vendas-sub-tabs";
import { SalesTrafficTable } from "@/components/sales-traffic-table";

export default async function TrafegoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const team = await isTeam();

  // Every month's products accumulate here: read in pages, past the thousand
  // rows the API returns per request.
  const [{ data: accounts }, products] = await Promise.all([
    supabase.from("client_accounts").select("marketplace").eq("client_id", id),
    fetchAll<SalesTraffic>((from, to) =>
      supabase
        .from("sales_traffic")
        .select("*")
        .eq("client_id", id)
        .order("visitors", { ascending: false })
        .order("id")
        .range(from, to)
        .returns<SalesTraffic[]>(),
    ),
  ]);

  return (
    <div>
      <VendasSubTabs clientId={id} team={team} />
      <SalesTrafficTable
        products={products ?? []}
        clientMarketplaces={distinctMarketplaces(accounts ?? [])}
      />
    </div>
  );
}
