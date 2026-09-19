"use client";

import { useActionState, useRef, useState } from "react";
import { CalendarDays, MessageSquare, Trash2 } from "lucide-react";
import type { ClientUpdate } from "@/lib/types";
import { addUpdate, deleteUpdate } from "@/app/(dashboard)/clientes/[id]/actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

function formatDate(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

export function ClientHistoryCard({
  clientId,
  updates,
}: {
  clientId: string;
  updates: ClientUpdate[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<"update" | "meeting">("update");

  const [state, formAction, pending] = useActionState(
    async (prevState: Parameters<typeof addUpdate>[0], formData: FormData) => {
      const result = await addUpdate(prevState, formData);
      if (result && "ok" in result) formRef.current?.reset();
      return result;
    },
    null,
  );

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-bold text-navy">Histórico</h2>

      <form ref={formRef} action={formAction} className="mb-6 flex flex-col gap-3">
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="kind" value={kind} />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setKind("update")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              kind === "update"
                ? "bg-blue text-white"
                : "border border-navy/10 text-[#5B647E] hover:bg-brand-gray"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Atualização
          </button>
          <button
            type="button"
            onClick={() => setKind("meeting")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              kind === "meeting"
                ? "bg-blue text-white"
                : "border border-navy/10 text-[#5B647E] hover:bg-brand-gray"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Ata de reunião
          </button>
        </div>

        <div className="flex gap-2">
          <input
            name="title"
            required
            placeholder={kind === "meeting" ? "Assunto da reunião" : "O que aconteceu"}
            className={INPUT_CLASS}
          />
          <input
            name="happened_on"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-44 rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-blue"
          />
        </div>

        <textarea
          name="body"
          rows={3}
          placeholder={
            kind === "meeting"
              ? "Resumo do que foi discutido e combinado..."
              : "Detalhes (opcional)"
          }
          className={INPUT_CLASS}
        />

        {state && "error" in state && (
          <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38] disabled:opacity-60"
        >
          {pending ? "Publicando..." : "Publicar"}
        </button>
      </form>

      {updates.length > 0 ? (
        <ol className="flex flex-col gap-4 border-t border-navy/[.06] pt-5">
          {updates.map((update) => (
            <li key={update.id} className="group flex gap-3">
              <div
                className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                  update.kind === "meeting" ? "bg-yellow/20 text-navy" : "bg-blue/10 text-blue"
                }`}
              >
                {update.kind === "meeting" ? (
                  <CalendarDays className="h-4 w-4" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="font-semibold text-navy">{update.title}</p>
                  <span className="text-xs text-[#94A0BD]">
                    {formatDate(update.happened_on)}
                  </span>
                </div>
                {update.body && (
                  <p className="mt-1 whitespace-pre-line text-sm text-[#5B647E]">
                    {update.body}
                  </p>
                )}
              </div>

              <form action={deleteUpdate}>
                <input type="hidden" name="id" value={update.id} />
                <input type="hidden" name="client_id" value={clientId} />
                <button
                  type="submit"
                  aria-label={`Excluir ${update.title}`}
                  className="rounded p-1.5 text-[#94A0BD] opacity-0 transition-all hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </li>
          ))}
        </ol>
      ) : (
        <p className="border-t border-navy/[.06] pt-5 text-sm text-[#94A0BD]">
          Nenhuma atualização publicada ainda.
        </p>
      )}
    </section>
  );
}
