import { createClient } from "@/lib/supabase/server";
import type { ClientAccount, SalesReport } from "@/lib/types";
import { VendasSubTabs } from "@/components/vendas-sub-tabs";
import { SalesReportsCard } from "@/components/sales-reports-card";

export default async function ImportarVendasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: accounts }, { data: reports }] = await Promise.all([
    supabase
      .from("client_accounts")
      .select("*")
      .eq("client_id", id)
      .order("store_name")
      .returns<ClientAccount[]>(),
    supabase
      .from("sales_reports")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .returns<SalesReport[]>(),
  ]);

  // Counted in the database, one report at a time. Fetching the rows to count
  // them here reported 980 of 1754, because a response stops at 1000 — and a
  // number that looks plausible is worse than one that looks broken.
  const counts = await Promise.all(
    (reports ?? []).map(async (report) => {
      const table = report.kind === "produtos" ? "sales_products" : "sales_orders";
      const { count } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("sales_report_id", report.id);
      return [report.id, count ?? 0] as const;
    }),
  );

  return (
    <div>
      <VendasSubTabs clientId={id} />
      <SalesReportsCard
        clientId={id}
        accounts={accounts ?? []}
        reports={reports ?? []}
        orderCounts={Object.fromEntries(counts)}
      />
    </div>
  );
}
