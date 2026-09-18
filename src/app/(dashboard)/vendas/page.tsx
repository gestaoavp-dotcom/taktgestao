import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/types";
import { SalesImportForm } from "@/components/sales-import-form";
import { deleteSalesDay } from "./actions";

const PLATFORM_LABEL: Record<string, string> = {
  mercado_livre: "Mercado Livre",
  shopee: "Shopee",
  amazon: "Amazon",
  shein: "Shein",
  tiktok: "TikTok",
};

type SalesRow = {
  id: string;
  date: string;
  platform: string;
  revenue: number;
  orders_count: number;
  clients: { name: string } | null;
};

export default async function VendasPage() {
  const supabase = await createClient();

  const [{ data: clients }, { data: recent }] = await Promise.all([
    supabase.from("clients").select("*").order("name").returns<Client[]>(),
    supabase
      .from("sales_daily")
      .select("id, date, platform, revenue, orders_count, clients(name)")
      .order("date", { ascending: false })
      .limit(20)
      .returns<SalesRow[]>(),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-navy">Vendas</h1>

      {!clients?.length ? (
        <p className="text-sm text-[#5B647E]">
          Cadastre um cliente antes de importar vendas.
        </p>
      ) : (
        <SalesImportForm clients={clients} />
      )}

      <div className="mt-8 overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="border-b border-navy/[.08] px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-navy">
            Importações recentes
          </h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-gray">
            <tr>
              <th className="px-4 py-2 font-medium text-navy">Dia</th>
              <th className="px-4 py-2 font-medium text-navy">Cliente</th>
              <th className="px-4 py-2 font-medium text-navy">Plataforma</th>
              <th className="px-4 py-2 font-medium text-navy">Faturamento</th>
              <th className="px-4 py-2 font-medium text-navy">Pedidos</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {recent?.map((row) => (
              <tr key={row.id} className="border-t border-navy/[.08]">
                <td className="px-4 py-2 text-navy">{row.date}</td>
                <td className="px-4 py-2 text-[#5B647E]">{row.clients?.name ?? "—"}</td>
                <td className="px-4 py-2 text-[#5B647E]">
                  {PLATFORM_LABEL[row.platform] ?? row.platform}
                </td>
                <td className="px-4 py-2 text-navy">
                  {Number(row.revenue).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </td>
                <td className="px-4 py-2 text-[#5B647E]">{row.orders_count}</td>
                <td className="px-4 py-2 text-right">
                  <form action={deleteSalesDay}>
                    <input type="hidden" name="id" value={row.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Excluir
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!recent?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[#94A0BD]">
                  Nenhuma venda importada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
