"use client";

import { useActionState, useRef, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import type { ClientAccount, ClientCnpj } from "@/lib/types";
import { MARKETPLACES } from "@/lib/marketplaces";
import { MarketplaceBadge } from "@/components/marketplace-badge";
import { formatCnpj } from "@/lib/masks";
import { addAccount, deleteAccount, updateAccount } from "@/app/(dashboard)/clientes/[id]/actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent";

const CNPJ_LIST_ID = "cnpjs-do-cliente";

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
          className="rounded p-1.5 text-pos hover:bg-pos/10 disabled:opacity-60"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDone}
          aria-label="Cancelar"
          className="rounded p-1.5 text-ink-3 hover:bg-panel-2 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {state && "error" in state && (
        <p className="rounded bg-danger/10 px-3 py-2 text-xs text-danger">{state.error}</p>
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
    <section className="lift rounded-2xl bg-panel p-5 shadow-sm">
      <h2 className="mb-1 font-bold text-ink">Contas gerenciadas</h2>
      <p className="mb-4 text-xs text-ink-3">
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
        <ul className="mb-4 divide-y divide-navy/[.06] border-t border-line-soft">
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
                  <p className="truncate text-sm font-semibold text-ink">
                    {account.store_name}
                  </p>
                  <p className="text-xs text-ink-3">
                    {account.cnpj_id
                      ? (cnpjById.get(account.cnpj_id)?.cnpj ?? "CNPJ removido")
                      : "Sem CNPJ"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingId(account.id)}
                  aria-label={`Editar ${account.store_name}`}
                  className="rounded p-1.5 text-ink-3 opacity-0 transition-all hover:bg-panel-2 hover:text-ink focus:opacity-100 group-hover:opacity-100"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <form action={deleteAccount}>
                  <input type="hidden" name="id" value={account.id} />
                  <input type="hidden" name="client_id" value={clientId} />
                  <button
                    type="submit"
                    aria-label={`Remover ${account.store_name}`}
                    className="rounded p-1.5 text-ink-3 opacity-0 transition-all hover:bg-danger/10 hover:text-danger focus:opacity-100 group-hover:opacity-100"
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
          <p className="col-span-3 rounded bg-danger/10 px-3 py-2 text-xs text-danger">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="col-span-3 flex items-center justify-center gap-2 rounded-lg border border-line py-2 text-sm font-semibold text-ink transition-colors hover:bg-panel-2 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {pending ? "Adicionando..." : "Adicionar loja"}
        </button>
      </form>
    </section>
  );
}
