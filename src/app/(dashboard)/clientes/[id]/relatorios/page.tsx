import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { ReportExportButton } from "@/components/report-export-button";

const PERIODS = [30, 60, 90];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatDate(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

export default async function ClienteRelatoriosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dias?: string }>;
}) {
  const { id } = await params;
  const { dias } = await searchParams;
  const days = PERIODS.includes(Number(dias)) ? Number(dias) : 30;

  const supabase = await createClient();

  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));

  const { data: sales } = await supabase
    .from("sales_daily")
    .select("date, revenue, orders_count, platform")
    .eq("client_id", id)
    .gte("date", toISODate(start))
    .lte("date", toISODate(today))
    .order("date");

  const rows = sales ?? [];
  const totalRevenue = rows.reduce((sum, s) => sum + Number(s.revenue), 0);
  const totalOrders = rows.reduce((sum, s) => sum + s.orders_count, 0);
  const ticket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const byPlatform = new Map<string, { revenue: number; orders: number }>();
  for (const s of rows) {
    const entry = byPlatform.get(s.platform) ?? { revenue: 0, orders: 0 };
    entry.revenue += Number(s.revenue);
    entry.orders += s.orders_count;
    byPlatform.set(s.platform, entry);
  }
  const platformRows = Array.from(byPlatform.entries()).sort(
    (a, b) => b[1].revenue - a[1].revenue,
  );

  const exportRows = rows.map((s) => ({
    Data: formatDate(s.date),
    Marketplace: MARKETPLACE_LABEL[s.platform] ?? s.platform,
    Faturamento: Number(s.revenue).toFixed(2).replace(".", ","),
    Pedidos: s.orders_count,
  }));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <nav className="flex gap-1 rounded-lg bg-white p-1 shadow-sm">
          {PERIODS.map((period) => (
            <Link
              key={period}
              href={`/clientes/${id}/relatorios?dias=${period}`}
              className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                days === period
                  ? "bg-navy text-white"
                  : "text-[#5B647E] hover:bg-brand-gray"
              }`}
            >
              {period} dias
            </Link>
          ))}
        </nav>

        <ReportExportButton
          rows={exportRows}
          filename={`relatorio-${days}-dias-${toISODate(today)}.csv`}
        />
      </div>

      <div className="mb-5 grid grid-cols-3 gap-5">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm text-[#5B647E]">Faturamento no período</p>
          <p className="text-2xl font-bold text-navy">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm text-[#5B647E]">Pedidos</p>
          <p className="text-2xl font-bold text-navy">{totalOrders}</p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm text-[#5B647E]">Ticket médio</p>
          <p className="text-2xl font-bold text-navy">{formatCurrency(ticket)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="border-b border-navy/[.08] px-5 py-4">
          <h2 className="font-bold text-navy">Resumo por marketplace</h2>
        </div>
        {platformRows.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-gray">
              <tr>
                <th className="px-5 py-2 font-semibold text-navy">Marketplace</th>
                <th className="px-5 py-2 font-semibold text-navy">Faturamento</th>
                <th className="px-5 py-2 font-semibold text-navy">Pedidos</th>
                <th className="px-5 py-2 font-semibold text-navy">Participação</th>
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
                  <td className="px-5 py-2.5 text-[#5B647E]">
                    {totalRevenue > 0
                      ? `${((data.revenue / totalRevenue) * 100).toFixed(1)}%`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-[#94A0BD]">
            Sem vendas importadas neste período.
          </p>
        )}
      </div>
    </div>
  );
}
