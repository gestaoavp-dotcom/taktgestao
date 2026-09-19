import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Client, ClientAccount, ClientFile, ClientUpdate } from "@/lib/types";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { getSalesSummary, trendOf, formatCurrency } from "@/lib/sales-summary";
import { KpiCard } from "@/components/kpi-card";
import { ClientBillingCard } from "@/components/client-billing-card";
import { ClientAccountsCard } from "@/components/client-accounts-card";
import { ClientFilesCard } from "@/components/client-files-card";
import { ClientHistoryCard } from "@/components/client-history-card";

const DAYS = 30;

export default async function ClienteDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: accounts }, { data: updates }, { data: files }, sales] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", id).maybeSingle<Client>(),
      supabase
        .from("client_accounts")
        .select("*")
        .eq("client_id", id)
        .order("created_at")
        .returns<ClientAccount[]>(),
      supabase
        .from("client_updates")
        .select("*")
        .eq("client_id", id)
        .order("happened_on", { ascending: false })
        .returns<ClientUpdate[]>(),
      supabase
        .from("client_files")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false })
        .returns<ClientFile[]>(),
      getSalesSummary(supabase, id, DAYS),
    ]);

  if (!client) return null;

  const { currentRevenue, previousRevenue, currentOrders, previousOrders, platformRows } = sales;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-navy">Vendas (últimos 30 dias)</h2>
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
            value={formatCurrency(currentRevenue)}
            trend={trendOf(currentRevenue, previousRevenue)}
            icon="wallet"
          />
          <KpiCard
            label="Pedidos"
            value={String(currentOrders)}
            trend={trendOf(currentOrders, previousOrders)}
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
              Nenhuma venda importada para este cliente ainda.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <ClientBillingCard client={client} />
        <div className="col-span-2">
          <ClientAccountsCard clientId={id} accounts={accounts ?? []} />
        </div>

        <ClientFilesCard clientId={id} files={files ?? []} />
        <div className="col-span-2">
          <ClientHistoryCard clientId={id} updates={updates ?? []} />
        </div>
      </div>
    </div>
  );
}
