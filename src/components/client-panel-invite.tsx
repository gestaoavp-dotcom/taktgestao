"use client";

import { useActionState, useState } from "react";
import { Check, Copy, MessageCircle, Send, Undo2, XCircle } from "lucide-react";
import {
  revokeClientAccessLink,
  sendClientAccessLink,
} from "@/app/(dashboard)/configuracoes/actions";

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
  const [revokeState, revokeAction, revoking] = useActionState(revokeClientAccessLink, null);

  const exists = !!loginEmail;
  const typed = email.trim().toLowerCase();
  const moving = exists && typed.length > 0 && typed !== loginEmail!.toLowerCase();

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
          ? "O login já existe. Envie um novo link se o cliente perdeu o primeiro ou esqueceu a senha — cada link novo invalida o anterior. Para trocar o endereço, escreva o novo aqui."
          : "Este cliente ainda não tem login. Enviar o link cria o login com este e-mail."}{" "}
        O link funciona uma única vez e expira: por ele, o cliente cria a própria senha.
      </p>

      <form action={formAction} className="mb-3 flex flex-wrap items-end gap-3">
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="name" value={clientName} />

        <label className="flex min-w-[260px] flex-1 flex-col gap-1.5">
          <span className={LABEL_CLASS}>E-mail do cliente</span>
          <input
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="pessoa@empresa.com"
            className={INPUT_CLASS}
          />
        </label>

        {canCreate && (
          <button
            type="submit"
            disabled={working}
            className="flex items-center gap-2 rounded-lg bg-action px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:opacity-90 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {working
              ? "Enviando..."
              : moving
                ? "Trocar e-mail e enviar link"
                : exists
                  ? "Enviar novo link"
                  : "Criar acesso e enviar link"}
          </button>
        )}
      </form>

      {moving && (
        <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-gold/15 px-3 py-2 text-xs text-ink">
          <span>
            O login de {clientName} passa a ser <strong className="font-bold">{typed}</strong> em
            vez de <strong className="font-bold">{loginEmail}</strong>, e o link mandado antes
            deixa de funcionar.
          </span>
          <button
            type="button"
            onClick={() => setEmail(loginEmail ?? "")}
            className="inline-flex items-center gap-1 font-semibold text-accent-ink hover:underline"
          >
            <Undo2 className="h-3 w-3" />
            desfazer
          </button>
        </p>
      )}

      {state && "error" in state && (
        <p className="mb-3 rounded bg-danger/10 px-3 py-2 text-xs text-danger">{state.error}</p>
      )}

      {state && "ok" in state && state.emailSent && (
        <p className="mb-3 rounded bg-pos/10 px-3 py-2 text-xs text-pos">
          Link enviado para {email}.
        </p>
      )}

      {state && "ok" in state && !state.emailSent && (
        <div className="mb-3 flex flex-col gap-3">
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

      {/* Separate from sending, for the case where the link went to the wrong
          person and no new one should go out. */}
      {exists && canCreate && (
        <form action={revokeAction} className="flex flex-wrap items-center gap-3 border-t border-line-soft pt-3">
          <input type="hidden" name="client_id" value={clientId} />
          <button
            type="submit"
            disabled={revoking}
            className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:bg-panel-2 hover:text-danger disabled:opacity-60"
          >
            <XCircle className="h-3.5 w-3.5" />
            {revoking ? "Invalidando..." : "Invalidar o último link"}
          </button>
          <span className="text-xs text-ink-3">
            Derruba o link já enviado sem mandar outro. A senha de quem já entrou continua valendo.
          </span>
        </form>
      )}

      {revokeState && "error" in revokeState && (
        <p className="mt-3 rounded bg-danger/10 px-3 py-2 text-xs text-danger">
          {revokeState.error}
        </p>
      )}
      {revokeState && "revoked" in revokeState && (
        <p className="mt-3 rounded bg-pos/10 px-3 py-2 text-xs text-pos">
          Link invalidado. O que foi enviado antes não abre mais nada.
        </p>
      )}
    </section>
  );
}
