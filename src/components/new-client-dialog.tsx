"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, X } from "lucide-react";
import { MARKETPLACES } from "@/lib/marketplaces";
import { formatCnpj, formatPhone } from "@/lib/masks";
import { createClientRecord, type CreateClientState } from "@/app/(dashboard)/clientes/actions";

export type NewClientInitial = {
  name?: string;
  email?: string;
  phone?: string;
  cnpj?: string;
  label?: string;
  marketplaces?: string[];
};

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

/**
 * The admin's pré-cadastro: a client, its CNPJ principal and stores, and its
 * login with the access link, in one form. Opened blank from Clientes, and
 * from Leads filled in with what the lead left — every field still editable.
 * Mounted only while open, so each opening starts from its initial values.
 */
export function NewClientDialog({
  title = "Novo cliente",
  intro = "Este é o pré-cadastro feito por nós. Ao salvar, o cliente ganha um login com o e-mail principal e recebe um link para criar a própria senha.",
  initial = {},
  leadId,
  onClose,
}: {
  title?: string;
  intro?: string;
  initial?: NewClientInitial;
  /** Converting a lead: it is marked as having become this client. */
  leadId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState(formatPhone(initial.phone ?? ""));
  const [cnpj, setCnpj] = useState(formatCnpj(initial.cnpj ?? ""));
  // Controlled so a refused save keeps what was typed: React resets the
  // uncontrolled fields of a form once its action has run.
  const [fields, setFields] = useState({
    name: initial.name ?? "",
    email: initial.email ?? "",
    label: initial.label ?? "",
    monthly_fee: "",
    payment_day: "",
  });
  const field = (key: keyof typeof fields) => ({
    value: fields[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields((f) => ({ ...f, [key]: e.target.value })),
  });
  const [marketplaces, setMarketplaces] = useState<string[]>(initial.marketplaces ?? []);
  const [done, setDone] = useState<Extract<CreateClientState, { ok: true }> | null>(null);
  const [copied, setCopied] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (prevState: CreateClientState, formData: FormData) => {
      const result = await createClientRecord(prevState, formData);
      // Stays open on a confirmation: the admin needs to see whether the
      // access e-mail went out, and has the message to hand over if not.
      if (result && "ok" in result) setDone(result);
      return result;
    },
    null,
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="novo-cliente-titulo"
        className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 text-left shadow-xl"
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 id="novo-cliente-titulo" className="text-lg font-bold text-navy">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="rounded p-1 text-[#94A0BD] transition-colors hover:bg-brand-gray hover:text-navy"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex items-start gap-3 rounded-lg bg-green-50 px-4 py-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
              <div className="text-sm">
                <p className="font-semibold text-green-800">Cliente e login criados.</p>
                <p className="text-green-800">
                  {done.emailSent
                    ? `O e-mail com o acesso foi enviado para ${done.email}.`
                    : "O envio de e-mail ainda não está configurado — mande a mensagem abaixo ao cliente (WhatsApp, por exemplo)."}
                </p>
              </div>
            </div>

            {done.message && (
              <div className="flex flex-col gap-2">
                <pre className="whitespace-pre-wrap rounded-lg border border-navy/10 bg-brand-gray/40 p-3 font-sans text-xs text-navy">
                  {done.message}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(done.message!).then(() => setCopied(true));
                  }}
                  className="flex items-center justify-center gap-2 rounded-lg border border-navy/10 py-2 text-sm font-semibold text-navy transition-colors hover:bg-brand-gray"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "Copiado!" : "Copiar mensagem"}
                </button>
                <p className="text-xs text-[#94A0BD]">
                  O link vale uma única vez e expira. Se o cliente não usar a tempo, envie um novo em
                  Informações → Acessos.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                router.push(`/clientes/${done.id}/informacoes`);
              }}
              className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1e4ed8]"
            >
              Ir para as informações do cliente
            </button>
          </div>
        ) : (
          <>
            <p className="mb-5 text-xs text-[#94A0BD]">{intro}</p>

            <form action={formAction} className="flex flex-col gap-4">
              {leadId && <input type="hidden" name="lead_id" value={leadId} />}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-semibold text-navy">
                  Nome
                </label>
                <input id="name" name="name" required autoFocus {...field("name")} className={INPUT_CLASS} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-semibold text-navy">
                  E-mail principal
                </label>
                <input
                  id="email"
                  {...field("email")}
                  name="email"
                  type="email"
                  required
                  autoComplete="off"
                  placeholder="cliente@empresa.com"
                  className={INPUT_CLASS}
                />
                <p className="text-xs text-[#94A0BD]">
                  Vira o login do cliente e é para onde vai o acesso.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact_phone" className="text-sm font-semibold text-navy">
                  Telefone
                </label>
                <input
                  id="contact_phone"
                  name="contact_phone"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(11) 90000-0000"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <label htmlFor="cnpj" className="text-sm font-semibold text-navy">
                    CNPJ Principal
                  </label>
                  <input
                    id="cnpj"
                    name="cnpj"
                    inputMode="numeric"
                    required
                    minLength={18}
                    title="CNPJ completo, com 14 dígitos"
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label htmlFor="label" className="text-sm font-semibold text-navy">
                    Loja / apelido
                  </label>
                  <input id="label" {...field("label")} name="label" placeholder="Opcional" className={INPUT_CLASS} />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <label htmlFor="monthly_fee" className="text-sm font-semibold text-navy">
                    Valor acordado (R$)
                  </label>
                  <input
                    id="monthly_fee"
                    {...field("monthly_fee")}
                    name="monthly_fee"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label htmlFor="payment_day" className="text-sm font-semibold text-navy">
                    Vencimento acordado (dia)
                  </label>
                  <input
                    id="payment_day"
                    {...field("payment_day")}
                    name="payment_day"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="10"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
              <p className="-mt-2 text-xs text-[#94A0BD]">
                Preenchido só pelo time. O cliente, quando tiver acesso, só vai visualizar esse
                valor — a edição continua sendo nossa.
              </p>

              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-navy">Marketplaces geridos</span>
                <div className="flex flex-wrap gap-1.5">
                  {MARKETPLACES.map((m) => {
                    const checked = marketplaces.includes(m.value);
                    return (
                      <label
                        key={m.value}
                        className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
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
                          onChange={(e) => {
                            setMarketplaces((prev) =>
                              e.target.checked
                                ? [...prev, m.value]
                                : prev.filter((v) => v !== m.value),
                            );
                          }}
                          className="sr-only"
                        />
                        {m.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              {state && "error" in state && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  Não consegui salvar: {state.error}
                </p>
              )}

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-navy/10 px-4 py-2 text-sm font-semibold text-[#5B647E] transition-colors hover:bg-brand-gray"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1e4ed8] disabled:opacity-60"
                >
                  {pending ? "Criando..." : "Salvar e criar acesso"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
