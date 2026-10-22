import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTeam } from "@/lib/profile";
import type {
  Client,
  ClientAccount,
  ClientCnpj,
  ClientFeeChange,
  ClientFile,
  MeliStoreStatus,
} from "@/lib/types";
import { InformacoesSubTabs } from "@/components/informacoes-sub-tabs";
import { ClientRegistrationCard } from "@/components/client-registration-card";
import { ClientBillingCard } from "@/components/client-billing-card";
import { ClientAccountsCard } from "@/components/client-accounts-card";
import { ClientFilesCard } from "@/components/client-files-card";
import { ClientFeeHistoryCard } from "@/components/client-fee-history-card";
import { ClientMeliCard } from "@/components/client-meli-card";

export default async function ClienteInformacoesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // The middleware turns a client away from here, and so does this: a page
  // that holds what the client pays and which stores the agency operates
  // should not depend on one redirect being right.
  if (!(await isTeam())) notFound();

  const supabase = await createClient();

  const [
    { data: client },
    { data: accounts },
    { data: cnpjs },
    { data: feeChanges },
    { data: files },
    { data: meliStores },
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
    // A function, not a table read: meli_connections denies everyone through
    // PostgREST, and this returns the store's situation without the tokens
    // being nameable in the first place.
    supabase.rpc("meli_connections_for_client", { p_client_id: id }),
  ]);

  if (!client) return null;

  return (
    <div>
      <InformacoesSubTabs clientId={id} />

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

        <ClientMeliCard
          clientId={id}
          stores={(meliStores ?? []) as MeliStoreStatus[]}
        />

        <ClientFilesCard clientId={id} files={files ?? []} />

        <ClientFeeHistoryCard cnpjs={cnpjs ?? []} feeChanges={feeChanges ?? []} />
      </div>
    </div>
  );
}
