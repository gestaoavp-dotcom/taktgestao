import { createClient } from "@/lib/supabase/server";
import type { Client, ClientAccount, ClientFile } from "@/lib/types";
import { ClientContactCard } from "@/components/client-contact-card";
import { ClientBillingCard } from "@/components/client-billing-card";
import { ClientAccountsCard } from "@/components/client-accounts-card";
import { ClientFilesCard } from "@/components/client-files-card";

export default async function ClienteInformacoesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: accounts }, { data: files }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle<Client>(),
    supabase
      .from("client_accounts")
      .select("*")
      .eq("client_id", id)
      .order("created_at")
      .returns<ClientAccount[]>(),
    supabase
      .from("client_files")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .returns<ClientFile[]>(),
  ]);

  if (!client) return null;

  return (
    <div className="flex flex-col gap-5">
      <ClientContactCard client={client} />

      <div className="grid grid-cols-3 gap-5">
        <ClientBillingCard clientId={id} accounts={accounts ?? []} />
        <div className="col-span-2">
          <ClientAccountsCard clientId={id} accounts={accounts ?? []} />
        </div>
      </div>

      <ClientFilesCard clientId={id} files={files ?? []} />
    </div>
  );
}
