import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Client, ClientAccount } from "@/lib/types";
import { MARKETPLACES } from "@/lib/marketplaces";
import { ClientTabs } from "@/components/client-tabs";
import { MarketplaceBadge } from "@/components/marketplace-badge";

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

  // One line per store, listing the marketplaces that store sells on, always
  // in the same order so the badges line up between stores.
  const order = MARKETPLACES.map((m) => m.value as string);
  const stores = new Map<string, string[]>();
  for (const account of accounts ?? []) {
    stores.set(account.store_name, [
      ...(stores.get(account.store_name) ?? []),
      account.marketplace,
    ]);
  }
  for (const [name, marketplaces] of stores) {
    stores.set(name, [...marketplaces].sort((a, b) => order.indexOf(a) - order.indexOf(b)));
  }
  if (!stores.size && client.store_name) stores.set(client.store_name, client.marketplaces);

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

        <div className="mt-3 flex flex-col gap-1.5 text-sm text-[#5B647E]">
          {Array.from(stores).map(([name, marketplaces]) => (
            <div key={name} className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 font-semibold text-navy">
                <Store className="h-4 w-4 text-[#94A0BD]" />
                {name}
              </span>
              {marketplaces.map((m) => (
                <MarketplaceBadge key={`${name}-${m}`} marketplace={m} />
              ))}
            </div>
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
