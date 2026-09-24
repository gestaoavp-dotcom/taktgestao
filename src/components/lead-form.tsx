"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { MARKETPLACES } from "@/lib/marketplaces";
import { formatPhone } from "@/lib/masks";
import { submitLead } from "@/app/contato/actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2.5 text-base text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue sm:text-sm";

const LABEL_CLASS = "text-sm font-semibold text-navy";

export function LeadForm({ toCalculator = false }: { toCalculator?: boolean }) {
  const [phone, setPhone] = useState("");
  const [marketplaces, setMarketplaces] = useState<string[]>([]);
  const [state, formAction, pending] = useActionState(submitLead, null);

  if (state && "ok" in state) {
    return (
      <div className="py-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
        <h2 className="mt-4 text-lg font-bold text-navy">Recebemos seu contato!</h2>
        <p className="mt-2 text-sm text-[#5B647E]">
          Em breve alguém da nossa equipe fala com você pelo WhatsApp.
        </p>
        {toCalculator && (
          <Link
            href="/calculadora"
            className="mt-6 flex h-11 items-center justify-center rounded-lg bg-navy text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38]"
          >
            Acessar Nossa Calculadora
          </Link>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {toCalculator && (
        <p className="rounded-lg bg-blue/10 px-3 py-2.5 text-sm font-semibold text-blue">
          Preencha seus dados para liberar Nossa Calculadora.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className={LABEL_CLASS}>
          Nome
        </label>
        <input id="name" name="name" required maxLength={120} autoComplete="name" className={INPUT_CLASS} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className={LABEL_CLASS}>
          WhatsApp
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          required
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          placeholder="(11) 90000-0000"
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={LABEL_CLASS}>
          E-mail <span className="font-normal text-[#94A0BD]">(opcional)</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          maxLength={160}
          autoComplete="email"
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="company" className={LABEL_CLASS}>
          Nome da loja ou empresa <span className="font-normal text-[#94A0BD]">(opcional)</span>
        </label>
        <input
          id="company"
          name="company"
          maxLength={120}
          autoComplete="organization"
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={LABEL_CLASS}>
          Onde você já vende? <span className="font-normal text-[#94A0BD]">(opcional)</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {MARKETPLACES.map((m) => {
            const checked = marketplaces.includes(m.value);
            return (
              <label
                key={m.value}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                  checked
                    ? "border-blue bg-blue/10 text-blue"
                    : "border-navy/10 text-[#5B647E] hover:border-blue/40"
                }`}
              >
                <input
                  type="checkbox"
                  name="marketplaces"
                  value={m.value}
                  checked={checked}
                  onChange={(e) =>
                    setMarketplaces((prev) =>
                      e.target.checked ? [...prev, m.value] : prev.filter((v) => v !== m.value),
                    )
                  }
                  className="sr-only"
                />
                {m.label}
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className={LABEL_CLASS}>
          Como podemos ajudar? <span className="font-normal text-[#94A0BD]">(opcional)</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          maxLength={1000}
          placeholder="Conte um pouco sobre sua operação e o que você procura."
          className={`resize-none ${INPUT_CLASS}`}
        />
      </div>

      {state && "error" in state && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 h-11 rounded-lg bg-navy text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38] disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Quero falar com a TAKT"}
      </button>
    </form>
  );
}
