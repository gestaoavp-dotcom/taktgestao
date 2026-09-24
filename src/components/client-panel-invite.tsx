"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";

// The message that hands a client their first login.
//
// The temporary password is typed here only to compose the text: it is never
// sent anywhere, never stored, and disappears when the page closes. The one
// that matters is the one the client chooses on first access, which nobody
// here ever sees.

const PANEL_URL = "https://taktgestao.vercel.app";

export function ClientPanelInvite({
  clientName,
  loginEmail,
}: {
  clientName: string;
  loginEmail: string | null;
}) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const message = `Oi, ${name || "[NOME]"}! Seu acesso ao painel da TAKT está pronto.

${PANEL_URL}
Login: ${loginEmail || "[EMAIL]"}
Senha temporária: ${password || "[SENHA]"}

A senha vale só para a primeira entrada — o sistema vai pedir para você criar a sua. Depois disso, ninguém aqui tem acesso a ela.`;

  async function copy() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const inputClass =
    "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 font-bold text-navy">
        <MessageCircle className="h-4 w-4" />
        Primeiro acesso do cliente ao painel
      </h2>
      <p className="mb-4 max-w-2xl text-xs text-[#5B647E]">
        {loginEmail ? (
          <>
            O login de <strong className="text-navy">{clientName}</strong> já existe. Preencha a
            senha temporária que você criou no Supabase e copie a mensagem.
          </>
        ) : (
          <>
            <strong className="text-navy">{clientName}</strong> ainda não tem login no painel. Crie
            em Supabase → Authentication → Users → Add user, marcando Auto Confirm, e depois
            defina o nível Cliente em Configurações.
          </>
        )}
      </p>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
            Nome de quem vai receber
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como você chama a pessoa"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
            Senha temporária
          </span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="A que você criou no Supabase"
            className={inputClass}
          />
        </label>
      </div>

      <pre className="mb-3 whitespace-pre-wrap rounded-lg bg-brand-gray/60 px-4 py-3 font-sans text-sm text-[#5B647E]">
        {message}
      </pre>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38]"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiado" : "Copiar mensagem"}
        </button>
        <p className="text-xs text-[#94A0BD]">
          A senha digitada aqui não é salva — serve só para montar o texto. Mande assim que criar o
          acesso: ela vale até o cliente entrar pela primeira vez.
        </p>
      </div>
    </section>
  );
}
