import { createClient } from "@/lib/supabase/server";
import { isTeam } from "@/lib/profile";
import type { ProductCostChange } from "@/lib/types";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { VendasSubTabs } from "@/components/vendas-sub-tabs";
import { ProductCostsTable, type ProductCostRow } from "@/components/product-costs-table";

/**
 * Where a cost is changed, as opposed to first filled in.
 *
 * Pedidos is for a sale that arrived without one. A change is a different
 * act: it applies from a month forward, the months before keep what the
 * product cost then, and it leaves a line in the history. That only happens
 * here.
 */
export default async function CustosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const team = await isTeam();

  const [{ data: rows, error }, changes, { data: months }] = await Promise.all([
    supabase.rpc("product_costs", { p_client_id: id }),
    fetchAll<ProductCostChange>((from, to) =>
      supabase
        .from("product_cost_changes")
        .select("*")
        .eq("client_id", id)
        .order("changed_at", { ascending: false })
        .order("id")
        .range(from, to)
        .returns<ProductCostChange[]>(),
    ),
    supabase.rpc("order_months", { p_client_id: id }),
  ]);

  return (
    <div>
      <VendasSubTabs clientId={id} team={team} />
      {error ? (
        <p className="lift rounded-2xl bg-panel p-5 text-sm text-danger shadow-sm">
          Falta rodar a migration 0043 no banco para esta aba funcionar.{" "}
          <span className="text-ink-3">({error.message})</span>
        </p>
      ) : (
        <ProductCostsTable
          clientId={id}
          products={(rows ?? []) as ProductCostRow[]}
          changes={changes}
          months={((months ?? []) as { report_month: string }[]).map((m) => m.report_month)}
        />
      )}
    </div>
  );
}
