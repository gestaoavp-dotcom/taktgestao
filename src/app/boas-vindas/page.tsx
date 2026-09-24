import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { Logo } from "@/components/logo";
import type { Client, ClientAccount, ClientCnpj } from "@/lib/types";

export const metadata: Metadata = {
  title: "Bem-vindo | TAKT Assessoria",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-sm text-[#5B647E]">{label}</span>
      <span className="text-right text-sm font-semibold text-navy">{value}</span>
    </div>
  );
}

// Where a client lands after choosing its own password on first access: what
// the agency registered for it, to check before going in. Read-only — the
// fee and due day are the team's to set.
export default async function BoasVindasPage() {
  const profile = await getProfile();
  if (profile?.role !== "cliente" || !profile.client_id) redirect("/");

  const supabase = await createClient();
  const [{ data: client }, { data: cnpjs }, { data: accounts }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", profile.client_id).maybeSingle<Client>(),
    supabase
      .from("client_cnpjs")
      .select("*")
      .eq("client_id", profile.client_id)
      .order("created_at")
      .returns<ClientCnpj[]>(),
    supabase
      .from("client_accounts")
      .select("*")
      .eq("client_id", profile.client_id)
      .returns<ClientAccount[]>(),
  ]);

  const main = cnpjs?.[0];
  const stores = accounts ?? [];

  return (
    <div className="flex min-h-screen items-start justify-center bg-brand-gray px-4 py-10 sm:items-center">
      <div className="w-full max-w-md rounded-xl border border-navy/10 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <Logo height={36} />
        </div>
        <h1 className="text-xl font-bold text-navy">
          Bem-vindo{client?.name ? `, ${client.name}` : ""}!
        </h1>
        <p className="mb-6 mt-2 text-sm text-[#5B647E]">
          Seu acesso está pronto. Confira os dados que cadastramos para você — se algo
          estiver diferente, é só falar com a equipe TAKT.
        </p>

        <div className="divide-y divide-navy/[.06] border-y border-navy/[.06]">
          <Row label="Empresa" value={client?.name ?? "—"} />
          <Row label="E-mail principal" value={client?.contact_email ?? profile.email ?? "—"} />
          {client?.contact_phone && <Row label="Telefone" value={client.contact_phone} />}
          <Row label="CNPJ principal" value={main?.cnpj ?? "—"} />
          {(cnpjs?.length ?? 0) > 1 && (
            <Row label="Outros CNPJs" value={cnpjs!.slice(1).map((c) => c.cnpj).join(", ")} />
          )}
          <Row
            label="Lojas geridas"
            value={
              stores.length ? (
                <span className="flex flex-wrap justify-end gap-1">
                  {stores.map((s) => (
                    <span
                      key={s.id}
                      className="rounded-full bg-blue/10 px-2 py-0.5 text-[11px] font-semibold text-blue"
                    >
                      {MARKETPLACE_LABEL[s.marketplace] ?? s.marketplace}
                    </span>
                  ))}
                </span>
              ) : (
                "—"
              )
            }
          />
          <Row
            label="Valor acordado"
            value={main?.monthly_fee != null ? formatCurrency(Number(main.monthly_fee)) : "—"}
          />
          <Row
            label="Vencimento"
            value={main?.payment_day ? `Todo dia ${main.payment_day}` : "—"}
          />
        </div>

        <Link
          href="/clientes"
          className="mt-6 flex h-11 items-center justify-center rounded-lg bg-navy text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38]"
        >
          Ir para minha área
        </Link>
      </div>
    </div>
  );
}
