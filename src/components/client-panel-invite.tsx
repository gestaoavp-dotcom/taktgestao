"use client";

import { useActionState, useState } from "react";
import { Check, Copy, MessageCircle, UserPlus } from "lucide-react";
import { createUserWithPassword } from "@/app/(dashboard)/configuracoes/actions";

// Creating the client's login and writing the message that hands it over, in
// one place — because they are one job, done on the page for that client.
//
// The temporary password lives in this form and nowhere else. It is sent once
// to create the account, used to compose the message, and never stored: the
// password that matters is the one the client chooses on first access, which
// nobody here ever sees.

const PANEL_URL = "https://taktgestao.vercel.app";

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

const LABEL_CLASS = "text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]";

export function ClientPanelInvite({
  clientId,
  clientName,
  loginEmail,
  canCreate,
}: {
  clientId: string;
  clientName: string;
  loginEmail: string | null;
  /** Only an owner may create a login; the action checks again on the server. */
  canCreate: boolean;
}) {
  const [email, setEmail] = useState(loginEmail ?? "");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const [state, formAction, creating] = useActionState(createUserWithPassword, null);
  const created = !!(state && "ok" in state);
  const exists = !!loginEmail || created;

  const message = `Oi, ${name || "[NOME]"}! Seu acesso ao painel da TAKT está pronto.

${PANEL_URL}
Login: ${email || "[EMAIL]"}
Senha temporária: ${password || "[SENHA]"}

A senha vale só para a primeira entrada — o sistema vai pedir para você criar a sua. Depois disso, ninguém aqui tem acesso a ela.`;

  async function copy() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 font-bold text-navy">
        <MessageCircle className="h-4 w-4" />
        Acesso de {clientName} ao painel
      </h2>
      <p className="mb-4 max-w-2xl text-xs text-[#5B647E]">
        {exists
          ? "O login existe. Preencha o nome e a senha temporária para montar a mensagem."
          : "Crie o login e monte a mensagem de primeiro acesso, tudo aqui. A senha temporária vale uma entrada só: no primeiro acesso o sistema exige que a pessoa crie a dela."}
      </p>

      <form action={formAction} className="mb-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="role" value="cliente" />
        <input type="hidden" name="client_id" value={clientId} />

        <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
          <span className={LABEL_CLASS}>E-mail do cliente</span>
          <input
            name="email"
            type="email"
            required
            value={email}
            disabled={exists}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="pessoa@empresa.com"
            className={INPUT_CLASS + " disabled:bg-brand-gray/40"}
          />
        </label>

        <label className="flex min-w-[140px] flex-col gap-1.5">
          <span className={LABEL_CLASS}>Nome de quem recebe</span>
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como você chama"
            className={INPUT_CLASS}
          />
        </label>

        <label className="flex min-w-[180px] flex-col gap-1.5">
          <span className={LABEL_CLASS}>Senha temporária</span>
          <input
            name="password"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Pelo menos 8 caracteres"
            className={INPUT_CLASS}
          />
        </label>

        {!exists && canCreate && (
          <button
            type="submit"
            disabled={creating}
            className="flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38] disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" />
            {creating ? "Criando..." : "Criar acesso"}
          </button>
        )}
      </form>

      {state && "error" in state && (
        <p className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
      )}
      {created && (
        <p className="mb-3 rounded bg-green-50 px-3 py-2 text-xs text-green-800">
          Acesso criado. Agora copie a mensagem e mande para o cliente.
        </p>
      )}

      <pre className="mb-3 whitespace-pre-wrap rounded-lg bg-brand-gray/60 px-4 py-3 font-sans text-sm text-[#5B647E]">
        {message}
      </pre>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-2 rounded-lg border border-navy/10 px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-brand-gray"
        >
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiado" : "Copiar mensagem"}
        </button>
        <p className="text-xs text-[#94A0BD]">
          A senha digitada aqui não fica guardada. Mande assim que criar o acesso — ela vale até o
          cliente entrar pela primeira vez.
        </p>
      </div>
    </section>
  );
}
