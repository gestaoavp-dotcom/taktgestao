import { createClient } from "@/lib/supabase/server";
import type { SalesProduct } from "@/lib/types";
import { VendasSubTabs } from "@/components/vendas-sub-tabs";
import { SalesProductsTable } from "@/components/sales-products-table";

export default async function ProdutosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("sales_products")
    .select("*")
    .eq("client_id", id)
    .order("report_month", { ascending: false })
    .order("net_revenue", { ascending: false })
    .returns<SalesProduct[]>();

  return (
    <div>
      <VendasSubTabs clientId={id} />
      <SalesProductsTable products={products ?? []} />
    </div>
  );
}
