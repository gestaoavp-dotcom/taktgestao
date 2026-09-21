import { createClient } from "@/lib/supabase/server";
import type {
  Client,
  ClientAccount,
  ClientCnpj,
  ClientFeeChange,
  ClientFile,
} from "@/lib/types";
import { ClientRegistrationCard } from "@/components/client-registration-card";
import { ClientBillingCard } from "@/components/client-billing-card";
import { ClientAccountsCard } from "@/components/client-accounts-card";
import { ClientFilesCard } from "@/components/client-files-card";
import { ClientFeeHistoryCard } from "@/components/client-fee-history-card";

export default async function ClienteInformacoesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: client },
    { data: accounts },
    { data: cnpjs },
    { data: feeChanges },
    { data: files },
  ] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle<Client>(),
    supabase
      .from("client_accounts")
      .select("*")
      .eq("client_id", id)
      .order("created_at")
      .returns<ClientAccount[]>(),
    supabase
      .from("client_cnpjs")
      .select("*")
      .eq("client_id", id)
      .order("created_at")
      .returns<ClientCnpj[]>(),
    supabase
      .from("client_fee_changes")
      .select("*")
      .eq("client_id", id)
      .order("effective_on", { ascending: false })
      .returns<ClientFeeChange[]>(),
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
      <ClientRegistrationCard client={client} />

      <div className="grid grid-cols-2 gap-5">
        <ClientBillingCard
          clientId={id}
          cnpjs={cnpjs ?? []}
          accounts={accounts ?? []}
        />
        <ClientAccountsCard
          clientId={id}
          accounts={accounts ?? []}
          cnpjs={cnpjs ?? []}
        />
      </div>

      <ClientFilesCard clientId={id} files={files ?? []} />

      <ClientFeeHistoryCard cnpjs={cnpjs ?? []} feeChanges={feeChanges ?? []} />
    </div>
  );
}
