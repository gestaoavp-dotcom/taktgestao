"use client";

import { useActionState } from "react";
import type { Client } from "@/lib/types";
import { updateBilling } from "@/app/(dashboard)/clientes/[id]/actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

const PAYMENT_METHODS = ["Pix", "Boleto", "Transferência", "Cartão"];

export function ClientBillingCard({ client }: { client: Client }) {
  const [state, formAction, pending] = useActionState(updateBilling, null);

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-bold text-navy">Financeiro</h2>

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="client_id" value={client.id} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="monthly_fee" className="text-xs font-semibold text-[#5B647E]">
            Mensalidade (R$)
          </label>
          <input
            id="monthly_fee"
            name="monthly_fee"
            type="number"
            step="0.01"
            min="0"
            defaultValue={client.monthly_fee ?? ""}
            placeholder="0,00"
            className={INPUT_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="payment_day" className="text-xs font-semibold text-[#5B647E]">
            Dia de vencimento
          </label>
          <input
            id="payment_day"
            name="payment_day"
            type="number"
            min="1"
            max="31"
            defaultValue={client.payment_day ?? ""}
            placeholder="10"
            className={INPUT_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="payment_method" className="text-xs font-semibold text-[#5B647E]">
            Forma de pagamento
          </label>
          <select
            id="payment_method"
            name="payment_method"
            defaultValue={client.payment_method ?? ""}
            className={INPUT_CLASS}
          >
            <option value="">Não definida</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>

        {state && "error" in state && (
          <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
        )}
        {state && "ok" in state && (
          <p className="text-xs font-medium text-green-700">Salvo.</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-1 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38] disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </section>
  );
}
