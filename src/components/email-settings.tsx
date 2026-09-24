"use client";

import { useActionState } from "react";
import { Mail, Send } from "lucide-react";
import { sendTestEmail } from "@/app/(dashboard)/configuracoes/actions";

export function EmailSettings({ sender, adminEmail }: { sender: string | null; adminEmail: string }) {
  const [state, formAction, pending] = useActionState(sendTestEmail, null);

  return (
    <section className="mb-8 rounded-lg border border-navy/[.08] bg-white p-5 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 font-bold text-navy">
        <Mail className="h-4 w-4 text-[#94A0BD]" />
        Envio de e-mails
      </h2>
      <p className="mb-4 text-xs text-[#94A0BD]">
        É deste endereço que sai o acesso de cada cliente novo.
      </p>

      {sender ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-navy">
            Enviando como <strong>{sender}</strong>
          </p>
          <form action={formAction}>
            <button
              type="submit"
              disabled={pending}
              className="flex items-center gap-2 rounded-lg border border-navy/10 px-3 py-2 text-sm font-semibold text-navy transition-colors hover:bg-brand-gray disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {pending ? "Enviando..." : `Enviar teste para ${adminEmail}`}
            </button>
          </form>
        </div>
      ) : (
        <p className="rounded-lg bg-yellow/20 px-3 py-2.5 text-sm text-navy">
          Ainda não configurado. Enquanto isso, o acesso de um cliente novo aparece na tela
          para ser copiado e enviado por outro meio.
        </p>
      )}

      {state && "ok" in state && (
        <p className="mt-3 text-sm text-green-700">E-mail de teste enviado. Confira a caixa de entrada.</p>
      )}
      {state && "error" in state && (
        <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <p className="mt-4 text-xs text-[#94A0BD]">
        Para trocar o remetente, altere <code>SMTP_USER</code> e <code>SMTP_PASS</code> na
        Vercel (Settings → Environment Variables) e faça um novo deploy.
      </p>
    </section>
  );
}
