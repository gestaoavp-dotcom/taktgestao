import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isTeam } from "@/lib/profile";
import type { ClientAccount } from "@/lib/types";
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
  const team = await isTeam();

  const [{ data: client }, { data: accounts }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .eq("id", id)
      .maybeSingle<{ id: string; name: string }>(),
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

  return (
    <div>
      {/* A client has one folder and no list to go back to. */}
      {team && (
        <Link
          href="/clientes"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Clientes
        </Link>
      )}

      <header className="rounded-t-lg bg-panel px-6 pt-6 shadow-sm">
        <h1 className="text-2xl font-bold text-ink">{client.name}</h1>

        <div className="mt-3 flex flex-col gap-1.5 text-sm text-ink-2">
          {Array.from(stores).map(([name, marketplaces]) => (
            <div key={name} className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 font-semibold text-ink">
                <Store className="h-4 w-4 text-ink-3" />
                {name}
              </span>
              {marketplaces.map((m) => (
                <MarketplaceBadge key={`${name}-${m}`} marketplace={m} />
              ))}
            </div>
          ))}
        </div>

        {/* For a client these same sections are the sidebar, so the strip
            would repeat them. The team keeps it: a folder is one of many. */}
        {team ? (
          <div className="mt-5">
            <ClientTabs clientId={client.id} team={team} />
          </div>
        ) : (
          <div className="h-6" />
        )}
      </header>

      <div className="mt-5">{children}</div>
    </div>
  );
}
