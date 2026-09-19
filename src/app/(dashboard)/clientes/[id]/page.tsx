import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Client, ClientAccount } from "@/lib/types";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { lastDays, trendOf, formatCurrency } from "@/lib/sales-summary";
import { getOrdersSummary } from "@/lib/orders-summary";
import { KpiCard } from "@/components/kpi-card";
import { ChangesActivityCard } from "@/components/changes-activity-card";
import { DateRangePicker } from "@/components/date-range-picker";

const DEFAULT_DAYS = 30;

function formatBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default async function ClienteDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  const { id } = await params;
  const { de, ate } = await searchParams;
  const supabase = await createClient();

  const fallback = lastDays(DEFAULT_DAYS);
  const range = { start: de ?? fallback.start, end: ate ?? fallback.end };

  const [{ data: client }, { data: accounts }, sales, { data: allChanges }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle<Client>(),
    supabase
      .from("client_accounts")
      .select("*")
      .eq("client_id", id)
      .order("created_at")
      .returns<ClientAccount[]>(),
    getOrdersSummary(supabase, range, { clientId: id }),
    supabase
      .from("client_changes")
      .select("changed_on, marketplace")
      .eq("client_id", id)
      .returns<{ changed_on: string; marketplace: string | null }[]>(),
  ]);

  if (!client) return null;

  const { revenue, previousRevenue, orders, previousOrders, platformRows } = sales;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-navy">
            Vendas{" "}
            <span className="font-normal text-[#5B647E]">
              ({formatBR(range.start)} a {formatBR(range.end)})
            </span>
          </h2>
          <DateRangePicker start={range.start} end={range.end} />
          <Link
            href={`/clientes/${id}/vendas`}
            className="flex items-center gap-1 text-xs font-semibold text-blue hover:underline"
          >
            Ver detalhes
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-5">
          <KpiCard
            label="Faturamento"
            value={formatCurrency(revenue)}
            trend={trendOf(revenue, previousRevenue)}
            icon="wallet"
          />
          <KpiCard
            label="Pedidos"
            value={String(orders)}
            trend={trendOf(orders, previousOrders)}
            icon="package"
          />
          <KpiCard
            label="Contas gerenciadas"
            value={String(accounts?.length ?? 0)}
            trend={0}
            icon="users"
          />
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          <div className="border-b border-navy/[.08] px-5 py-4">
            <h3 className="font-bold text-navy">Por marketplace</h3>
          </div>
          {platformRows.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-gray">
                <tr>
                  <th className="px-5 py-2 font-semibold text-navy">Marketplace</th>
                  <th className="px-5 py-2 font-semibold text-navy">Faturamento</th>
                  <th className="px-5 py-2 font-semibold text-navy">Pedidos</th>
                </tr>
              </thead>
              <tbody>
                {platformRows.map(([platform, data]) => (
                  <tr key={platform} className="border-t border-navy/[.06]">
                    <td className="px-5 py-2.5 text-navy">
                      {MARKETPLACE_LABEL[platform] ?? platform}
                    </td>
                    <td className="px-5 py-2.5 text-navy">{formatCurrency(data.revenue)}</td>
                    <td className="px-5 py-2.5 text-[#5B647E]">{data.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-[#94A0BD]">
              Nenhum pedido nesse período.
            </p>
          )}
        </div>
      </div>

      <ChangesActivityCard changes={allChanges ?? []} clientMarketplaces={client.marketplaces} />
    </div>
  );
}
