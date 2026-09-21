import { createClient } from "@/lib/supabase/server";
import type { ClientAccount, ClientChange } from "@/lib/types";
import { distinctMarketplaces } from "@/lib/marketplaces";
import { ClientChangesTable } from "@/components/client-changes-table";

export default async function ClienteControlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: accounts }, { data: changes }] = await Promise.all([
    supabase
      .from("client_accounts")
      .select("*")
      .eq("client_id", id)
      .order("created_at")
      .returns<ClientAccount[]>(),
    supabase
      .from("client_changes")
      .select("*")
      .eq("client_id", id)
      .order("changed_on", { ascending: false })
      .returns<ClientChange[]>(),
  ]);

  return (
    <ClientChangesTable
      clientId={id}
      changes={changes ?? []}
      accounts={accounts ?? []}
      clientMarketplaces={distinctMarketplaces(accounts ?? [])}
    />
  );
}
