"use client";

import { useActionState, useRef, useState } from "react";
import { CalendarDays, MessageSquare, Trash2 } from "lucide-react";
import type { ClientUpdate } from "@/lib/types";
import { addUpdate, deleteUpdate } from "@/app/(dashboard)/clientes/[id]/actions";
import { DateField } from "@/components/date-field";

const INPUT_CLASS =
  "w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent";

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
    <section className="lift rounded-2xl bg-panel p-5 shadow-sm">
      <h2 className="mb-4 font-bold text-ink">Histórico</h2>

      <form ref={formRef} action={formAction} className="mb-6 flex flex-col gap-3">
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="kind" value={kind} />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setKind("update")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              kind === "update"
                ? "bg-accent text-on-accent"
                : "border border-line text-ink-2 hover:bg-panel-2"
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
                ? "bg-accent text-on-accent"
                : "border border-line text-ink-2 hover:bg-panel-2"
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
          <div className="w-44">
            <DateField
              name="happened_on"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
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
          <p className="rounded bg-danger/10 px-3 py-2 text-xs text-danger">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-lg bg-action px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Publicando..." : "Publicar"}
        </button>
      </form>

      {updates.length > 0 ? (
        <ol className="flex flex-col gap-4 border-t border-line-soft pt-5">
          {updates.map((update) => (
            <li key={update.id} className="group flex gap-3">
              <div
                className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                  update.kind === "meeting" ? "bg-gold/20 text-ink" : "bg-accent/10 text-accent-ink"
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
                  <p className="font-semibold text-ink">{update.title}</p>
                  <span className="text-xs text-ink-3">
                    {formatDate(update.happened_on)}
                  </span>
                </div>
                {update.body && (
                  <p className="mt-1 whitespace-pre-line text-sm text-ink-2">
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
                  className="rounded p-1.5 text-ink-3 opacity-0 transition-all hover:bg-danger/10 hover:text-danger focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </li>
          ))}
        </ol>
      ) : (
        <p className="border-t border-line-soft pt-5 text-sm text-ink-3">
          Nenhuma atualização publicada ainda.
        </p>
      )}
    </section>
  );
}
