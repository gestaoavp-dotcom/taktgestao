"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Folder, Phone, Plus, Search, Trash2 } from "lucide-react";
import { NewClientDialog } from "@/components/new-client-dialog";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import {
  deleteClientRecord,
  type DeleteClientState,
} from "@/app/(dashboard)/clientes/actions";

export type ClientSummary = {
  id: string;
  name: string;
  contactPhone: string | null;
  cnpjCount: number;
  storeCount: number;
  marketplaces: string[];
  searchText: string;
};

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

export function ClientsView({
  notice,
  clients,
  canManage,
  canDelete,
  hasDeletePin,
}: {
  /** Shown between the header and the folders — the admin's pending accesses. */
  notice?: React.ReactNode;
  clients: ClientSummary[];
  /** False for a client login: it views its own folder and changes nothing. */
  canManage: boolean;
  /** Deleting is the admin's alone, and takes its PIN. */
  canDelete: boolean;
  /** False until the admin's first deletion, which creates the PIN. */
  hasDeletePin: boolean;
}) {
  const [deleteTarget, setDeleteTarget] = useState<ClientSummary | null>(null);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const term = query.trim().toLowerCase();
  const visible = term ? clients.filter((client) => client.searchText.includes(term)) : clients;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-navy">Clientes</h1>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A0BD]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cliente, CNPJ, loja..."
              aria-label="Buscar cliente"
              className={`${INPUT_CLASS} pl-9`}
            />
          </div>

          {canManage && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1e4ed8]"
            >
              <Plus className="h-4 w-4" />
              Adicionar cliente
            </button>
          )}
        </div>
      </div>

      {notice}

      {visible.length > 0 ? (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((client) => (
            <div key={client.id} className="group">
              <div className="h-3 w-24 rounded-t-lg bg-blue/20" />
              <div className="relative rounded-lg rounded-tl-none bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <Link
                  href={`/clientes/${client.id}`}
                  aria-label={`Abrir ${client.name}`}
                  className="absolute inset-0 rounded-lg rounded-tl-none"
                />
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue/10">
                    <Folder className="h-5 w-5 text-blue" />
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(client)}
                      aria-label={`Excluir ${client.name}`}
                      className="relative z-10 rounded p-1.5 text-[#94A0BD] opacity-0 transition-all hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <h2 className="truncate font-bold text-navy" title={client.name}>
                  {client.name}
                </h2>

                {client.cnpjCount > 0 ? (
                  <p className="mt-0.5 text-sm text-[#5B647E]">
                    {client.storeCount} {client.storeCount === 1 ? "loja" : "lojas"} em{" "}
                    {client.cnpjCount} {client.cnpjCount === 1 ? "CNPJ" : "CNPJs"}
                  </p>
                ) : (
                  <p className="mt-0.5 text-sm text-[#94A0BD]">Nenhum CNPJ cadastrado</p>
                )}

                {client.marketplaces.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {client.marketplaces.map((m) => (
                      <span
                        key={m}
                        className="rounded-full bg-blue/10 px-2 py-0.5 text-[11px] font-semibold text-blue"
                      >
                        {MARKETPLACE_LABEL[m] ?? m}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 border-t border-navy/[.06] pt-3 text-xs text-[#5B647E]">
                  {client.contactPhone ? (
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 flex-shrink-0 text-[#94A0BD]" />
                      {client.contactPhone}
                    </p>
                  ) : (
                    <p className="text-[#94A0BD]">Sem telefone cadastrado</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-white py-16 text-center shadow-sm">
          <Folder className="mx-auto h-10 w-10 text-[#94A0BD]" />
          <p className="mt-3 text-sm text-[#5B647E]">
            {term
              ? `Nenhum cliente encontrado para "${query}".`
              : "Nenhum cliente cadastrado ainda."}
          </p>
        </div>
      )}

      {modalOpen && <NewClientDialog onClose={() => setModalOpen(false)} />}

      {deleteTarget && (
        <DeleteClientModal
          key={deleteTarget.id}
          client={deleteTarget}
          hasPin={hasDeletePin}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

const PIN_INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-center text-lg tracking-[0.5em] text-navy outline-none focus:border-blue";

function DeleteClientModal({
  client,
  hasPin,
  onClose,
}: {
  client: ClientSummary;
  hasPin: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: DeleteClientState, formData: FormData) => {
      const result = await deleteClientRecord(prev, formData);
      if (result && "ok" in result) onClose();
      return result;
    },
    null,
  );

  const pinProps = {
    type: "password",
    inputMode: "numeric" as const,
    pattern: "[0-9]{4}",
    maxLength: 4,
    required: true,
    autoComplete: "off",
    className: PIN_INPUT_CLASS,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="excluir-cliente-titulo"
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id="excluir-cliente-titulo" className="text-lg font-bold text-navy">
          Excluir {client.name}?
        </h2>
        <p className="mt-2 text-sm text-[#5B647E]">
          A pasta, todos os dados e o login do cliente serão apagados de vez. Não dá para
          desfazer.
        </p>

        <form action={formAction} className="mt-5 flex flex-col gap-3">
          <input type="hidden" name="id" value={client.id} />

          {hasPin ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-navy">Seu PIN de exclusão</span>
              <input name="pin" autoFocus {...pinProps} />
            </label>
          ) : (
            <>
              <p className="rounded-lg bg-blue/10 px-3 py-2.5 text-xs text-navy">
                Primeira exclusão: crie agora o seu PIN de 4 números. Ele será pedido em toda
                exclusão de cliente daqui para a frente.
              </p>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-navy">Novo PIN</span>
                <input name="pin" autoFocus {...pinProps} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-navy">Repita o PIN</span>
                <input name="pin_confirm" {...pinProps} />
              </label>
            </>
          )}

          {state && "error" in state && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-navy/10 px-4 py-2 text-sm font-semibold text-[#5B647E] transition-colors hover:bg-brand-gray"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {pending ? "Excluindo..." : "Excluir de vez"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
