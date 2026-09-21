"use client";

import { useActionState, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ClientAccount, ClientCnpj } from "@/lib/types";
import { MARKETPLACES } from "@/lib/marketplaces";
import { addCnpj, deleteCnpj, updateCnpj } from "@/app/(dashboard)/clientes/[id]/actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

const PAYMENT_METHODS = ["Pix", "Boleto", "Transferência", "Cartão"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function MarketplacePicker({ selected }: { selected: string[] }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold text-[#5B647E]">
        Marketplaces onde esta loja vende
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {MARKETPLACES.map((m) => (
          <label key={m.value} className="cursor-pointer">
            <input
              type="checkbox"
              name="marketplaces"
              value={m.value}
              defaultChecked={selected.includes(m.value)}
              className="peer sr-only"
            />
            <span className="block rounded-full border border-navy/10 px-3 py-1 text-xs font-semibold text-[#5B647E] transition-colors hover:bg-brand-gray peer-checked:border-blue peer-checked:bg-blue peer-checked:text-white peer-checked:hover:bg-[#1e4ed8] peer-focus-visible:ring-2 peer-focus-visible:ring-blue/40">
              {m.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function BillingFields({ cnpj }: { cnpj?: ClientCnpj }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[#5B647E]">Mensalidade (R$)</label>
        <input
          name="monthly_fee"
          type="number"
          step="0.01"
          min="0"
          defaultValue={cnpj?.monthly_fee ?? ""}
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
          defaultValue={cnpj?.payment_day ?? ""}
          placeholder="10"
          className={INPUT_CLASS}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[#5B647E]">Forma de pagamento</label>
        <select
          name="payment_method"
          defaultValue={cnpj?.payment_method ?? ""}
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
  );
}

function CnpjBlock({
  clientId,
  cnpj,
  marketplaces,
}: {
  clientId: string;
  cnpj: ClientCnpj;
  marketplaces: string[];
}) {
  const [state, formAction, pending] = useActionState(updateCnpj, null);

  return (
    <form action={formAction} className="rounded-lg border border-navy/10 p-4">
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="cnpj_id" value={cnpj.id} />

      <div className="mb-3 flex items-start gap-2">
        <div className="grid flex-1 grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#5B647E]">Nome da loja</label>
            <input
              name="label"
              defaultValue={cnpj.label ?? ""}
              placeholder="Ex: Obachei"
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#5B647E]">CNPJ</label>
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
          </div>
        </div>
        <button
          type="submit"
          formAction={deleteCnpj}
          aria-label={`Excluir ${cnpj.label ?? cnpj.cnpj}`}
          className="mt-6 rounded p-1.5 text-[#94A0BD] transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3">
        <MarketplacePicker selected={marketplaces} />
      </div>

      <BillingFields cnpj={cnpj} />

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
        A mensalidade é por CNPJ. Os marketplaces marcados em cada CNPJ são as lojas dele.
      </p>

      <div className="flex flex-col gap-3">
        {cnpjs.map((cnpj) => (
          <CnpjBlock
            key={cnpj.id}
            clientId={clientId}
            cnpj={cnpj}
            marketplaces={accounts
              .filter((a) => a.cnpj_id === cnpj.id)
              .map((a) => a.marketplace)}
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

          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#5B647E]">Nome da loja</label>
              <input name="label" placeholder="Ex: Obachei" className={INPUT_CLASS} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#5B647E]">CNPJ</label>
              <input
                name="cnpj"
                required
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                onChange={(e) => {
                  e.target.value = formatCnpj(e.target.value);
                }}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="mb-3">
            <MarketplacePicker selected={[]} />
          </div>

          <BillingFields />

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
