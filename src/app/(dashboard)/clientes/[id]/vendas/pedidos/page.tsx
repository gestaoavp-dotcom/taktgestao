import { createClient } from "@/lib/supabase/server";
import { isTeam } from "@/lib/profile";
import type { ClientAccount, SalesOrder } from "@/lib/types";
import { ORDER_LIST_COLUMNS } from "@/lib/sales-columns";
import { ORDERS_PAGE } from "@/lib/sales-columns";
import { VendasSubTabs } from "@/components/vendas-sub-tabs";
import { SalesOrdersTable } from "@/components/sales-orders-table";

export type OrderTotals = {
  orders: number;
  lines: number;
  sold: number;
  net: number;
  cost: number;
  extra: number;
  tax: number;
  margin: number;
};

export type MissingCost = { skus: number; loose: number; lines: number };

/**
 * Filters live in the URL, so they are resolved by the database rather than by
 * the browser holding every order in memory. At roughly 2300 orders a month
 * per client, holding them all stops working inside a year.
 */
export default async function PedidosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string; canal?: string; loja?: string; custo?: string }>;
}) {
  const { id } = await params;
  const { mes, canal, loja, custo } = await searchParams;
  const supabase = await createClient();
  const team = await isTeam();

  const { data: months } = await supabase.rpc("order_months", { p_client_id: id });
  const available = (months ?? []) as { report_month: string; orders: number }[];

  // Opens on the newest month rather than on everything: "all months" is the
  // one view whose cost grows every time a report is imported.
  const month = mes === "todos" ? null : (mes ?? available[0]?.report_month ?? null);
  const marketplace = canal && canal !== "todos" ? canal : null;
  const accountId = loja && loja !== "todas" ? loja : null;
  const missingCost = custo === "falta" ? true : custo === "preenchido" ? false : null;

  const [{ data: accounts }, { data: totalsRows }, { data: pendingRows }, { data: orders }] =
    await Promise.all([
      supabase
        .from("client_accounts")
        .select("*")
        .eq("client_id", id)
        .order("store_name")
        .returns<ClientAccount[]>(),
      supabase.rpc("orders_totals", {
        p_client_id: id,
        p_month: month,
        p_marketplace: marketplace,
        p_account_id: accountId,
        p_missing_cost: missingCost,
      }),
      supabase.rpc("orders_missing_cost", { p_client_id: id, p_month: month }),
      (() => {
        let q = supabase
          .from("sales_orders")
          .select(ORDER_LIST_COLUMNS)
          .eq("client_id", id)
          .order("created_on", { ascending: false })
          .order("id")
          .range(0, ORDERS_PAGE - 1);

        if (month) q = q.eq("report_month", month);
        if (marketplace) q = q.eq("marketplace", marketplace);
        if (accountId) q = q.eq("account_id", accountId);
        if (missingCost === true) q = q.is("cost", null);
        if (missingCost === false) q = q.not("cost", "is", null);
        return q.returns<SalesOrder[]>();
      })(),
    ]);

  const totals = (totalsRows?.[0] ?? {
    orders: 0, lines: 0, sold: 0, net: 0, cost: 0, extra: 0, tax: 0, margin: 0,
  }) as OrderTotals;

  return (
    <div>
      <VendasSubTabs clientId={id} team={team} />
      <SalesOrdersTable
        clientId={id}
        orders={orders ?? []}
        totals={totals}
        missing={(pendingRows?.[0] ?? { skus: 0, loose: 0, lines: 0 }) as MissingCost}
        months={available}
        accounts={accounts ?? []}
        filters={{ month: mes ?? null, marketplace: canal ?? null, account: loja ?? null, cost: custo ?? null }}
      />
    </div>
  );
}
