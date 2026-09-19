"use client";

import { useActionState, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ClientChange } from "@/lib/types";
import { addChange, deleteChange } from "@/app/(dashboard)/clientes/[id]/actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

function formatDate(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
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
        </p>

        <form ref={formRef} action={formAction} className="grid grid-cols-5 gap-2">
          <input type="hidden" name="client_id" value={clientId} />
          <input
            name="changed_on"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={INPUT_CLASS}
          />
          <input
            name="description"
            required
            placeholder="O que foi alterado"
            className={INPUT_CLASS}
          />
          <input name="reason" placeholder="Motivo" className={INPUT_CLASS} />
          <input name="goal" placeholder="Meta" className={INPUT_CLASS} />
          <input name="owner" placeholder="Responsável" className={INPUT_CLASS} />

          {state && "error" in state && (
            <p className="col-span-5 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="col-span-5 flex items-center justify-center gap-2 rounded-lg bg-navy py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38] disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {pending ? "Registrando..." : "Registrar alteração"}
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-gray">
            <tr>
              <th className="px-5 py-2 font-semibold text-navy">Data</th>
              <th className="px-5 py-2 font-semibold text-navy">Alteração</th>
              <th className="px-5 py-2 font-semibold text-navy">Motivo</th>
              <th className="px-5 py-2 font-semibold text-navy">Meta</th>
              <th className="px-5 py-2 font-semibold text-navy">Responsável</th>
              <th className="px-5 py-2" />
            </tr>
          </thead>
          <tbody>
            {changes.map((change) => (
              <tr key={change.id} className="group border-t border-navy/[.06]">
                <td className="whitespace-nowrap px-5 py-2.5 text-[#5B647E]">
                  {formatDate(change.changed_on)}
                </td>
                <td className="px-5 py-2.5 text-navy">{change.description}</td>
                <td className="px-5 py-2.5 text-[#5B647E]">{change.reason ?? "—"}</td>
                <td className="px-5 py-2.5 text-[#5B647E]">{change.goal ?? "—"}</td>
                <td className="px-5 py-2.5 text-[#5B647E]">{change.owner ?? "—"}</td>
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
                <td colSpan={6} className="px-5 py-8 text-center text-[#94A0BD]">
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
