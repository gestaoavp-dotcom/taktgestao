"use client";

import { useActionState } from "react";
import type { Client } from "@/lib/types";
import { formatPhone } from "@/lib/masks";
import { updateClient } from "@/app/(dashboard)/clientes/[id]/actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent";

const FIELD_LABEL = "text-[11px] font-semibold uppercase tracking-wide text-ink-3";

export function ClientRegistrationCard({ client }: { client: Client }) {
  const [state, formAction, pending] = useActionState(updateClient, null);

  return (
    <section className="rounded-lg bg-panel p-5 shadow-sm">
      <h2 className="mb-1 font-bold text-ink">Cadastro</h2>
      <p className="mb-4 text-xs text-ink-3">
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
            className="rounded-lg bg-action px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>

          {state && "ok" in state && (
            <span className="text-xs font-medium text-pos">Salvo.</span>
          )}
          {state && "error" in state && (
            <span className="text-xs text-danger">{state.error}</span>
          )}
        </div>
      </form>
    </section>
  );
}
