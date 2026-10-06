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
  "w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent";

function PendingRow({ client }: { client: PendingClient }) {
  const [email, setEmail] = useState(client.email ?? "");
  const [cnpj, setCnpj] = useState("");
  const [copied, setCopied] = useState(false);
  const [state, formAction, pending] = useActionState(completeClientAccess, null);

  const done = state && "ok" in state;

  return (
    <li className="border-t border-line-soft py-3 first:border-t-0">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="client_id" value={client.id} />
        <input type="hidden" name="name" value={client.name} />
        <input type="hidden" name="needs_cnpj" value={client.hasCnpj ? "0" : "1"} />

        <p className="w-40 truncate pb-2 text-sm font-semibold text-ink" title={client.name}>
          {client.name}
        </p>

        <label className="flex min-w-[220px] flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
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
          <p className="pb-2 text-xs text-ink-2">
            CNPJ principal <strong className="text-ink">{client.mainCnpj}</strong>
          </p>
        ) : (
          <label className="flex w-48 flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
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
            className="flex items-center gap-2 rounded-lg bg-action px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:opacity-90 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {pending ? "Criando..." : "Salvar e enviar acesso"}
          </button>
        )}
      </form>

      {state && "error" in state && (
        <p className="mt-2 rounded bg-danger/10 px-3 py-2 text-xs text-danger">{state.error}</p>
      )}
      {state && "ok" in state && state.emailSent && (
        <p className="mt-2 rounded bg-pos/10 px-3 py-2 text-xs text-pos">
          Acesso criado e link enviado para {email}.
        </p>
      )}
      {state && "ok" in state && !state.emailSent && (
        <div className="mt-2 flex flex-col gap-2">
          <p className="rounded bg-gold/20 px-3 py-2 text-xs text-ink">
            Acesso criado, mas o e-mail não saiu — mande a mensagem abaixo ao cliente, logo: o
            link vale uma vez só e expira.
          </p>
          <pre className="whitespace-pre-wrap rounded-lg bg-panel-2/60 px-4 py-3 font-sans text-xs text-ink-2">
            {state.message}
          </pre>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(state.message).then(() => setCopied(true))}
            className="flex w-fit items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-panel-2"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-pos" /> : <Copy className="h-3.5 w-3.5" />}
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
    <section className="lift mb-6 rounded-2xl border border-gold/60 bg-panel p-5 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 font-bold text-ink">
        <KeyRound className="h-4 w-4 text-ink-3" />
        Clientes sem acesso ({clients.length})
      </h2>
      <p className="mb-3 text-xs text-ink-2">
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
