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
      <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
        Clientes
      </h1>

      <form
        action={createClientRecord}
        className="mb-8 grid max-w-2xl grid-cols-2 gap-3 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
      >
        <input
          name="name"
          placeholder="Nome do cliente"
          required
          className="col-span-2 rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black dark:border-white/[.145] dark:text-zinc-50 dark:focus:border-white"
        />
        <input
          name="marketplace"
          placeholder="Marketplace (ex: Mercado Livre)"
          className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black dark:border-white/[.145] dark:text-zinc-50 dark:focus:border-white"
        />
        <input
          name="contact_email"
          type="email"
          placeholder="Email de contato"
          className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black dark:border-white/[.145] dark:text-zinc-50 dark:focus:border-white"
        />
        <input
          name="contact_phone"
          placeholder="Telefone"
          className="col-span-2 rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black dark:border-white/[.145] dark:text-zinc-50 dark:focus:border-white"
        />
        <button
          type="submit"
          className="col-span-2 mt-1 h-10 rounded bg-foreground text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Adicionar cliente
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-black/[.08] dark:border-white/[.145]">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/[.03] dark:bg-white/[.06]">
            <tr>
              <th className="px-4 py-2 font-medium text-black dark:text-zinc-50">Nome</th>
              <th className="px-4 py-2 font-medium text-black dark:text-zinc-50">Marketplace</th>
              <th className="px-4 py-2 font-medium text-black dark:text-zinc-50">Contato</th>
              <th className="px-4 py-2 font-medium text-black dark:text-zinc-50">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {clients?.map((client) => (
              <tr key={client.id} className="border-t border-black/[.08] dark:border-white/[.145]">
                <td className="px-4 py-2 text-black dark:text-zinc-50">{client.name}</td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                  {client.marketplace ?? "—"}
                </td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                  {client.contact_email ?? client.contact_phone ?? "—"}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      client.status === "active"
                        ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
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
                      className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                    >
                      Excluir
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!clients?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400">
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
