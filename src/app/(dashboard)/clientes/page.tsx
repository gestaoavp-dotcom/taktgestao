import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/types";
import { createClientRecord, deleteClientRecord } from "./actions";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Client[]>();

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-navy">Clientes</h1>

      <form
        action={createClientRecord}
        className="mb-8 grid max-w-2xl grid-cols-2 gap-3 rounded-lg bg-white p-4 shadow-sm"
      >
        <input
          name="name"
          placeholder="Nome do cliente"
          required
          className="col-span-2 rounded border border-navy/10 bg-transparent px-3 py-2 text-sm text-navy outline-none focus:border-blue"
        />
        <input
          name="marketplace"
          placeholder="Marketplace (ex: Mercado Livre)"
          className="rounded border border-navy/10 bg-transparent px-3 py-2 text-sm text-navy outline-none focus:border-blue"
        />
        <input
          name="contact_email"
          type="email"
          placeholder="Email de contato"
          className="rounded border border-navy/10 bg-transparent px-3 py-2 text-sm text-navy outline-none focus:border-blue"
        />
        <input
          name="contact_phone"
          placeholder="Telefone"
          className="col-span-2 rounded border border-navy/10 bg-transparent px-3 py-2 text-sm text-navy outline-none focus:border-blue"
        />
        <button
          type="submit"
          className="col-span-2 mt-1 h-10 rounded bg-navy text-sm font-medium text-white transition-colors hover:bg-[#0d1a38]"
        >
          Adicionar cliente
        </button>
      </form>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-gray">
            <tr>
              <th className="px-4 py-2 font-medium text-navy">Nome</th>
              <th className="px-4 py-2 font-medium text-navy">Marketplace</th>
              <th className="px-4 py-2 font-medium text-navy">Contato</th>
              <th className="px-4 py-2 font-medium text-navy">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {clients?.map((client) => (
              <tr key={client.id} className="border-t border-navy/[.08]">
                <td className="px-4 py-2 text-navy">{client.name}</td>
                <td className="px-4 py-2 text-[#5B647E]">{client.marketplace ?? "—"}</td>
                <td className="px-4 py-2 text-[#5B647E]">
                  {client.contact_email ?? client.contact_phone ?? "—"}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      client.status === "active"
                        ? "bg-green-50 text-green-700"
                        : "bg-brand-gray text-[#5B647E]"
                    }`}
                  >
                    {client.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <form action={deleteClientRecord}>
                    <input type="hidden" name="id" value={client.id} />
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
            {!clients?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[#94A0BD]">
                  Nenhum cliente cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
