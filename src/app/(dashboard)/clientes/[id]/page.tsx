import { createClient } from "@/lib/supabase/server";
import type { Client, ClientAccount, ClientFile, ClientUpdate } from "@/lib/types";
import { ClientBillingCard } from "@/components/client-billing-card";
import { ClientAccountsCard } from "@/components/client-accounts-card";
import { ClientFilesCard } from "@/components/client-files-card";
import { ClientHistoryCard } from "@/components/client-history-card";

export default async function ClienteResumoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: accounts }, { data: updates }, { data: files }] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", id).maybeSingle<Client>(),
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

  if (!client) return null;

  return (
    <div className="grid grid-cols-3 gap-5">
      <ClientBillingCard client={client} />
      <div className="col-span-2">
        <ClientAccountsCard clientId={id} accounts={accounts ?? []} />
      </div>

      <ClientFilesCard clientId={id} files={files ?? []} />
      <div className="col-span-2">
        <ClientHistoryCard clientId={id} updates={updates ?? []} />
      </div>
    </div>
  );
}
