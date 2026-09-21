"use client";

import { useActionState, useRef, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import type { ClientAccount, ClientCnpj } from "@/lib/types";
import { MARKETPLACES } from "@/lib/marketplaces";
import { MarketplaceBadge } from "@/components/marketplace-badge";
import { addAccount, deleteAccount, updateAccount } from "@/app/(dashboard)/clientes/[id]/actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

const CNPJ_LIST_ID = "cnpjs-do-cliente";

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/** Typed freely so a new CNPJ can be entered, with the known ones as suggestions. */
function CnpjField({ defaultValue }: { defaultValue?: string }) {
  return (
    <input
      name="cnpj"
      list={CNPJ_LIST_ID}
      inputMode="numeric"
      defaultValue={defaultValue ?? ""}
      placeholder="CNPJ"
      onChange={(e) => {
        e.target.value = formatCnpj(e.target.value);
      }}
      className={INPUT_CLASS}
    />
  );
}

function EditAccountForm({
  clientId,
  account,
  cnpjNumber,
  onDone,
}: {
  clientId: string;
  account: ClientAccount;
  cnpjNumber?: string;
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
        <CnpjField defaultValue={cnpjNumber} />
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
  const linkedCnpjs = new Set(
    accounts.map((a) => a.cnpj_id).filter((id): id is string => !!id),
  );

  const sorted = [...accounts].sort(
    (a, b) =>
      MARKETPLACES.findIndex((m) => m.value === a.marketplace) -
        MARKETPLACES.findIndex((m) => m.value === b.marketplace) ||
      a.store_name.localeCompare(b.store_name),
  );

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
        {accounts.length} {accounts.length === 1 ? "conta" : "contas"} em {linkedCnpjs.size}{" "}
        {linkedCnpjs.size === 1 ? "CNPJ" : "CNPJs"}. Lojas podem compartilhar o mesmo CNPJ —
        digite o mesmo número para vinculá-las.
      </p>

      <datalist id={CNPJ_LIST_ID}>
        {cnpjs.map((cnpj) => (
          <option key={cnpj.id} value={cnpj.cnpj}>
            {cnpj.label ?? cnpj.cnpj}
          </option>
        ))}
      </datalist>

      {sorted.length > 0 && (
        <ul className="mb-4 divide-y divide-navy/[.06] border-t border-navy/[.06]">
          {sorted.map((account) =>
            editingId === account.id ? (
              <li key={account.id} className="flex items-center gap-3">
                <EditAccountForm
                  clientId={clientId}
                  account={account}
                  cnpjNumber={
                    account.cnpj_id ? cnpjById.get(account.cnpj_id)?.cnpj : undefined
                  }
                  onDone={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li key={account.id} className="group flex items-center gap-3 py-2.5">
                <MarketplaceBadge marketplace={account.marketplace} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy">
                    {account.store_name}
                  </p>
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
        <CnpjField />

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
