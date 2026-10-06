"use client";

import { useActionState } from "react";
import { Mail, Send } from "lucide-react";
import { sendTestEmail } from "@/app/(dashboard)/configuracoes/actions";

export function EmailSettings({ sender, adminEmail }: { sender: string | null; adminEmail: string }) {
  const [state, formAction, pending] = useActionState(sendTestEmail, null);

  return (
    <section className="mb-8 rounded-lg border border-line bg-panel p-5 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 font-bold text-ink">
        <Mail className="h-4 w-4 text-ink-3" />
        Envio de e-mails
      </h2>
      <p className="mb-4 text-xs text-ink-3">
        É deste endereço que sai o acesso de cada cliente novo.
      </p>

      {sender ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink">
            Enviando como <strong>{sender}</strong>
          </p>
          <form action={formAction}>
            <button
              type="submit"
              disabled={pending}
              className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-panel-2 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {pending ? "Enviando..." : `Enviar teste para ${adminEmail}`}
            </button>
          </form>
        </div>
      ) : (
        <p className="rounded-lg bg-gold/20 px-3 py-2.5 text-sm text-ink">
          Ainda não configurado. Enquanto isso, o acesso de um cliente novo aparece na tela
          para ser copiado e enviado por outro meio.
        </p>
      )}

      {state && "ok" in state && (
        <p className="mt-3 text-sm text-pos">E-mail de teste enviado. Confira a caixa de entrada.</p>
      )}
      {state && "error" in state && (
        <p className="mt-3 rounded bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
      )}

      <p className="mt-4 text-xs text-ink-3">
        Para trocar o remetente, altere <code>SMTP_USER</code> e <code>SMTP_PASS</code> na
        Vercel (Settings → Environment Variables) e faça um novo deploy.
      </p>
    </section>
  );
}
