"use client";

import { useActionState } from "react";
import type { Client } from "@/lib/types";
import { formatPhone } from "@/lib/masks";
import { updateClient } from "@/app/(dashboard)/clientes/[id]/actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

const FIELD_LABEL = "text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]";

export function ClientRegistrationCard({ client }: { client: Client }) {
  const [state, formAction, pending] = useActionState(updateClient, null);

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <h2 className="mb-1 font-bold text-navy">Cadastro</h2>
      <p className="mb-4 text-xs text-[#94A0BD]">
        Loja, CNPJ e marketplaces ficam no card Financeiro e em Contas gerenciadas,
        abaixo — aqui é só a identificação do cliente.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="client_id" value={client.id} />

        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
            <span className={FIELD_LABEL}>Nome</span>
            <input name="name" required defaultValue={client.name} className={INPUT_CLASS} />
          </label>

          <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
            <span className={FIELD_LABEL}>E-mail</span>
            <input
              name="contact_email"
              type="email"
              defaultValue={client.contact_email ?? ""}
              placeholder="email@cliente.com"
              className={INPUT_CLASS}
            />
          </label>

          <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
            <span className={FIELD_LABEL}>Telefone</span>
            <input
              name="contact_phone"
              defaultValue={client.contact_phone ?? ""}
              placeholder="(11) 90000-0000"
              onChange={(e) => {
                e.target.value = formatPhone(e.target.value);
              }}
              className={INPUT_CLASS}
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
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
        </div>
      </form>
    </section>
  );
}
