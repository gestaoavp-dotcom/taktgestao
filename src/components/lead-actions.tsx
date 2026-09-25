"use client";

import { useActionState, useState } from "react";
import { Check, Trash2, UserPlus } from "lucide-react";
import { NewClientDialog } from "@/components/new-client-dialog";
import { deleteLead, updateLeadEmail, type DeleteLeadState } from "@/app/(dashboard)/leads/actions";

export type ConvertibleLead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  marketplaces: string[];
};

/** The lead's main e-mail, editable where it is shown. */
export function LeadEmailField({ id, email }: { id: string; email: string | null }) {
  const [value, setValue] = useState(email ?? "");
  const [state, formAction, pending] = useActionState(updateLeadEmail, null);
  const changed = value.trim().toLowerCase() !== (email ?? "");

  return (
    <form action={formAction} className="mt-0.5 flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <input
        name="email"
        type="email"
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="sem e-mail"
        aria-label="E-mail principal do lead"
        className="w-48 rounded border border-transparent px-1 py-0.5 text-xs text-[#5B647E] outline-none hover:border-navy/10 focus:border-blue"
      />
      {changed && (
        <button
          type="submit"
          disabled={pending}
          aria-label="Salvar e-mail"
          className="rounded p-0.5 text-green-600 hover:bg-green-50 disabled:opacity-60"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      )}
      {state && "error" in state && <span className="text-[11px] text-red-700">{state.error}</span>}
    </form>
  );
}

/**
 * Opens the pré-cadastro filled in from the lead. Its store or company name
 * becomes the client's name (the person's own name when it left none); the
 * e-mail and the CNPJ are what the admin confirms, and every other field can
 * still be changed before saving.
 */
export function ConvertLeadButton({ lead }: { lead: ConvertibleLead }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1e4ed8]"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Converter em cliente
      </button>

      {open && (
        <NewClientDialog
          title={`Converter ${lead.name} em cliente`}
          intro="Confira o e-mail principal e informe o CNPJ — o resto veio do lead e pode ser ajustado. Ao salvar, o cliente é criado e recebe o link para criar a própria senha."
          leadId={lead.id}
          initial={{
            name: lead.company || lead.name,
            email: lead.email ?? "",
            phone: lead.phone,
            label: lead.company ?? "",
            marketplaces: lead.marketplaces,
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

const PIN_INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-center text-lg tracking-[0.5em] text-navy outline-none focus:border-blue";

/**
 * "Apagar para sempre" for a lead: a confirmation and the admin's PIN, the
 * same one that deletes clients — created here the first time if there is none.
 */
export function DeleteLeadButton({
  lead,
  hasPin,
}: {
  lead: { id: string; name: string };
  hasPin: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Apagar lead ${lead.name}`}
        className="rounded p-1.5 text-[#94A0BD] opacity-0 transition-all hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      {open && <DeleteLeadDialog lead={lead} hasPin={hasPin} onClose={() => setOpen(false)} />}
    </>
  );
}

function DeleteLeadDialog({
  lead,
  hasPin,
  onClose,
}: {
  lead: { id: string; name: string };
  hasPin: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: DeleteLeadState, formData: FormData) => {
      const result = await deleteLead(prev, formData);
      if (result && "ok" in result) onClose();
      return result;
    },
    null,
  );

  const pinProps = {
    type: "password",
    inputMode: "numeric" as const,
    pattern: "[0-9]{4}",
    maxLength: 4,
    required: true,
    autoComplete: "off",
    className: PIN_INPUT_CLASS,
  };

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
        aria-labelledby="apagar-lead-titulo"
        className="w-full max-w-sm rounded-xl bg-white p-6 text-left shadow-xl"
      >
        <h2 id="apagar-lead-titulo" className="text-lg font-bold text-navy">
          Apagar o lead {lead.name}?
        </h2>
        <p className="mt-2 text-sm text-[#5B647E]">
          O lead some de vez da lista. Não dá para desfazer. Se ele já virou cliente, o cliente
          continua como está.
        </p>

        <form action={formAction} className="mt-5 flex flex-col gap-3">
          <input type="hidden" name="id" value={lead.id} />

          {hasPin ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-navy">Seu PIN de exclusão</span>
              <input name="pin" autoFocus {...pinProps} />
            </label>
          ) : (
            <>
              <p className="rounded-lg bg-blue/10 px-3 py-2.5 text-xs text-navy">
                Primeira exclusão: crie agora o seu PIN de 4 números. Ele será pedido em toda
                exclusão daqui para a frente, de leads e de clientes.
              </p>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-navy">Novo PIN</span>
                <input name="pin" autoFocus {...pinProps} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-navy">Repita o PIN</span>
                <input name="pin_confirm" {...pinProps} />
              </label>
            </>
          )}

          {state && "error" in state && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
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
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {pending ? "Apagando..." : "Apagar para sempre"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
