import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Client, ClientAccount, ClientFile, ClientUpdate } from "@/lib/types";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { ClientBillingCard } from "@/components/client-billing-card";
import { ClientAccountsCard } from "@/components/client-accounts-card";
import { ClientFilesCard } from "@/components/client-files-card";
import { ClientHistoryCard } from "@/components/client-history-card";

export default async function ClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle<Client>();

  if (!client) notFound();

  const [{ data: accounts }, { data: updates }, { data: files }] = await Promise.all([
    supabase
      .from("client_accounts")
      .select("*")
      .eq("client_id", id)
      .order("created_at")
      .returns<ClientAccount[]>(),
    supabase
      .from("client_updates")
      .select("*")
      .eq("client_id", id)
      .order("happened_on", { ascending: false })
      .returns<ClientUpdate[]>(),
    supabase
      .from("client_files")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .returns<ClientFile[]>(),
  ]);

  return (
    <div>
      <Link
        href="/clientes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#5B647E] transition-colors hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" />
        Clientes
      </Link>

      <header className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-navy">{client.name}</h1>

        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#5B647E]">
          {client.store_name && (
            <span className="flex items-center gap-1.5">
              <Store className="h-4 w-4 text-[#94A0BD]" />
              {client.store_name}
            </span>
          )}
          {client.contact_phone && (
            <span className="flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-[#94A0BD]" />
              {client.contact_phone}
            </span>
          )}
        </div>

        {client.marketplaces.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {client.marketplaces.map((m) => (
              <span
                key={m}
                className="rounded-full bg-blue/10 px-2.5 py-0.5 text-xs font-semibold text-blue"
              >
                {MARKETPLACE_LABEL[m] ?? m}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="grid grid-cols-3 gap-5">
        <ClientBillingCard client={client} />
        <div className="col-span-2">
          <ClientAccountsCard clientId={client.id} accounts={accounts ?? []} />
        </div>

        <ClientFilesCard clientId={client.id} files={files ?? []} />
        <div className="col-span-2">
          <ClientHistoryCard clientId={client.id} updates={updates ?? []} />
        </div>
      </div>
    </div>
  );
}
