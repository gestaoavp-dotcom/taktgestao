import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BarChart } from "@/components/bar-chart";

const PLATFORMS = [
  { value: "mercado_livre", label: "Mercado Livre" },
  { value: "shopee", label: "Shopee" },
  { value: "amazon", label: "Amazon" },
  { value: "shein", label: "Shein" },
  { value: "tiktok", label: "TikTok" },
];

const DAYS = 30;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>;
}) {
  const { platform } = await searchParams;
  const supabase = await createClient();

  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - (DAYS - 1));
  const startISO = toISODate(start);
  const todayISO = toISODate(today);

  const [{ count: clientCount }, salesQuery] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    (() => {
      let query = supabase
        .from("sales_daily")
        .select("date, revenue, orders_count, platform")
        .gte("date", startISO)
        .lte("date", todayISO);
      if (platform) query = query.eq("platform", platform);
      return query;
    })(),
  ]);

  const sales = salesQuery.data ?? [];

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.revenue), 0);
  const totalOrders = sales.reduce((sum, s) => sum + s.orders_count, 0);

  const byDate = new Map<string, number>();
  for (const s of sales) {
    byDate.set(s.date, (byDate.get(s.date) ?? 0) + Number(s.revenue));
  }

  const chartData: { date: string; value: number }[] = [];
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const iso = toISODate(d);
    chartData.push({ date: iso, value: byDate.get(iso) ?? 0 });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-navy">Dashboard</h1>
        <nav className="flex gap-1 rounded-lg bg-white p-1 shadow-sm">
          <Link
            href="/"
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              !platform ? "bg-navy text-white" : "text-[#5B647E] hover:bg-brand-gray"
            }`}
          >
            Todos
          </Link>
          {PLATFORMS.map((p) => (
            <Link
              key={p.value}
              href={`/?platform=${p.value}`}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                platform === p.value
                  ? "bg-navy text-white"
                  : "text-[#5B647E] hover:bg-brand-gray"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-sm text-[#5B647E]">Clientes</p>
          <p className="font-display text-2xl font-bold text-navy">{clientCount ?? 0}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-sm text-[#5B647E]">Faturamento sob gestão (30 dias)</p>
          <p className="font-display text-2xl font-bold text-navy">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-sm text-[#5B647E]">Pedidos gerados (30 dias)</p>
          <p className="font-display text-2xl font-bold text-navy">{totalOrders}</p>
        </div>
      </div>

      <div className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-display text-sm font-semibold text-navy">
          Faturamento por dia
        </h2>
        <BarChart data={chartData} />
      </div>
    </div>
  );
}
