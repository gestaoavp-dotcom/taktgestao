"use client";

import { useActionState } from "react";
import type { ClientAccount } from "@/lib/types";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { updateBilling } from "@/app/(dashboard)/clientes/[id]/actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

const PAYMENT_METHODS = ["Pix", "Boleto", "Transferência", "Cartão"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function AccountBilling({
  clientId,
  account,
}: {
  clientId: string;
  account: ClientAccount;
}) {
  const [state, formAction, pending] = useActionState(updateBilling, null);

  return (
    <form action={formAction} className="border-t border-navy/[.06] pt-4 first:border-0 first:pt-0">
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="account_id" value={account.id} />

      <div className="mb-3">
        <p className="text-sm font-semibold text-navy">{account.store_name}</p>
        <p className="text-xs text-[#94A0BD]">
          {MARKETPLACE_LABEL[account.marketplace] ?? account.marketplace}
          {account.cnpj ? ` · ${account.cnpj}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#5B647E]">Mensalidade (R$)</label>
          <input
            name="monthly_fee"
            type="number"
            step="0.01"
            min="0"
            defaultValue={account.monthly_fee ?? ""}
            placeholder="0,00"
            className={INPUT_CLASS}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#5B647E]">Dia de vencimento</label>
          <input
            name="payment_day"
            type="number"
            min="1"
            max="31"
            defaultValue={account.payment_day ?? ""}
            placeholder="10"
            className={INPUT_CLASS}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#5B647E]">Forma de pagamento</label>
          <select
            name="payment_method"
            defaultValue={account.payment_method ?? ""}
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
      </div>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-navy px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0d1a38] disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
        {state && "ok" in state && (
          <span className="text-xs font-medium text-green-700">Salvo.</span>
        )}
        {state && "error" in state && (
          <span className="text-xs text-red-700">{state.error}</span>
        )}
      </div>
    </form>
  );
}

export function ClientBillingCard({
  clientId,
  accounts,
}: {
  clientId: string;
  accounts: ClientAccount[];
}) {
  const total = accounts.reduce((sum, a) => sum + Number(a.monthly_fee ?? 0), 0);

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-bold text-navy">Financeiro</h2>
        {total > 0 && (
          <span className="text-sm text-[#5B647E]">
            Total <strong className="text-navy">{formatCurrency(total)}</strong>/mês
          </span>
        )}
      </div>

      {accounts.length > 0 ? (
        <div className="flex flex-col gap-4">
          {accounts.map((account) => (
            <AccountBilling key={account.id} clientId={clientId} account={account} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#94A0BD]">
          A mensalidade é cobrada por CNPJ. Cadastre as lojas em Contas gerenciadas para
          definir o valor de cada uma.
        </p>
      )}
    </section>
  );
}
