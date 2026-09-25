import { createClient } from "@/lib/supabase/server";
import type { ClientAccount, ClientCnpj } from "@/lib/types";
import { distinctMarketplaces } from "@/lib/marketplaces";
import { getProfile } from "@/lib/profile";
import { ClientsView, type ClientSummary } from "@/components/clients-view";

export default async function ClientesPage() {
  const supabase = await createClient();

  const [{ data: clients }, { data: cnpjs }, { data: accounts }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, contact_phone")
      .order("name")
      .returns<{ id: string; name: string; contact_phone: string | null }[]>(),
    supabase.from("client_cnpjs").select("*").returns<ClientCnpj[]>(),
    supabase.from("client_accounts").select("*").returns<ClientAccount[]>(),
  ]);

  const cnpjsByClient = new Map<string, ClientCnpj[]>();
  for (const cnpj of cnpjs ?? []) {
    cnpjsByClient.set(cnpj.client_id, [...(cnpjsByClient.get(cnpj.client_id) ?? []), cnpj]);
  }

  const accountsByClient = new Map<string, ClientAccount[]>();
  for (const account of accounts ?? []) {
    accountsByClient.set(account.client_id, [
      ...(accountsByClient.get(account.client_id) ?? []),
      account,
    ]);
  }

  // The CNPJ commands what the client is: this list is built from the real
  // stores and CNPJs, not from anything typed once at creation and left to
  // go stale.
  const summaries: ClientSummary[] = (clients ?? []).map((client) => {
    const clientCnpjs = cnpjsByClient.get(client.id) ?? [];
    const clientAccounts = accountsByClient.get(client.id) ?? [];
    const marketplaces = distinctMarketplaces(clientAccounts);

    return {
      id: client.id,
      name: client.name,
      contactPhone: client.contact_phone,
      cnpjCount: clientCnpjs.length,
      storeCount: clientAccounts.length,
      marketplaces,
      searchText: [
        client.name,
        client.contact_phone,
        ...clientCnpjs.flatMap((c) => [c.label, c.cnpj]),
        ...clientAccounts.map((a) => a.store_name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    };
  });

  const profile = await getProfile();
  const isOwner = profile?.role === "dono";
  let hasDeletePin = false;
  if (isOwner) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { hasPin } = await import("@/lib/admin-pin");
    try {
      hasDeletePin = await hasPin(createAdminClient(), profile.id);
    } catch {
      // No service key on this deploy: the delete action reports it when used.
    }
  }

  return (
    <ClientsView
      clients={summaries}
      canManage={isOwner || profile?.role === "operador"}
      canDelete={isOwner}
      hasDeletePin={hasDeletePin}
    />
  );
}
