"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { ClientAccount, ClientChange } from "@/lib/types";
import { addChange, deleteChange, updateChange } from "@/app/(dashboard)/clientes/[id]/actions";
import {
  CHANGE_CATEGORIES,
  CHANGE_CHANNEL_LABEL,
  CHANGE_STATUSES,
  CHANGE_STATUS_BADGE,
  type ChangeChannelOption,
} from "@/lib/client-changes";
import { DateField } from "@/components/date-field";

const INPUT_CLASS =
  "w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent";

const NEW = "new";

function channelKeyOf(change: ClientChange) {
  if (change.account_id) return `account:${change.account_id}`;
  if (change.marketplace) return `marketplace:${change.marketplace}`;
  return null;
}

function formatDate(date: string | null) {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

export function ChangeWorkspaceModal({
  clientId,
  changes,
  accounts,
  channelOptions,
  initialSelectedId,
  defaultChannelKey,
  onClose,
}: {
  clientId: string;
  changes: ClientChange[];
  accounts: ClientAccount[];
  channelOptions: ChangeChannelOption[];
  initialSelectedId: string;
  defaultChannelKey: string;
  onClose: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const selectedIdRef = useRef(initialSelectedId);
  const [formKey, setFormKey] = useState(0);

  const selected = selectedId === NEW ? null : changes.find((c) => c.id === selectedId) ?? null;

  const [formChannel, setFormChannel] = useState<ChangeChannelOption | null>(() =>
    selected
      ? channelOptions.find((o) => o.key === channelKeyOf(selected)) ?? null
      : channelOptions.find((o) => o.key === defaultChannelKey) ?? null,
  );

  function selectItem(id: string) {
    selectedIdRef.current = id;
    setSelectedId(id);
    const target = id === NEW ? null : changes.find((c) => c.id === id) ?? null;
    setFormChannel(
      target
        ? channelOptions.find((o) => o.key === channelKeyOf(target)) ?? null
        : channelOptions.find((o) => o.key === defaultChannelKey) ?? null,
    );
    setFormKey((k) => k + 1);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const [state, formAction, pending] = useActionState(
    async (prevState: Parameters<typeof addChange>[0], formData: FormData) => {
      const isNew = selectedIdRef.current === NEW;
      const fn = isNew ? addChange : updateChange;
      const result = await fn(prevState, formData);
      if (result && "ok" in result) {
        if (isNew) {
          formRef.current?.reset();
          setFormKey((k) => k + 1);
        } else {
          onClose();
        }
      }
      return result;
    },
    null,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="alteracao-titulo"
        className="flex h-[min(720px,90vh)] w-full max-w-5xl overflow-hidden rounded-xl bg-panel shadow-xl"
      >
        <div className="flex w-72 flex-shrink-0 flex-col border-r border-line bg-panel-2/40">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-wide text-ink-2">
              {changes.length} {changes.length === 1 ? "alteração" : "alterações"}
            </span>
            <button
              type="button"
              onClick={() => selectItem(NEW)}
              aria-label="Nova alteração"
              className="rounded p-1 text-ink hover:bg-panel"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {changes.map((change) => {
              const isActive = change.id === selectedId;
              const account = accounts.find((a) => a.id === change.account_id);
              const channelLabel = account
                ? account.store_name
                : change.marketplace
                  ? CHANGE_CHANNEL_LABEL[change.marketplace] ?? change.marketplace
                  : null;

              return (
                <button
                  key={change.id}
                  type="button"
                  onClick={() => selectItem(change.id)}
                  className={`flex w-full flex-col gap-1 border-b border-line-soft px-4 py-3 text-left transition-colors ${
                    isActive ? "bg-panel" : "hover:bg-panel/60"
                  }`}
                  style={isActive ? { boxShadow: "inset 3px 0 0 #2b5ff1" } : undefined}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-ink-2">
                      {formatDate(change.changed_on)}
                      {channelLabel ? ` · ${channelLabel}` : ""}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${CHANGE_STATUS_BADGE[change.status]}`}
                    >
                      {CHANGE_STATUSES.find((s) => s.value === change.status)?.label}
                    </span>
                  </div>
                  <span className="truncate text-sm font-semibold text-ink">
                    {change.description}
                  </span>
                </button>
              );
            })}
            {!changes.length && (
              <p className="px-4 py-6 text-center text-xs text-ink-3">
                Nenhuma alteração ainda.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="alteracao-titulo" className="text-lg font-bold text-ink">
              {selected ? "Editar alteração" : "Nova alteração"}
            </h2>
            <div className="flex items-center gap-1">
              {selected && (
                <form action={deleteChange}>
                  <input type="hidden" name="id" value={selected.id} />
                  <input type="hidden" name="client_id" value={clientId} />
                  <button
                    type="submit"
                    aria-label="Excluir"
                    onClick={() => {
                      const remaining = changes.filter((c) => c.id !== selected.id);
                      selectItem(remaining[0]?.id ?? NEW);
                    }}
                    className="rounded p-1.5 text-ink-3 hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              )}
              <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                className="rounded p-1.5 text-ink-3 hover:bg-panel-2 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <form
            key={formKey}
            ref={formRef}
            action={formAction}
            className="flex flex-1 flex-col gap-3"
          >
            <input type="hidden" name="id" value={selected?.id ?? ""} />
            <input type="hidden" name="client_id" value={clientId} />
            <input type="hidden" name="marketplace" value={formChannel?.marketplace ?? ""} />
            <input type="hidden" name="account_id" value={formChannel?.accountId ?? ""} />

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <DateField
                name="changed_on"
                defaultValue={selected?.changed_on ?? new Date().toISOString().slice(0, 10)}
                className={`flex items-center justify-between ${INPUT_CLASS}`}
              />
              <select
                value={formChannel?.key ?? ""}
                onChange={(e) =>
                  setFormChannel(channelOptions.find((o) => o.key === e.target.value) ?? null)
                }
                className={INPUT_CLASS}
              >
                <option value="" disabled>
                  Conta / Canal
                </option>
                {channelOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                name="category"
                defaultValue={selected?.category ?? ""}
                className={INPUT_CLASS}
              >
                <option value="" disabled>
                  Categoria
                </option>
                {CHANGE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select name="status" defaultValue={selected?.status ?? "aberta"} className={INPUT_CLASS}>
                {CHANGE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <input
              name="description"
              required
              defaultValue={selected?.description ?? ""}
              placeholder="Ação feita — o que foi feito, de forma objetiva"
              className={INPUT_CLASS}
            />

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                name="reason"
                defaultValue={selected?.reason ?? ""}
                placeholder="Motivo / Gatilho"
                className={INPUT_CLASS}
              />
              <input
                name="goal"
                defaultValue={selected?.goal ?? ""}
                placeholder="Resultado esperado / Métrica"
                className={INPUT_CLASS}
              />
              <input
                name="owner"
                defaultValue={selected?.owner ?? ""}
                placeholder="Responsável(is)"
                className={INPUT_CLASS}
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <DateField
                name="closed_on"
                defaultValue={selected?.closed_on}
                placeholder="Encerramento"
                className={`flex items-center justify-between ${INPUT_CLASS}`}
              />
              <input
                name="evidence"
                defaultValue={selected?.evidence ?? ""}
                placeholder="Observação / Evidência"
                className={`${INPUT_CLASS} sm:col-span-2`}
              />
            </div>

            {state && "error" in state && (
              <p className="rounded bg-danger/10 px-3 py-2 text-xs text-danger">{state.error}</p>
            )}

            <div className="mt-auto flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-panel-2"
              >
                Fechar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-action px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:opacity-90 disabled:opacity-60"
              >
                {pending ? "Salvando..." : selected ? "Salvar alteração" : "Registrar alteração"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
