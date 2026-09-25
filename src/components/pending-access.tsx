"use client";

import { useActionState, useState } from "react";
import { Check, Copy, KeyRound, Send } from "lucide-react";
import { formatCnpj } from "@/lib/masks";
import { completeClientAccess } from "@/app/(dashboard)/clientes/actions";

export type PendingClient = {
  id: string;
  name: string;
  email: string | null;
  hasCnpj: boolean;
  /** The first CNPJ registered, when there is one: kept as the principal. */
  mainCnpj: string | null;
};

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

function PendingRow({ client }: { client: PendingClient }) {
  const [email, setEmail] = useState(client.email ?? "");
  const [cnpj, setCnpj] = useState("");
  const [copied, setCopied] = useState(false);
  const [state, formAction, pending] = useActionState(completeClientAccess, null);

  const done = state && "ok" in state;

  return (
    <li className="border-t border-navy/[.06] py-3 first:border-t-0">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="client_id" value={client.id} />
        <input type="hidden" name="name" value={client.name} />
        <input type="hidden" name="needs_cnpj" value={client.hasCnpj ? "0" : "1"} />

        <p className="w-40 truncate pb-2 text-sm font-semibold text-navy" title={client.name}>
          {client.name}
        </p>

        <label className="flex min-w-[220px] flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
            E-mail principal
          </span>
          <input
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@empresa.com"
            disabled={!!done}
            className={INPUT_CLASS}
          />
        </label>

        {client.hasCnpj ? (
          <p className="pb-2 text-xs text-[#5B647E]">
            CNPJ principal <strong className="text-navy">{client.mainCnpj}</strong>
          </p>
        ) : (
          <label className="flex w-48 flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
              CNPJ principal
            </span>
            <input
              name="cnpj"
              inputMode="numeric"
              required
              minLength={18}
              value={cnpj}
              onChange={(e) => setCnpj(formatCnpj(e.target.value))}
              placeholder="00.000.000/0000-00"
              disabled={!!done}
              className={INPUT_CLASS}
            />
          </label>
        )}

        {!done && (
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38] disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {pending ? "Criando..." : "Salvar e enviar acesso"}
          </button>
        )}
      </form>

      {state && "error" in state && (
        <p className="mt-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
      )}
      {state && "ok" in state && state.emailSent && (
        <p className="mt-2 rounded bg-green-50 px-3 py-2 text-xs text-green-800">
          Acesso criado e link enviado para {email}.
        </p>
      )}
      {state && "ok" in state && !state.emailSent && (
        <div className="mt-2 flex flex-col gap-2">
          <p className="rounded bg-yellow/20 px-3 py-2 text-xs text-navy">
            Acesso criado, mas o e-mail não saiu — mande a mensagem abaixo ao cliente, logo: o
            link vale uma vez só e expira.
          </p>
          <pre className="whitespace-pre-wrap rounded-lg bg-brand-gray/60 px-4 py-3 font-sans text-xs text-[#5B647E]">
            {state.message}
          </pre>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(state.message).then(() => setCopied(true))}
            className="flex w-fit items-center gap-2 rounded-lg border border-navy/10 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-brand-gray"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copiado" : "Copiar mensagem"}
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * Clients registered before the e-mail was required: no login yet. Each row
 * fills what is missing and sends the same one-time access link a new client
 * gets. The admin's alone.
 */
export function PendingAccess({ clients }: { clients: PendingClient[] }) {
  return (
    <section className="mb-6 rounded-lg border border-yellow/60 bg-white p-5 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 font-bold text-navy">
        <KeyRound className="h-4 w-4 text-[#94A0BD]" />
        Clientes sem acesso ({clients.length})
      </h2>
      <p className="mb-3 text-xs text-[#5B647E]">
        Cadastrados antes do e-mail ser obrigatório. Complete o que falta — o cliente recebe
        o link para criar a própria senha.
      </p>
      <ul>
        {clients.map((client) => (
          <PendingRow key={client.id} client={client} />
        ))}
      </ul>
    </section>
  );
}
