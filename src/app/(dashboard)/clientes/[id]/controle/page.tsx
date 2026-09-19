import { createClient } from "@/lib/supabase/server";
import type { ClientChange } from "@/lib/types";
import { ClientChangesTable } from "@/components/client-changes-table";

export default async function ClienteControlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: changes } = await supabase
    .from("client_changes")
    .select("*")
    .eq("client_id", id)
    .order("changed_on", { ascending: false })
    .returns<ClientChange[]>();

  return <ClientChangesTable clientId={id} changes={changes ?? []} />;
}
