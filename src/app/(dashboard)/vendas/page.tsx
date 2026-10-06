import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/types";
import { SalesImportForm } from "@/components/sales-import-form";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { deleteSalesDay } from "./actions";

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
      <h1 className="mb-6 font-display text-2xl font-bold text-ink">Vendas</h1>

      {!clients?.length ? (
        <p className="text-sm text-ink-2">
          Cadastre um cliente antes de importar vendas.
        </p>
      ) : (
        <SalesImportForm clients={clients} />
      )}

      <div className="mt-8 overflow-hidden rounded-lg bg-panel shadow-sm">
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-ink">
            Importações recentes
          </h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-panel-2">
            <tr>
              <th className="px-4 py-2 font-medium text-ink">Dia</th>
              <th className="px-4 py-2 font-medium text-ink">Cliente</th>
              <th className="px-4 py-2 font-medium text-ink">Plataforma</th>
              <th className="px-4 py-2 font-medium text-ink">Faturamento</th>
              <th className="px-4 py-2 font-medium text-ink">Pedidos</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {recent?.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-4 py-2 text-ink">{row.date}</td>
                <td className="px-4 py-2 text-ink-2">{row.clients?.name ?? "—"}</td>
                <td className="px-4 py-2 text-ink-2">
                  {MARKETPLACE_LABEL[row.platform] ?? row.platform}
                </td>
                <td className="px-4 py-2 text-ink">
                  {Number(row.revenue).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </td>
                <td className="px-4 py-2 text-ink-2">{row.orders_count}</td>
                <td className="px-4 py-2 text-right">
                  <form action={deleteSalesDay}>
                    <input type="hidden" name="id" value={row.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-danger hover:underline"
                    >
                      Excluir
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!recent?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-3">
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
