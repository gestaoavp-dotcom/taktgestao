import { createClient } from "@/lib/supabase/server";
import type { Client, SalesReport } from "@/lib/types";
import { VendasSubTabs } from "@/components/vendas-sub-tabs";
import { SalesReportsCard } from "@/components/sales-reports-card";

export default async function ImportarVendasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: reports }] = await Promise.all([
    supabase
      .from("clients")
      .select("marketplaces")
      .eq("id", id)
      .maybeSingle<Pick<Client, "marketplaces">>(),
    supabase
      .from("sales_reports")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .returns<SalesReport[]>(),
  ]);

  return (
    <div>
      <VendasSubTabs clientId={id} />
      <SalesReportsCard
        clientId={id}
        clientMarketplaces={client?.marketplaces ?? []}
        reports={reports ?? []}
      />
    </div>
  );
}
