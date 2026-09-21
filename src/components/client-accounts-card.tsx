"use client";

import { useActionState, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import type { ClientAccount, ClientCnpj } from "@/lib/types";
import { MARKETPLACES } from "@/lib/marketplaces";
import { MarketplaceBadge } from "@/components/marketplace-badge";
import { updateAccount } from "@/app/(dashboard)/clientes/[id]/actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

function marketplaceOrder(a: string, b: string) {
  return (
    MARKETPLACES.findIndex((m) => m.value === a) - MARKETPLACES.findIndex((m) => m.value === b)
  );
}

function RenameStoreForm({
  clientId,
  account,
  onDone,
}: {
  clientId: string;
  account: ClientAccount;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prevState: Parameters<typeof updateAccount>[0], formData: FormData) => {
      const result = await updateAccount(prevState, formData);
      if (result && "ok" in result) onDone();
      return result;
    },
    null,
  );

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-2">
      <input type="hidden" name="id" value={account.id} />
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="cnpj_id" value={account.cnpj_id ?? ""} />
      <div className="flex items-center gap-2">
        <input
          name="store_name"
          required
          defaultValue={account.store_name}
          placeholder="Nome da loja neste marketplace"
          className={INPUT_CLASS}
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Salvar"
          className="rounded p-1.5 text-green-600 hover:bg-green-50 disabled:opacity-60"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDone}
          aria-label="Cancelar"
          className="rounded p-1.5 text-[#94A0BD] hover:bg-brand-gray hover:text-navy"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {state && "error" in state && (
        <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
      )}
    </form>
  );
}

export function ClientAccountsCard({
  clientId,
  accounts,
  cnpjs,
}: {
  clientId: string;
  accounts: ClientAccount[];
  cnpjs: ClientCnpj[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const orphans = accounts.filter((a) => !a.cnpj_id);

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <h2 className="mb-1 font-bold text-navy">Contas gerenciadas</h2>
      <p className="mb-4 text-xs text-[#94A0BD]">
        {accounts.length} {accounts.length === 1 ? "conta" : "contas"} em {cnpjs.length}{" "}
        {cnpjs.length === 1 ? "CNPJ" : "CNPJs"}. As contas vêm dos marketplaces marcados no
        card Financeiro — aqui você ajusta o nome de cada loja.
      </p>

      {cnpjs.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {cnpjs.map((cnpj) => {
            const stores = accounts
              .filter((a) => a.cnpj_id === cnpj.id)
              .sort((a, b) => marketplaceOrder(a.marketplace, b.marketplace));

            return (
              <li key={cnpj.id} className="rounded-lg border border-navy/[.08] p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-navy">
                      {cnpj.label ?? "Sem nome"}
                    </p>
                    <p className="text-xs text-[#94A0BD]">{cnpj.cnpj}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {stores.map((s) => (
                      <MarketplaceBadge key={s.id} marketplace={s.marketplace} />
                    ))}
                  </div>
                </div>

                {stores.length > 0 ? (
                  <ul className="divide-y divide-navy/[.06] border-t border-navy/[.06]">
                    {stores.map((store) =>
                      editingId === store.id ? (
                        <li key={store.id} className="py-2">
                          <RenameStoreForm
                            clientId={clientId}
                            account={store}
                            onDone={() => setEditingId(null)}
                          />
                        </li>
                      ) : (
                        <li key={store.id} className="group flex items-center gap-2 py-2">
                          <MarketplaceBadge marketplace={store.marketplace} />
                          <span className="min-w-0 flex-1 truncate text-sm text-navy">
                            {store.store_name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingId(store.id)}
                            aria-label={`Renomear ${store.store_name}`}
                            className="rounded p-1.5 text-[#94A0BD] opacity-0 transition-all hover:bg-brand-gray hover:text-navy focus:opacity-100 group-hover:opacity-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </li>
                      ),
                    )}
                  </ul>
                ) : (
                  <p className="border-t border-navy/[.06] pt-2 text-xs text-[#94A0BD]">
                    Nenhum marketplace marcado para este CNPJ.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-[#94A0BD]">
          Nenhum CNPJ cadastrado. Comece pelo card Financeiro.
        </p>
      )}

      {orphans.length > 0 && (
        <div className="mt-4 border-t border-navy/[.06] pt-3">
          <p className="mb-2 text-xs font-semibold text-[#5B647E]">Contas sem CNPJ</p>
          <ul className="divide-y divide-navy/[.06]">
            {orphans.map((store) => (
              <li key={store.id} className="flex items-center gap-2 py-2">
                <MarketplaceBadge marketplace={store.marketplace} />
                <span className="min-w-0 flex-1 truncate text-sm text-navy">
                  {store.store_name}
                </span>
                <span className="text-xs text-[#94A0BD]">
                  vincule marcando o marketplace em um CNPJ
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
