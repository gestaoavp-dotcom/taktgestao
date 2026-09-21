import { createClient } from "@/lib/supabase/server";
import type { SalesReport } from "@/lib/types";
import { distinctMarketplaces } from "@/lib/marketplaces";
import { VendasSubTabs } from "@/components/vendas-sub-tabs";
import { SalesReportsCard } from "@/components/sales-reports-card";

export default async function ImportarVendasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: accounts }, { data: reports }, { data: orderRows }] = await Promise.all([
    supabase.from("client_accounts").select("marketplace").eq("client_id", id),
    supabase
      .from("sales_reports")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .returns<SalesReport[]>(),
    supabase
      .from("sales_orders")
      .select("sales_report_id")
      .eq("client_id", id)
      .returns<{ sales_report_id: string }[]>(),
  ]);

  const orderCounts: Record<string, number> = {};
  for (const row of orderRows ?? []) {
    orderCounts[row.sales_report_id] = (orderCounts[row.sales_report_id] ?? 0) + 1;
  }

  return (
    <div>
      <VendasSubTabs clientId={id} />
      <SalesReportsCard
        clientId={id}
        clientMarketplaces={distinctMarketplaces(accounts ?? [])}
        reports={reports ?? []}
        orderCounts={orderCounts}
      />
    </div>
  );
}
