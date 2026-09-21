"use client";

import { useActionState, useRef, useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import type { ClientAccount, ClientCnpj } from "@/lib/types";
import { MARKETPLACES } from "@/lib/marketplaces";
import { MarketplaceBadge } from "@/components/marketplace-badge";
import { addAccount, deleteAccount, updateAccount } from "@/app/(dashboard)/clientes/[id]/actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

function cnpjLabel(cnpj: ClientCnpj) {
  return cnpj.label ? `${cnpj.label} · ${cnpj.cnpj}` : cnpj.cnpj;
}

function CnpjSelect({
  cnpjs,
  defaultValue,
}: {
  cnpjs: ClientCnpj[];
  defaultValue?: string | null;
}) {
  return (
    <select name="cnpj_id" defaultValue={defaultValue ?? ""} className={INPUT_CLASS}>
      <option value="">Sem CNPJ</option>
      {cnpjs.map((cnpj) => (
        <option key={cnpj.id} value={cnpj.id}>
          {cnpjLabel(cnpj)}
        </option>
      ))}
    </select>
  );
}

function EditAccountForm({
  clientId,
  account,
  cnpjs,
  onDone,
}: {
  clientId: string;
  account: ClientAccount;
  cnpjs: ClientCnpj[];
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
    <form action={formAction} className="flex flex-1 flex-col gap-2 py-1">
      <input type="hidden" name="id" value={account.id} />
      <input type="hidden" name="client_id" value={clientId} />
      <div className="flex items-center gap-2">
        <input
          name="store_name"
          required
          defaultValue={account.store_name}
          placeholder="Nome da loja"
          className={INPUT_CLASS}
        />
        <CnpjSelect cnpjs={cnpjs} defaultValue={account.cnpj_id} />
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
  const formRef = useRef<HTMLFormElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const cnpjById = new Map(cnpjs.map((c) => [c.id, c]));

  // One line per CNPJ: the same company often sells on several marketplaces
  // with more than one store, and what matters here is where each CNPJ
  // operates. Stores with no CNPJ yet are listed on their own.
  const groups = Array.from(
    accounts.reduce((map, account) => {
      const key = account.cnpj_id ?? `loja:${account.store_name}`;
      const entry = map.get(key) ?? {
        key,
        cnpj: account.cnpj_id ? (cnpjById.get(account.cnpj_id) ?? null) : null,
        stores: [] as string[],
        marketplaces: [] as string[],
      };
      if (!entry.stores.includes(account.store_name)) entry.stores.push(account.store_name);
      if (!entry.marketplaces.includes(account.marketplace)) {
        entry.marketplaces.push(account.marketplace);
      }
      return map.set(key, entry);
    }, new Map<string, { key: string; cnpj: ClientCnpj | null; stores: string[]; marketplaces: string[] }>()),
  ).map(([, group]) => ({
    ...group,
    marketplaces: group.marketplaces.sort(
      (a, b) =>
        MARKETPLACES.findIndex((m) => m.value === a) - MARKETPLACES.findIndex((m) => m.value === b),
    ),
  }));

  const [state, formAction, pending] = useActionState(
    async (prevState: Parameters<typeof addAccount>[0], formData: FormData) => {
      const result = await addAccount(prevState, formData);
      if (result && "ok" in result) formRef.current?.reset();
      return result;
    },
    null,
  );

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <h2 className="mb-1 font-bold text-navy">Contas gerenciadas</h2>
      <p className="mb-4 text-xs text-[#94A0BD]">
        {accounts.length} {accounts.length === 1 ? "conta" : "contas"} em {groups.length}{" "}
        {groups.length === 1 ? "CNPJ" : "CNPJs"}
      </p>

      {groups.length > 0 && (
        <ul className="mb-5 flex flex-col gap-2">
          {groups.map((group) => (
            <li key={group.key} className="rounded-lg border border-navy/[.08] px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-navy">{group.stores.join(" · ")}</p>
                  <p className="text-xs text-[#94A0BD]">
                    {group.cnpj ? cnpjLabel(group.cnpj) : "Sem CNPJ cadastrado"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.marketplaces.map((m) => (
                    <MarketplaceBadge key={m} marketplace={m} />
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {accounts.length > 0 && (
        <ul className="mb-5 divide-y divide-navy/[.06] border-t border-navy/[.06] pt-1">
          {accounts.map((account) =>
            editingId === account.id ? (
              <li key={account.id} className="flex items-center gap-3">
                <EditAccountForm
                  clientId={clientId}
                  account={account}
                  cnpjs={cnpjs}
                  onDone={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li key={account.id} className="group flex items-center gap-3 py-2.5">
                <MarketplaceBadge marketplace={account.marketplace} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy">{account.store_name}</p>
                  <p className="text-xs text-[#94A0BD]">
                    {account.cnpj_id
                      ? (cnpjById.get(account.cnpj_id)?.cnpj ?? "CNPJ removido")
                      : "Sem CNPJ"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingId(account.id)}
                  aria-label={`Editar ${account.store_name}`}
                  className="rounded p-1.5 text-[#94A0BD] opacity-0 transition-all hover:bg-brand-gray hover:text-navy focus:opacity-100 group-hover:opacity-100"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <form action={deleteAccount}>
                  <input type="hidden" name="id" value={account.id} />
                  <input type="hidden" name="client_id" value={clientId} />
                  <button
                    type="submit"
                    aria-label={`Remover ${account.store_name}`}
                    className="rounded p-1.5 text-[#94A0BD] opacity-0 transition-all hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </li>
            ),
          )}
        </ul>
      )}

      <form ref={formRef} action={formAction} className="grid grid-cols-3 gap-2">
        <input type="hidden" name="client_id" value={clientId} />
        <select name="marketplace" required defaultValue="" className={INPUT_CLASS}>
          <option value="" disabled>
            Marketplace
          </option>
          {MARKETPLACES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <input name="store_name" required placeholder="Nome da loja" className={INPUT_CLASS} />
        <CnpjSelect cnpjs={cnpjs} />

        {!cnpjs.length && (
          <p className="col-span-3 text-xs text-[#94A0BD]">
            Cadastre um CNPJ no card Financeiro para poder vincular a loja a ele.
          </p>
        )}

        {state && "error" in state && (
          <p className="col-span-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="col-span-3 flex items-center justify-center gap-2 rounded-lg border border-navy/10 py-2 text-sm font-semibold text-navy transition-colors hover:bg-brand-gray disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {pending ? "Adicionando..." : "Adicionar loja"}
        </button>
      </form>
    </section>
  );
}
