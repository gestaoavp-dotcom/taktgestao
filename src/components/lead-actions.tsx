"use client";

import { useActionState, useState } from "react";
import { Check, UserPlus } from "lucide-react";
import { NewClientDialog } from "@/components/new-client-dialog";
import { updateLeadEmail } from "@/app/(dashboard)/leads/actions";

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
