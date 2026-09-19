"use client";

import { useActionState } from "react";
import type { Client } from "@/lib/types";
import { updateContact } from "@/app/(dashboard)/clientes/[id]/actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

export function ClientContactCard({ client }: { client: Client }) {
  const [state, formAction, pending] = useActionState(updateContact, null);

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-bold text-navy">Contato</h2>

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="client_id" value={client.id} />

        <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
            E-mail
          </span>
          <input
            name="contact_email"
            type="email"
            defaultValue={client.contact_email ?? ""}
            placeholder="email@cliente.com"
            className={INPUT_CLASS}
          />
        </label>

        <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
            Telefone
          </span>
          <input
            name="contact_phone"
            defaultValue={client.contact_phone ?? ""}
            placeholder="(11) 90000-0000"
            className={INPUT_CLASS}
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38] disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>

        {state && "ok" in state && (
          <span className="text-xs font-medium text-green-700">Salvo.</span>
        )}
        {state && "error" in state && (
          <span className="text-xs text-red-700">{state.error}</span>
        )}
      </form>
    </section>
  );
}
