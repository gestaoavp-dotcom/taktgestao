import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { ConvertLeadButton, DeleteLeadButton, LeadEmailField } from "@/components/lead-actions";
import { getProfile } from "@/lib/profile";
import { updateLeadStatus } from "./actions";

type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  marketplaces: string[];
  message: string | null;
  status: "novo" | "contatado" | "convertido" | "descartado";
  client_id: string | null;
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

  // Converting creates a login, which is the admin's alone.
  const profile = await getProfile();
  const isOwner = profile?.role === "dono";

  // Whether the admin already has its deletion PIN, so the dialog asks for it
  // or offers to create it.
  let hasDeletePin = false;
  if (isOwner && profile) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { hasPin } = await import("@/lib/admin-pin");
    try {
      hasDeletePin = await hasPin(createAdminClient(), profile.id);
    } catch {
      // No service key on this deploy: the delete action says so when used.
    }
  }

  // The clients converted leads became, to link to by name.
  const clientIds = rows.map((l) => l.client_id).filter((id): id is string => !!id);
  const { data: converted } = clientIds.length
    ? await supabase
        .from("clients")
        .select("id, name")
        .in("id", clientIds)
        .returns<{ id: string; name: string }[]>()
    : { data: [] as { id: string; name: string }[] };
  const clientName = new Map((converted ?? []).map((c) => [c.id, c.name]));
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
              <th className="px-5 py-2.5 font-semibold text-navy">Cliente</th>
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
                  <LeadEmailField id={lead.id} email={lead.email} />
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
                <td className="px-5 py-3">
                  {lead.client_id ? (
                    <Link
                      href={`/clientes/${lead.client_id}`}
                      className="whitespace-nowrap text-xs font-semibold text-blue hover:underline"
                    >
                      {clientName.get(lead.client_id) ?? "Ver cliente"} →
                    </Link>
                  ) : isOwner ? (
                    <ConvertLeadButton
                      lead={{
                        id: lead.id,
                        name: lead.name,
                        phone: lead.phone,
                        email: lead.email,
                        company: lead.company,
                        marketplaces: lead.marketplaces,
                      }}
                    />
                  ) : (
                    <span className="text-xs text-[#94A0BD]">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  {isOwner && (
                    <DeleteLeadButton lead={{ id: lead.id, name: lead.name }} hasPin={hasDeletePin} />
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-[#94A0BD]">
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
