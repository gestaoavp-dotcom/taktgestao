"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Folder, Phone, Plus, Search, Trash2, X } from "lucide-react";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import {
  createClientRecord,
  deleteClientRecord,
  type CreateClientState,
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

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function ClientsView({ clients }: { clients: ClientSummary[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [state, formAction, pending] = useActionState(
    async (prevState: CreateClientState, formData: FormData) => {
      const result = await createClientRecord(prevState, formData);
      if (result && "ok" in result) {
        setModalOpen(false);
        setPhone("");
        // A client is just a name at birth now — the CNPJ, its lojas and the
        // mensalidade all live in Informações, so that is where this goes next.
        router.push(`/clientes/${result.id}/informacoes`);
      }
      return result;
    },
    null,
  );

  useEffect(() => {
    if (!modalOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setModalOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

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

          <button
            type="button"
            onClick={() => {
              setPhone("");
              setModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1e4ed8]"
          >
            <Plus className="h-4 w-4" />
            Adicionar cliente
          </button>
        </div>
      </div>

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
                  <form action={deleteClientRecord} className="relative z-10">
                    <input type="hidden" name="id" value={client.id} />
                    <button
                      type="submit"
                      aria-label={`Excluir ${client.name}`}
                      className="rounded p-1.5 text-[#94A0BD] opacity-0 transition-all hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
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

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="novo-cliente-titulo"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 id="novo-cliente-titulo" className="text-lg font-bold text-navy">
                Novo cliente
              </h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setModalOpen(false)}
                className="rounded p-1 text-[#94A0BD] transition-colors hover:bg-brand-gray hover:text-navy"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-5 text-xs text-[#94A0BD]">
              CNPJ, loja, marketplaces e mensalidade são cadastrados depois, na aba
              Informações do cliente.
            </p>

            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-semibold text-navy">
                  Nome
                </label>
                <input id="name" name="name" required autoFocus className={INPUT_CLASS} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact_phone" className="text-sm font-semibold text-navy">
                  Telefone
                </label>
                <input
                  id="contact_phone"
                  name="contact_phone"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(11) 90000-0000"
                  className={INPUT_CLASS}
                />
              </div>

              {state && "error" in state && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  Não consegui salvar: {state.error}
                </p>
              )}

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-navy/10 px-4 py-2 text-sm font-semibold text-[#5B647E] transition-colors hover:bg-brand-gray"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1e4ed8] disabled:opacity-60"
                >
                  {pending ? "Salvando..." : "Salvar e continuar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
