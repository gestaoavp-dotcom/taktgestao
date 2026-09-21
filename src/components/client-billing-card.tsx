"use client";

import { useActionState, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ClientAccount, ClientCnpj } from "@/lib/types";
import { DateField } from "@/components/date-field";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { formatCnpj } from "@/lib/masks";
import { addCnpj, deleteCnpj, updateBilling } from "@/app/(dashboard)/clientes/[id]/actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

const PAYMENT_METHODS = ["Pix", "Boleto", "Transferência", "Cartão"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function CnpjBilling({
  clientId,
  cnpj,
  stores,
}: {
  clientId: string;
  cnpj: ClientCnpj;
  stores: ClientAccount[];
}) {
  const [state, formAction, pending] = useActionState(updateBilling, null);
  const [fee, setFee] = useState(cnpj.monthly_fee?.toString() ?? "");

  // The reajuste fields only matter once the value actually differs, so they
  // stay out of the way while the day or the payment method is being changed.
  const feeChanged = Number(fee || 0) !== Number(cnpj.monthly_fee ?? 0);

  return (
    <form action={formAction} className="rounded-lg border border-navy/10 p-4">
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="cnpj_id" value={cnpj.id} />

      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="grid flex-1 grid-cols-2 gap-2">
          <input
            name="cnpj"
            required
            defaultValue={cnpj.cnpj}
            inputMode="numeric"
            onChange={(e) => {
              e.target.value = formatCnpj(e.target.value);
            }}
            className={INPUT_CLASS}
          />
          <input
            name="label"
            defaultValue={cnpj.label ?? ""}
            placeholder="Apelido (opcional)"
            className={INPUT_CLASS}
          />
        </div>
        <button
          type="submit"
          formAction={deleteCnpj}
          aria-label={`Excluir CNPJ ${cnpj.cnpj}`}
          className="mt-1 rounded p-1.5 text-[#94A0BD] transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#5B647E]">Mensalidade (R$)</label>
          <input
            name="monthly_fee"
            type="number"
            step="0.01"
            min="0"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
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
            defaultValue={cnpj.payment_day ?? ""}
            placeholder="10"
            className={INPUT_CLASS}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#5B647E]">Forma de pagamento</label>
          <select
            name="payment_method"
            defaultValue={cnpj.payment_method ?? ""}
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

      {feeChanged && (
        <div className="mt-3 rounded-lg bg-brand-gray/50 p-3">
          <p className="mb-2 text-xs font-semibold text-navy">
            Reajuste de {formatCurrency(Number(cnpj.monthly_fee ?? 0))} para{" "}
            {formatCurrency(Number(fee || 0))}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <DateField
              name="effective_on"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className={`flex items-center justify-between ${INPUT_CLASS}`}
            />
            <input
              name="fee_note"
              placeholder="Observação (opcional)"
              className={`col-span-2 ${INPUT_CLASS}`}
            />
          </div>
        </div>
      )}

      {stores.length > 0 && (
        <p className="mt-3 text-xs text-[#94A0BD]">
          Lojas neste CNPJ:{" "}
          {stores
            .map(
              (s) =>
                `${s.store_name} (${MARKETPLACE_LABEL[s.marketplace] ?? s.marketplace})`,
            )
            .join(" · ")}
        </p>
      )}

      <div className="mt-3 flex items-center gap-3">
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
  cnpjs,
  accounts,
}: {
  clientId: string;
  cnpjs: ClientCnpj[];
  accounts: ClientAccount[];
}) {
  const [adding, setAdding] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState(
    async (prevState: Parameters<typeof addCnpj>[0], formData: FormData) => {
      const result = await addCnpj(prevState, formData);
      if (result && "ok" in result) {
        formRef.current?.reset();
        setAdding(false);
      }
      return result;
    },
    null,
  );

  const total = cnpjs.reduce((sum, c) => sum + Number(c.monthly_fee ?? 0), 0);

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="font-bold text-navy">Financeiro</h2>
        {total > 0 && (
          <span className="text-sm text-[#5B647E]">
            Total <strong className="text-navy">{formatCurrency(total)}</strong>/mês
          </span>
        )}
      </div>
      <p className="mb-4 text-xs text-[#94A0BD]">
        A mensalidade é por CNPJ. Um CNPJ pode ter várias lojas, em quantos marketplaces
        for.
      </p>

      <div className="flex flex-col gap-3">
        {cnpjs.map((cnpj) => (
          <CnpjBilling
            key={cnpj.id}
            clientId={clientId}
            cnpj={cnpj}
            stores={accounts.filter((a) => a.cnpj_id === cnpj.id)}
          />
        ))}
      </div>

      {adding ? (
        <form
          ref={formRef}
          action={formAction}
          className="mt-3 rounded-lg border border-navy/10 p-4"
        >
          <input type="hidden" name="client_id" value={clientId} />
          <div className="grid grid-cols-2 gap-2">
            <input
              name="cnpj"
              required
              placeholder="CNPJ"
              inputMode="numeric"
              onChange={(e) => {
                e.target.value = formatCnpj(e.target.value);
              }}
              className={INPUT_CLASS}
            />
            <input name="label" placeholder="Apelido (opcional)" className={INPUT_CLASS} />
            <input
              name="monthly_fee"
              type="number"
              step="0.01"
              min="0"
              placeholder="Mensalidade (R$)"
              className={INPUT_CLASS}
            />
            <input
              name="payment_day"
              type="number"
              min="1"
              max="31"
              placeholder="Dia de vencimento"
              className={INPUT_CLASS}
            />
            <select name="payment_method" defaultValue="" className={`col-span-2 ${INPUT_CLASS}`}>
              <option value="">Forma de pagamento</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          {state && "error" in state && (
            <p className="mt-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
              {state.error}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-navy px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0d1a38] disabled:opacity-60"
            >
              {pending ? "Salvando..." : "Salvar CNPJ"}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-lg border border-navy/10 px-4 py-1.5 text-xs font-semibold text-[#5B647E] transition-colors hover:bg-brand-gray"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-navy/20 py-2.5 text-sm font-semibold text-[#5B647E] transition-colors hover:border-blue hover:text-blue"
        >
          <Plus className="h-4 w-4" />
          Adicionar CNPJ
        </button>
      )}
    </section>
  );
}
