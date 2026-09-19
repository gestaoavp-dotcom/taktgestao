import { Mail, Phone } from "lucide-react";
import type { Client } from "@/lib/types";

export function ClientContactCard({ client }: { client: Client }) {
  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-bold text-navy">Contato</h2>

      <div className="flex flex-wrap gap-x-10 gap-y-3">
        <div className="flex items-center gap-2.5">
          <Phone className="h-4 w-4 flex-shrink-0 text-[#94A0BD]" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
              Telefone
            </p>
            <p className="text-sm text-navy">{client.contact_phone ?? "Não informado"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Mail className="h-4 w-4 flex-shrink-0 text-[#94A0BD]" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
              E-mail
            </p>
            <p className="text-sm text-navy">{client.contact_email ?? "Não informado"}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
