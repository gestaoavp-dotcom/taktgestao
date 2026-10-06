"use client";

import { useActionState, useState } from "react";
import { Check, Copy, MessageCircle, Send } from "lucide-react";
import { sendClientAccessLink } from "@/app/(dashboard)/configuracoes/actions";

// The client's way into its panel: a one-time link, e-mailed when the deploy
// can send mail, handed back here to copy when it can't. No password is typed,
// shown or kept on the agency's side — the client chooses its own through the
// link.

const INPUT_CLASS =
  "w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent";

const LABEL_CLASS = "text-[11px] font-semibold uppercase tracking-wide text-ink-3";

export function ClientPanelInvite({
  clientId,
  clientName,
  loginEmail,
  canCreate,
}: {
  clientId: string;
  clientName: string;
  loginEmail: string | null;
  /** Only an owner may send a link; the action checks again on the server. */
  canCreate: boolean;
}) {
  const [email, setEmail] = useState(loginEmail ?? "");
  const [copied, setCopied] = useState(false);
  const [state, formAction, working] = useActionState(sendClientAccessLink, null);

  const exists = !!loginEmail;

  async function copy(message: string) {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="lift rounded-2xl bg-panel p-5 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 font-bold text-ink">
        <MessageCircle className="h-4 w-4" />
        Acesso de {clientName} ao painel
      </h2>
      <p className="mb-4 max-w-2xl text-xs text-ink-2">
        {exists
          ? "O login já existe. Envie um novo link se o cliente perdeu o primeiro ou esqueceu a senha — cada link novo invalida o anterior."
          : "Este cliente ainda não tem login. Enviar o link cria o login com este e-mail."}{" "}
        O link funciona uma única vez e expira: por ele, o cliente cria a própria senha.
      </p>

      <form action={formAction} className="mb-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="name" value={clientName} />

        <label className="flex min-w-[260px] flex-1 flex-col gap-1.5">
          <span className={LABEL_CLASS}>E-mail do cliente</span>
          {/* readOnly, not disabled: a disabled field is left out of the
              submission, and this one carries which login to act on. */}
          <input
            name="email"
            type="email"
            required
            value={email}
            readOnly={exists}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="pessoa@empresa.com"
            className={INPUT_CLASS + (exists ? " bg-panel-2/40" : "")}
          />
        </label>

        {canCreate && (
          <button
            type="submit"
            disabled={working}
            className="flex items-center gap-2 rounded-lg bg-action px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:opacity-90 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {working ? "Enviando..." : exists ? "Enviar novo link" : "Criar acesso e enviar link"}
          </button>
        )}
      </form>

      {state && "error" in state && (
        <p className="rounded bg-danger/10 px-3 py-2 text-xs text-danger">{state.error}</p>
      )}

      {state && "ok" in state && state.emailSent && (
        <p className="rounded bg-pos/10 px-3 py-2 text-xs text-pos">
          Link enviado para {email}.
        </p>
      )}

      {state && "ok" in state && !state.emailSent && (
        <div className="flex flex-col gap-3">
          <p className="rounded bg-gold/20 px-3 py-2 text-xs text-ink">
            O envio de e-mail não está configurado — mande a mensagem abaixo ao cliente. Ela
            funciona uma vez só e expira, então envie logo.
          </p>
          <pre className="whitespace-pre-wrap rounded-lg bg-panel-2/60 px-4 py-3 font-sans text-sm text-ink-2">
            {state.message}
          </pre>
          <button
            type="button"
            onClick={() => copy(state.message)}
            className="flex w-fit items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-panel-2"
          >
            {copied ? <Check className="h-4 w-4 text-pos" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar mensagem"}
          </button>
        </div>
      )}
    </section>
  );
}
