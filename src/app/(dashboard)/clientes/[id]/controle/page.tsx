import { createClient } from "@/lib/supabase/server";
import type { Client, ClientChange } from "@/lib/types";
import { ClientChangesTable } from "@/components/client-changes-table";

export default async function ClienteControlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: changes }] = await Promise.all([
    supabase.from("clients").select("marketplaces").eq("id", id).maybeSingle<Pick<Client, "marketplaces">>(),
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
      clientMarketplaces={client?.marketplaces ?? []}
    />
  );
}
