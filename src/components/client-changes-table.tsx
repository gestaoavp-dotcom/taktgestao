"use client";

import { useActionState, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ClientChange, ClientChangeStatus } from "@/lib/types";
import {
  addChange,
  deleteChange,
  updateChangeStatus,
} from "@/app/(dashboard)/clientes/[id]/actions";
import {
  CHANGE_CATEGORIES,
  CHANGE_CATEGORY_LABEL,
  CHANGE_CHANNELS,
  CHANGE_CHANNEL_LABEL,
  CHANGE_STATUSES,
  CHANGE_STATUS_BADGE,
} from "@/lib/client-changes";

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

const TRUNCATE_CELL = "max-w-[220px] truncate px-5 py-2.5 text-[#5B647E]";

function formatDate(date: string | null) {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

function StatusSelect({
  clientId,
  change,
}: {
  clientId: string;
  change: ClientChange;
}) {
  return (
    <form action={updateChangeStatus}>
      <input type="hidden" name="id" value={change.id} />
      <input type="hidden" name="client_id" value={clientId} />
      <select
        name="status"
        defaultValue={change.status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ${CHANGE_STATUS_BADGE[change.status as ClientChangeStatus]}`}
      >
        {CHANGE_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </form>
  );
}

export function ClientChangesTable({
  clientId,
  changes,
}: {
  clientId: string;
  changes: ClientChange[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState(
    async (prevState: Parameters<typeof addChange>[0], formData: FormData) => {
      const result = await addChange(prevState, formData);
      if (result && "ok" in result) formRef.current?.reset();
      return result;
    },
    null,
  );

  return (
    <div>
      <div className="mb-5 rounded-lg bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-bold text-navy">Registrar alteração</h2>
        <p className="mb-4 text-xs text-[#94A0BD]">
          Toda mudança feita na conta do cliente, com o motivo, a meta esperada e quem fez.
          Atualize o status sempre que houver progresso — nunca deixe em branco.
        </p>

        <form ref={formRef} action={formAction} className="space-y-2">
          <input type="hidden" name="client_id" value={clientId} />

          <div className="grid grid-cols-4 gap-2">
            <input
              name="changed_on"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className={INPUT_CLASS}
            />
            <select name="marketplace" defaultValue="" className={INPUT_CLASS}>
              <option value="" disabled>
                Canal / Marketplace
              </option>
              {CHANGE_CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <select name="category" defaultValue="" className={INPUT_CLASS}>
              <option value="" disabled>
                Categoria
              </option>
              {CHANGE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <select name="status" defaultValue="aberta" className={INPUT_CLASS}>
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
            placeholder="Ação feita — o que foi feito, de forma objetiva"
            className={INPUT_CLASS}
          />

          <div className="grid grid-cols-3 gap-2">
            <input name="reason" placeholder="Motivo / Gatilho" className={INPUT_CLASS} />
            <input
              name="goal"
              placeholder="Resultado esperado / Métrica"
              className={INPUT_CLASS}
            />
            <input name="owner" placeholder="Responsável(is)" className={INPUT_CLASS} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <input name="closed_on" type="date" placeholder="Encerramento" className={INPUT_CLASS} />
            <input
              name="evidence"
              placeholder="Observação / Evidência"
              className={`${INPUT_CLASS} col-span-2`}
            />
          </div>

          {state && "error" in state && (
            <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38] disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {pending ? "Registrando..." : "Registrar alteração"}
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead className="bg-brand-gray">
            <tr>
              <th className="px-5 py-2 font-semibold text-navy">Data</th>
              <th className="px-5 py-2 font-semibold text-navy">Canal</th>
              <th className="px-5 py-2 font-semibold text-navy">Categoria</th>
              <th className="px-5 py-2 font-semibold text-navy">Ação feita</th>
              <th className="px-5 py-2 font-semibold text-navy">Motivo</th>
              <th className="px-5 py-2 font-semibold text-navy">Responsável</th>
              <th className="px-5 py-2 font-semibold text-navy">Status</th>
              <th className="px-5 py-2 font-semibold text-navy">Encerramento</th>
              <th className="px-5 py-2 font-semibold text-navy">Resultado esperado</th>
              <th className="px-5 py-2 font-semibold text-navy">Observação</th>
              <th className="px-5 py-2" />
            </tr>
          </thead>
          <tbody>
            {changes.map((change) => (
              <tr key={change.id} className="group border-t border-navy/[.06]">
                <td className="whitespace-nowrap px-5 py-2.5 text-[#5B647E]">
                  {formatDate(change.changed_on)}
                </td>
                <td className="whitespace-nowrap px-5 py-2.5 text-[#5B647E]">
                  {change.marketplace ? CHANGE_CHANNEL_LABEL[change.marketplace] ?? change.marketplace : "—"}
                </td>
                <td className="whitespace-nowrap px-5 py-2.5 text-[#5B647E]">
                  {change.category ? CHANGE_CATEGORY_LABEL[change.category] ?? change.category : "—"}
                </td>
                <td className={TRUNCATE_CELL} title={change.description}>
                  {change.description}
                </td>
                <td className={TRUNCATE_CELL} title={change.reason ?? undefined}>
                  {change.reason ?? "—"}
                </td>
                <td className="whitespace-nowrap px-5 py-2.5 text-[#5B647E]">
                  {change.owner ?? "—"}
                </td>
                <td className="whitespace-nowrap px-5 py-2.5">
                  <StatusSelect clientId={clientId} change={change} />
                </td>
                <td className="whitespace-nowrap px-5 py-2.5 text-[#5B647E]">
                  {formatDate(change.closed_on)}
                </td>
                <td className={TRUNCATE_CELL} title={change.goal ?? undefined}>
                  {change.goal ?? "—"}
                </td>
                <td className={TRUNCATE_CELL} title={change.evidence ?? undefined}>
                  {change.evidence ?? "—"}
                </td>
                <td className="px-5 py-2.5 text-right">
                  <form action={deleteChange}>
                    <input type="hidden" name="id" value={change.id} />
                    <input type="hidden" name="client_id" value={clientId} />
                    <button
                      type="submit"
                      aria-label={`Excluir alteração de ${formatDate(change.changed_on)}`}
                      className="rounded p-1.5 text-[#94A0BD] opacity-0 transition-all hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!changes.length && (
              <tr>
                <td colSpan={11} className="px-5 py-8 text-center text-[#94A0BD]">
                  Nenhuma alteração registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
