"use client";

import { useActionState, useEffect, useState } from "react";
import { X } from "lucide-react";
import type { ClientChange } from "@/lib/types";
import { updateChange } from "@/app/(dashboard)/clientes/[id]/actions";
import {
  CHANGE_CATEGORIES,
  CHANGE_STATUSES,
  type ChangeChannelOption,
} from "@/lib/client-changes";
import { DateField } from "@/components/date-field";

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

function channelKeyOf(change: ClientChange) {
  if (change.account_id) return `account:${change.account_id}`;
  if (change.marketplace) return `marketplace:${change.marketplace}`;
  return "";
}

export function EditChangeModal({
  change,
  channelOptions,
  onClose,
}: {
  change: ClientChange;
  channelOptions: ChangeChannelOption[];
  onClose: () => void;
}) {
  const [channel, setChannel] = useState(
    () => channelOptions.find((o) => o.key === channelKeyOf(change)) ?? null,
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const [state, formAction, pending] = useActionState(
    async (prevState: Parameters<typeof updateChange>[0], formData: FormData) => {
      const result = await updateChange(prevState, formData);
      if (result && "ok" in result) onClose();
      return result;
    },
    null,
  );

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
        aria-labelledby="editar-alteracao-titulo"
        className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="editar-alteracao-titulo" className="text-lg font-bold text-navy">
            Editar alteração
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="rounded p-1 text-[#94A0BD] transition-colors hover:bg-brand-gray hover:text-navy"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={change.id} />
          <input type="hidden" name="client_id" value={change.client_id} />
          <input type="hidden" name="marketplace" value={channel?.marketplace ?? ""} />
          <input type="hidden" name="account_id" value={channel?.accountId ?? ""} />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <DateField
              name="changed_on"
              defaultValue={change.changed_on}
              className={`flex items-center justify-between ${INPUT_CLASS}`}
            />
            <select
              value={channel?.key ?? ""}
              onChange={(e) =>
                setChannel(channelOptions.find((o) => o.key === e.target.value) ?? null)
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
            <select name="category" defaultValue={change.category ?? ""} className={INPUT_CLASS}>
              <option value="" disabled>
                Categoria
              </option>
              {CHANGE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={change.status} className={INPUT_CLASS}>
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
            defaultValue={change.description}
            placeholder="Ação feita — o que foi feito, de forma objetiva"
            className={INPUT_CLASS}
          />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              name="reason"
              defaultValue={change.reason ?? ""}
              placeholder="Motivo / Gatilho"
              className={INPUT_CLASS}
            />
            <input
              name="goal"
              defaultValue={change.goal ?? ""}
              placeholder="Resultado esperado / Métrica"
              className={INPUT_CLASS}
            />
            <input
              name="owner"
              defaultValue={change.owner ?? ""}
              placeholder="Responsável(is)"
              className={INPUT_CLASS}
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <DateField
              name="closed_on"
              defaultValue={change.closed_on}
              placeholder="Encerramento"
              className={`flex items-center justify-between ${INPUT_CLASS}`}
            />
            <input
              name="evidence"
              defaultValue={change.evidence ?? ""}
              placeholder="Observação / Evidência"
              className={`${INPUT_CLASS} sm:col-span-2`}
            />
          </div>

          {state && "error" in state && (
            <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
          )}

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-navy/10 px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-brand-gray"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38] disabled:opacity-60"
            >
              {pending ? "Salvando..." : "Salvar alteração"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
