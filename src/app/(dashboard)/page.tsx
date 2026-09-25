import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { AreaChart } from "@/components/area-chart";
import { MonthlyRevenueNote } from "@/components/monthly-revenue-note";
import { KpiCard } from "@/components/kpi-card";
import { DateRangePicker } from "@/components/date-range-picker";
import { DashboardFilters } from "@/components/dashboard-filters";
import { MarketplaceBadge } from "@/components/marketplace-badge";
import { MARKETPLACES, MARKETPLACE_LABEL, distinctMarketplaces } from "@/lib/marketplaces";
import { trendOf, formatCurrency } from "@/lib/sales-summary";
import { reportRange, todayInBrazil } from "@/lib/report-week";
import { getOrdersSummary } from "@/lib/orders-summary";


type FeeStatus = "em_dia" | "a_vencer" | "atrasada" | "sem_valor";

const FEE_LABEL: Record<FeeStatus, { label: string; className: string }> = {
  em_dia: { label: "Em dia", className: "bg-green-50 text-green-700" },
  a_vencer: { label: "A vencer", className: "bg-blue/10 text-blue" },
  atrasada: { label: "Atrasada", className: "bg-red-50 text-red-700" },
  sem_valor: { label: "Sem valor", className: "bg-brand-gray text-[#94A0BD]" },
};

