"use client";

import { useActionState, useState } from "react";
import { MARKETPLACES } from "@/lib/marketplaces";
import { formatPhone } from "@/lib/masks";
import { submitLead } from "@/app/contato/actions";

const REVENUE_BANDS = [
  "Ainda não vendo",
  "Até R$ 50 mil",
  "R$ 50 mil a R$ 200 mil",
  "R$ 200 mil a R$ 500 mil",
  "Acima de R$ 500 mil",
];

const LABEL = "text-sm font-semibold text-[#C9D2F2]";

/**
 * The form in the landing page's contact block. It writes to the same table
 * as /contato, so a lead that arrives here lands in the same list — tagged
 * `landing`, so the team knows which page it came from.
 */
export function LandingLeadForm() {
  const [phone, setPhone] = useState("");
  const [state, formAction, pending] = useActionState(submitLead, null);

  if (state && "ok" in state) {
    return (
      <div className="lp-glass flex min-h-[420px] flex-1 basis-[460px] flex-col items-center justify-center gap-4 rounded-[28px] p-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FFE08A] via-[#F5B82E] to-[#E39A00]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0A1024" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h3 className="text-2xl font-extrabold">Recebemos seu contato!</h3>
        <p className="m-0 max-w-sm text-[#A3AECF]">
          Um especialista da TAKT fala com você pelo WhatsApp para fazer o diagnóstico da
          sua operação.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="lp-glass flex min-w-0 flex-1 basis-[460px] flex-col gap-[18px] rounded-[28px] p-7 shadow-[0_40px_90px_rgba(0,0,0,0.45)] backdrop-blur-[16px] sm:p-[38px]"
    >
      <input type="hidden" name="source" value="landing" />

      <div className="flex flex-col gap-2">
        <label htmlFor="lp-nome" className={LABEL}>
          Nome
        </label>
        <input
          id="lp-nome"
          name="name"
          required
          maxLength={120}
          autoComplete="name"
          placeholder="Seu nome"
          className="lp-field"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="lp-whats" className={LABEL}>
            WhatsApp
          </label>
          <input
            id="lp-whats"
            name="phone"
            type="tel"
            inputMode="numeric"
            required
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="(00) 00000-0000"
            className="lp-field"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="lp-email" className={LABEL}>
            E-mail
          </label>
          <input
            id="lp-email"
            name="email"
            type="email"
            required
            maxLength={160}
            autoComplete="email"
            placeholder="voce@email.com"
            className="lp-field"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="lp-loja" className={LABEL}>
          Nome da loja
        </label>
        <input
          id="lp-loja"
          name="company"
          maxLength={120}
          placeholder="Sua loja ou marca"
          className="lp-field"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="lp-fat" className={LABEL}>
          Faturamento mensal nos marketplaces
        </label>
        <select id="lp-fat" name="revenue" className="lp-field lp-select" defaultValue={REVENUE_BANDS[0]}>
          {REVENUE_BANDS.map((band) => (
            <option key={band}>{band}</option>
          ))}
        </select>
      </div>

      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
        <legend className={`${LABEL} mb-2.5 p-0`}>Onde você vende ou quer vender?</legend>
        <div className="flex flex-wrap gap-2">
          {MARKETPLACES.map((m) => (
            <label
              key={m.value}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-white/[.16] bg-white/[.04] px-3.5 py-2.5 text-sm font-semibold"
            >
              <input
                type="checkbox"
                name="marketplaces"
                value={m.value}
                className="m-0 h-[17px] w-[17px] accent-[#F5B82E]"
              />
              {m.label === "TikTok" ? "TikTok Shop" : m.label}
            </label>
          ))}
        </div>
      </fieldset>

      {state && "error" in state && (
        <p className="m-0 rounded-xl border border-[#F04438]/40 bg-[#F04438]/10 px-4 py-3 text-sm font-semibold text-[#FF8A80]">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="lp-btn lp-btn-gold mt-1.5 min-h-[54px] cursor-pointer border-0 px-6 py-[18px] text-[17px] font-extrabold disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Enviando…" : "Quero meu diagnóstico"}
      </button>
      <span className="text-center text-[13px] text-[#7E8AB0]">
        Seus dados são usados só para entrarmos em contato.
      </span>
    </form>
  );
}
