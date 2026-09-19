"use client";

import { useActionState, useRef } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import type { ClientLink } from "@/lib/types";
import { addLink, deleteLink } from "@/app/(dashboard)/clientes/[id]/actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

export function ClientLinksCard({
  clientId,
  links,
}: {
  clientId: string;
  links: ClientLink[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState(
    async (prevState: Parameters<typeof addLink>[0], formData: FormData) => {
      const result = await addLink(prevState, formData);
      if (result && "ok" in result) formRef.current?.reset();
      return result;
    },
    null,
  );

  return (
    <div className="max-w-2xl">
      <div className="mb-5 rounded-lg bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-bold text-navy">Adicionar link</h2>
        <p className="mb-4 text-xs text-[#94A0BD]">
          Páginas das lojas, painéis dos marketplaces, pastas de arquivos.
        </p>

        <form ref={formRef} action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="client_id" value={clientId} />
          <input name="label" required placeholder="Nome do link" className={INPUT_CLASS} />
          <input
            name="url"
            type="url"
            required
            placeholder="https://..."
            className={INPUT_CLASS}
          />

          {state && "error" in state && (
            <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="flex items-center justify-center gap-2 rounded-lg bg-navy py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38] disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {pending ? "Salvando..." : "Salvar link"}
          </button>
        </form>
      </div>

      <div className="rounded-lg bg-white shadow-sm">
        {links.length > 0 ? (
          <ul className="divide-y divide-navy/[.06]">
            {links.map((link) => (
              <li key={link.id} className="group flex items-center gap-3 px-5 py-3">
                <ExternalLink className="h-4 w-4 flex-shrink-0 text-[#94A0BD]" />
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1"
                >
                  <span className="block truncate text-sm font-semibold text-navy hover:text-blue">
                    {link.label}
                  </span>
                  <span className="block truncate text-xs text-[#94A0BD]">{link.url}</span>
                </a>
                <form action={deleteLink}>
                  <input type="hidden" name="id" value={link.id} />
                  <input type="hidden" name="client_id" value={clientId} />
                  <button
                    type="submit"
                    aria-label={`Excluir ${link.label}`}
                    className="rounded p-1.5 text-[#94A0BD] opacity-0 transition-all hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-[#94A0BD]">
            Nenhum link salvo ainda.
          </p>
        )}
      </div>
    </div>
  );
}