// Payment day clamped to the month's last day, as in Contas a receber.
function dueDateFor(month: string, paymentDay: number) {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(Math.min(Math.max(paymentDay, 1), lastDay)).padStart(2, "0")}`;
}

function Trend({ value }: { value: number }) {
  if (!value) return <span className="text-[#94A0BD]">—</span>;
  const up = value > 0;
  return (
    <span className={up ? "text-green-700" : "text-red-700"}>
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(0)}%
    </span>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; de?: string; ate?: string; cliente?: string }>;
}) {
  // The agency's view across every client. A client login never belongs here —
  // the middleware already sends it to its own folder; this is the second lock.
  const profile = await getProfile();
  const isOwner = profile?.role === "dono";
  if (!isOwner && profile?.role !== "operador") redirect("/clientes");

  const { platform, de, ate, cliente } = await searchParams;
  const supabase = await createClient();

  const range = reportRange(de, ate);
  // Only values the pickers could have produced: an unknown marketplace, or a
  // client since deleted, would narrow everything down to zero without a word.
  const marketplace = MARKETPLACES.some((m) => m.value === platform) ? platform! : "";

  const [{ data: allClients }, { data: accounts }, { data: openChanges }, { data: openTasks }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, name, created_at")
        .order("name")
        .returns<{ id: string; name: string; created_at: string }[]>(),
      supabase
        .from("client_accounts")
        .select("client_id, marketplace")
        .returns<{ client_id: string; marketplace: string }[]>(),
      supabase
        .from("client_changes")
        .select("client_id")
        .neq("status", "concluida")
        .returns<{ client_id: string }[]>(),
      supabase
        .from("tasks")
        .select("client_id")
        .neq("status", "done")
        .not("client_id", "is", null)
        .returns<{ client_id: string }[]>(),
    ]);

  const clients = allClients ?? [];
  const clientId = clients.some((c) => c.id === cliente) ? cliente! : "";
  const marketplacesOf = (id: string) =>
    distinctMarketplaces((accounts ?? []).filter((a) => a.client_id === id));

  // The clients the filters leave: one when a client is chosen, and only those
  // that sell on the chosen marketplace when one is.
  const inView = clients.filter((c) => !clientId || c.id === clientId);

  const filters = { clientId: clientId || undefined, marketplace: marketplace || undefined };

  // One summary for the totals, one per client for the table. The client count
  // is small enough that asking per client beats a new aggregate in the
  // database; that trade flips if the agency grows past a few dozen.
  const [summary, perClient] = await Promise.all([
    getOrdersSummary(supabase, range, filters),
    Promise.all(
      inView.map(async (c) => ({
        client: c,
        summary: await getOrdersSummary(supabase, range, {
          clientId: c.id,
          marketplace: filters.marketplace,
        }),
      })),
    ),
  ]);

  // This month's fee, per client — the agency's own finances, so the admin's
  // alone.
  const feeStatus = new Map<string, FeeStatus>();
  if (isOwner) {
    const today = todayInBrazil();
    const month = today.slice(0, 7);
    const [{ data: cnpjs }, { data: payments }] = await Promise.all([
      supabase
        .from("client_cnpjs")
        .select("id, client_id, monthly_fee, payment_day")
        .returns<
          { id: string; client_id: string; monthly_fee: number | null; payment_day: number | null }[]
        >(),
      supabase
        .from("client_payments")
        .select("cnpj_id")
        .eq("reference_month", `${month}-01`)
        .returns<{ cnpj_id: string }[]>(),
    ]);
    const paid = new Set((payments ?? []).map((p) => p.cnpj_id));

    for (const c of inView) {
      const charged = (cnpjs ?? []).filter((k) => k.client_id === c.id && k.monthly_fee);
      if (!charged.length) {
        feeStatus.set(c.id, "sem_valor");
        continue;
      }
      const unpaid = charged.filter((k) => !paid.has(k.id));
      if (!unpaid.length) feeStatus.set(c.id, "em_dia");
      else if (unpaid.some((k) => k.payment_day && dueDateFor(month, k.payment_day) < today)) {
        feeStatus.set(c.id, "atrasada");
      } else feeStatus.set(c.id, "a_vencer");
    }
  }

  const countBy = (rows: { client_id: string }[] | null) => {
    const map = new Map<string, number>();
    for (const r of rows ?? []) map.set(r.client_id, (map.get(r.client_id) ?? 0) + 1);
    return map;
  };
  const changesByClient = countBy(openChanges);
  const tasksByClient = countBy(openTasks);

  // With a marketplace chosen, a client counts when it sells there — by its
  // stores or by its orders, since an order can arrive before its store is
  // registered, and the rows must still add up to the total above them.
  const rows = perClient
    .filter(
      ({ client, summary: s }) =>
        !marketplace || marketplacesOf(client.id).includes(marketplace) || s.revenue > 0 || s.orders > 0,
    )
    .map(({ client, summary: s }) => ({
      ...client,
      revenue: s.revenue,
      orders: s.orders,
      ticket: s.ticket,
      trend: trendOf(s.revenue, s.previousRevenue),
    }))
    .sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name));

  const { revenue, orders, ticket, previousRevenue, previousOrders, previousTicket, chartData } =
    summary;
  const newClients = rows.filter((c) => c.created_at.slice(0, 10) >= range.start).length;
  const selectedName = clients.find((c) => c.id === clientId)?.name;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Dashboard</h1>
          {/* What is on screen, minus the dates: those are in the picker below,
              and stating a period twice only invites the two to disagree. */}
          {(selectedName || marketplace) && (
            <p className="mt-0.5 text-sm text-[#5B647E]">
              {[selectedName, marketplace ? MARKETPLACE_LABEL[marketplace] : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
        <DashboardFilters
          clients={clients.map(({ id, name }) => ({ id, name }))}
          clientId={clientId}
          marketplace={marketplace}
        />
      </div>

      <div className="mb-6">
        <DateRangePicker start={range.start} end={range.end} />
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        <KpiCard
          label="Clientes"
          value={String(rows.length)}
          trend={newClients > 0 ? 100 : 0}
          icon="users"
        />
        <KpiCard
          label="Faturamento sob gestão"
          value={formatCurrency(revenue)}
          trend={trendOf(revenue, previousRevenue)}
          icon="wallet"
        />
        <KpiCard
          label="Pedidos gerados"
          value={String(orders)}
          trend={trendOf(orders, previousOrders)}
          icon="package"
        />
        <KpiCard
          label="Ticket médio"
          value={formatCurrency(ticket)}
          trend={trendOf(ticket, previousTicket)}
          icon="receipt"
        />
      </div>

      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-display text-base font-semibold text-navy">Faturamento por dia</h2>
        <AreaChart data={chartData} />
        <MonthlyRevenueNote value={summary.monthlyRevenue} />
      </div>

      <div className="mb-6 overflow-x-auto rounded-lg bg-white shadow-sm">
        <div className="px-5 pt-5">
          <h2 className="font-display text-base font-semibold text-navy">Por cliente</h2>
          <p className="text-xs text-[#94A0BD]">
            No período e com os filtros acima. A variação compara com o período anterior de
            mesmo tamanho.
          </p>
        </div>
        <table className="mt-3 w-full min-w-[900px] text-left text-sm">
          <thead className="bg-brand-gray">
            <tr>
              <th className="px-5 py-2.5 font-semibold text-navy">Cliente</th>
              <th className="px-5 py-2.5 font-semibold text-navy">Marketplaces</th>
              <th className="px-5 py-2.5 text-right font-semibold text-navy">Faturamento</th>
              <th className="px-5 py-2.5 text-right font-semibold text-navy">Variação</th>
              <th className="px-5 py-2.5 text-right font-semibold text-navy">Pedidos</th>
              <th className="px-5 py-2.5 text-right font-semibold text-navy">Ticket</th>
              <th className="px-5 py-2.5 text-center font-semibold text-navy">Alterações</th>
              <th className="px-5 py-2.5 text-center font-semibold text-navy">Tarefas</th>
              {isOwner && <th className="px-5 py-2.5 font-semibold text-navy">Mensalidade</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const fee = feeStatus.get(r.id);
              return (
                <tr key={r.id} className="border-t border-navy/[.06] hover:bg-brand-gray/40">
                  <td className="px-5 py-3">
                    <Link href={`/clientes/${r.id}`} className="font-semibold text-navy hover:text-blue">
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {marketplacesOf(r.id).map((m) => (
                        <MarketplaceBadge key={m} marketplace={m} />
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-navy">
                    {formatCurrency(r.revenue)}
                  </td>
                  <td className="px-5 py-3 text-right text-xs font-semibold">
                    <Trend value={r.trend} />
                  </td>
                  <td className="px-5 py-3 text-right text-[#5B647E]">{r.orders}</td>
                  <td className="px-5 py-3 text-right text-[#5B647E]">{formatCurrency(r.ticket)}</td>
                  <td className="px-5 py-3 text-center">
                    <Link
                      href={`/clientes/${r.id}/controle`}
                      className={changesByClient.get(r.id) ? "font-semibold text-navy hover:text-blue" : "text-[#94A0BD]"}
                    >
                      {changesByClient.get(r.id) ?? 0}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Link
                      href="/tarefas"
                      className={tasksByClient.get(r.id) ? "font-semibold text-navy hover:text-blue" : "text-[#94A0BD]"}
                    >
                      {tasksByClient.get(r.id) ?? 0}
                    </Link>
                  </td>
                  {isOwner && (
                    <td className="px-5 py-3">
                      {fee && (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${FEE_LABEL[fee].className}`}>
                          {FEE_LABEL[fee].label}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={isOwner ? 9 : 8} className="px-5 py-8 text-center text-[#94A0BD]">
                  Nenhum cliente com esses filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {summary.platformRows.length > 0 && (
        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          <h2 className="px-5 pt-5 font-display text-base font-semibold text-navy">
            Por marketplace
          </h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead className="bg-brand-gray">
              <tr>
                <th className="px-5 py-2.5 font-semibold text-navy">Marketplace</th>
                <th className="px-5 py-2.5 text-right font-semibold text-navy">Faturamento</th>
                <th className="px-5 py-2.5 text-right font-semibold text-navy">Pedidos</th>
                <th className="px-5 py-2.5 text-right font-semibold text-navy">% do total</th>
              </tr>
            </thead>
            <tbody>
              {summary.platformRows.map(([m, v]) => (
                <tr key={m} className="border-t border-navy/[.06]">
                  <td className="px-5 py-3">
                    <MarketplaceBadge marketplace={m} />
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-navy">
                    {formatCurrency(v.revenue)}
                  </td>
                  <td className="px-5 py-3 text-right text-[#5B647E]">{v.orders}</td>
                  <td className="px-5 py-3 text-right text-[#5B647E]">
                    {revenue > 0 ? `${((v.revenue / revenue) * 100).toFixed(1)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-[#94A0BD]">
        Faturamento a partir dos documentos de pedidos importados; cancelados e reembolsados
        ficam de fora.
      </p>
    </div>
  );
}
