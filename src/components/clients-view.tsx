"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Folder, Phone, Plus, Search, Trash2, X } from "lucide-react";
import { MARKETPLACES, MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { formatCnpj, formatPhone } from "@/lib/masks";
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

export function ClientsView({
  clients,
  canManage,
}: {
  clients: ClientSummary[];
  /** False for a client login: it views its own folder and changes nothing. */
  canManage: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [marketplaces, setMarketplaces] = useState<string[]>([]);

  function resetModalFields() {
    setPhone("");
    setCnpj("");
    setMarketplaces([]);
  }

  const [state, formAction, pending] = useActionState(
    async (prevState: CreateClientState, formData: FormData) => {
      const result = await createClientRecord(prevState, formData);
      if (result && "ok" in result) {
        setModalOpen(false);
        resetModalFields();
        // Mensalidade, dia de vencimento e forma de pagamento continuam em
        // Informações — só o pré-cadastro (CNPJ + lojas) mora no modal.
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

          {canManage && (
            <button
              type="button"
              onClick={() => {
                resetModalFields();
                setModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1e4ed8]"
            >
              <Plus className="h-4 w-4" />
              Adicionar cliente
            </button>
          )}
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
                  {canManage && (
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
              Este é o pré-cadastro feito por nós: CNPJ e lojas geridas já ficam
              registrados aqui. A mensalidade é definida depois, na aba Informações.
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

              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <label htmlFor="cnpj" className="text-sm font-semibold text-navy">
                    CNPJ Principal
                  </label>
                  <input
                    id="cnpj"
                    name="cnpj"
                    inputMode="numeric"
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label htmlFor="label" className="text-sm font-semibold text-navy">
                    Loja / apelido
                  </label>
                  <input
                    id="label"
                    name="label"
                    placeholder="Opcional"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <label htmlFor="monthly_fee" className="text-sm font-semibold text-navy">
                    Valor acordado (R$)
                  </label>
                  <input
                    id="monthly_fee"
                    name="monthly_fee"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label htmlFor="payment_day" className="text-sm font-semibold text-navy">
                    Vencimento acordado (dia)
                  </label>
                  <input
                    id="payment_day"
                    name="payment_day"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="10"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
              <p className="-mt-2 text-xs text-[#94A0BD]">
                Preenchido só pelo time. O cliente, quando tiver acesso, só vai
                visualizar esse valor — a edição continua sendo nossa.
              </p>

              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-navy">Marketplaces geridos</span>
                <div className="flex flex-wrap gap-1.5">
                  {MARKETPLACES.map((m) => {
                    const checked = marketplaces.includes(m.value);
                    return (
                      <label
                        key={m.value}
                        className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          checked
                            ? "border-blue bg-blue/10 text-blue"
                            : "border-navy/10 text-[#5B647E] hover:border-blue/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="marketplaces"
                          value={m.value}
                          checked={checked}
                          onChange={(e) => {
                            setMarketplaces((prev) =>
                              e.target.checked
                                ? [...prev, m.value]
                                : prev.filter((v) => v !== m.value),
                            );
                          }}
                          className="sr-only"
                        />
                        {m.label}
                      </label>
                    );
                  })}
                </div>
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
