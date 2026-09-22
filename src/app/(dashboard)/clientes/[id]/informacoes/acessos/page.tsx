import { createClient } from "@/lib/supabase/server";
import type { ClientCredential } from "@/lib/types";
import { InformacoesSubTabs } from "@/components/informacoes-sub-tabs";
import { ClientCredentialsCard } from "@/components/client-credentials-card";

export default async function ClienteAcessosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Every column except password_cipher: the encrypted password never travels
  // to the browser, not even as ciphertext. Only revealCredential reads it.
  const { data: credentials } = await supabase
    .from("client_credentials")
    .select(
      "id, client_id, marketplace, store_name, label, login, url, notes, has_password, created_at, updated_at",
    )
    .eq("client_id", id)
    .order("store_name")
    .returns<ClientCredential[]>();

  return (
    <div>
      <InformacoesSubTabs clientId={id} />
      <ClientCredentialsCard clientId={id} credentials={credentials ?? []} />
    </div>
  );
}
