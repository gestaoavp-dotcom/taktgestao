import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Client, ClientAccount } from "@/lib/types";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { ClientTabs } from "@/components/client-tabs";

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: accounts }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle<Client>(),
    supabase
      .from("client_accounts")
      .select("*")
      .eq("client_id", id)
      .order("created_at")
      .returns<ClientAccount[]>(),
  ]);

  if (!client) notFound();

  const storeNames = accounts?.length
    ? Array.from(new Set(accounts.map((a) => a.store_name)))
    : client.store_name
      ? [client.store_name]
      : [];

  return (
    <div>
      <Link
        href="/clientes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#5B647E] transition-colors hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" />
        Clientes
      </Link>

      <header className="rounded-t-lg bg-white px-6 pt-6 shadow-sm">
        <h1 className="text-2xl font-bold text-navy">{client.name}</h1>

        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#5B647E]">
          {storeNames.map((name) => (
            <span key={name} className="flex items-center gap-1.5">
              <Store className="h-4 w-4 text-[#94A0BD]" />
              {name}
            </span>
          ))}
          {client.contact_phone && (
            <span className="flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-[#94A0BD]" />
              {client.contact_phone}
            </span>
          )}
          {client.marketplaces.map((m) => (
            <span
              key={m}
              className="rounded-full bg-blue/10 px-2.5 py-0.5 text-xs font-semibold text-blue"
            >
              {MARKETPLACE_LABEL[m] ?? m}
            </span>
          ))}
        </div>

        <div className="mt-5">
          <ClientTabs clientId={client.id} />
        </div>
      </header>

      <div className="mt-5">{children}</div>
    </div>
  );
}
