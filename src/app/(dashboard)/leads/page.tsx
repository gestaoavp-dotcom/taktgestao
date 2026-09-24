import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { deleteLead, updateLeadStatus } from "./actions";

type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  marketplaces: string[];
  message: string | null;
  status: "novo" | "contatado" | "convertido" | "descartado";
  created_at: string;
};

const STATUS_OPTIONS = [
  { value: "novo", label: "Novo" },
  { value: "contatado", label: "Contatado" },
  { value: "convertido", label: "Virou cliente" },
  { value: "descartado", label: "Descartado" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function whatsappLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
}

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Lead[]>();

  const rows = leads ?? [];
  const newCount = rows.filter((l) => l.status === "novo").length;

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold text-navy">Leads</h1>
        <p className="text-sm text-[#5B647E]">
          {newCount} {newCount === 1 ? "novo" : "novos"} · formulário público em{" "}
          <span className="font-semibold text-navy">/contato</span>
        </p>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-gray">
            <tr>
              <th className="px-5 py-2.5 font-semibold text-navy">Data</th>
              <th className="px-5 py-2.5 font-semibold text-navy">Contato</th>
              <th className="px-5 py-2.5 font-semibold text-navy">Loja / marketplaces</th>
              <th className="px-5 py-2.5 font-semibold text-navy">Mensagem</th>
              <th className="px-5 py-2.5 font-semibold text-navy">Status</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((lead) => (
              <tr key={lead.id} className="group border-t border-navy/[.06] align-top">
                <td className="whitespace-nowrap px-5 py-3 text-[#5B647E]">
                  {formatDate(lead.created_at)}
                </td>
                <td className="px-5 py-3">
                  <p className="font-semibold text-navy">{lead.name}</p>
                  <a
                    href={whatsappLink(lead.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-green-700 hover:underline"
                  >
                    {lead.phone}
                  </a>
                  {lead.email && <p className="text-xs text-[#94A0BD]">{lead.email}</p>}
                </td>
                <td className="px-5 py-3">
                  <p className="text-navy">{lead.company ?? "—"}</p>
                  {lead.marketplaces.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {lead.marketplaces.map((m) => (
                        <span
                          key={m}
                          className="rounded-full bg-blue/10 px-2 py-0.5 text-[11px] font-semibold text-blue"
                        >
                          {MARKETPLACE_LABEL[m] ?? m}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="max-w-xs px-5 py-3 text-[#5B647E]">
                  {lead.message ?? <span className="text-[#94A0BD]">—</span>}
                </td>
                <td className="px-5 py-3">
                  <form action={updateLeadStatus}>
                    <input type="hidden" name="id" value={lead.id} />
                    <AutoSubmitSelect
                      name="status"
                      defaultValue={lead.status}
                      options={STATUS_OPTIONS}
                      className="rounded border border-navy/10 bg-transparent px-2 py-1 text-xs text-navy outline-none"
                    />
                  </form>
                </td>
                <td className="px-5 py-3 text-right">
                  <form action={deleteLead}>
                    <input type="hidden" name="id" value={lead.id} />
                    <button
                      type="submit"
                      aria-label={`Excluir lead ${lead.name}`}
                      className="rounded p-1.5 text-[#94A0BD] opacity-0 transition-all hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-[#94A0BD]">
                  Nenhum lead ainda. Assim que alguém preencher o formulário, aparece aqui.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
