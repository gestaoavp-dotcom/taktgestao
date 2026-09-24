import { createClient } from "@/lib/supabase/server";
import { isTeam } from "@/lib/profile";
import type { SalesTraffic } from "@/lib/types";
import { distinctMarketplaces } from "@/lib/marketplaces";
import { VendasSubTabs } from "@/components/vendas-sub-tabs";
import { SalesTrafficTable } from "@/components/sales-traffic-table";

export default async function TrafegoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const team = await isTeam();

  const [{ data: accounts }, { data: products }] = await Promise.all([
    supabase.from("client_accounts").select("marketplace").eq("client_id", id),
    supabase
      .from("sales_traffic")
      .select("*")
      .eq("client_id", id)
      .order("visitors", { ascending: false })
      .returns<SalesTraffic[]>(),
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
