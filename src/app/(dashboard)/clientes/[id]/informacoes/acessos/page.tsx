import { createClient } from "@/lib/supabase/server";
import type { ClientCredential } from "@/lib/types";
import { InformacoesSubTabs } from "@/components/informacoes-sub-tabs";
import { ClientCredentialsCard } from "@/components/client-credentials-card";
import { ClientPanelInvite } from "@/components/client-panel-invite";
import { getProfile } from "@/lib/profile";
import { keyFingerprint, keyStatus } from "@/lib/credentials-crypto";

export default async function ClienteAcessosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Every column except password_cipher: the encrypted password never travels
  // to the browser, not even as ciphertext. Only revealCredential reads it.
  // The client's own login to this system, if one exists.
  const [me, { data: client }, { data: panelLogin }] = await Promise.all([
    getProfile(),
    supabase.from("clients").select("name").eq("id", id).maybeSingle<{ name: string }>(),
    supabase
      .from("profiles")
      .select("email")
      .eq("client_id", id)
      .eq("role", "cliente")
      .maybeSingle<{ email: string | null }>(),
  ]);

  const { data: credentials } = await supabase
    .from("client_credentials")
    .select(
      "id, client_id, marketplace, store_name, label, login, url, notes, has_password, created_at, updated_at",
    )
    .eq("client_id", id)
    .order("store_name")
    .returns<ClientCredential[]>();

  // Checked here, in the running server, so a misconfigured deploy announces
  // itself on arrival rather than when someone tries to save a password.
  const key = keyStatus();
  const fingerprint = keyFingerprint();

  return (
    <div>
      <InformacoesSubTabs clientId={id} />

      {key.ok && fingerprint && (
        <p className="mb-5 text-[11px] text-[#94A0BD]">
          Chave de criptografia deste deploy:{" "}
          <span className="font-mono font-semibold text-[#5B647E]">{fingerprint}</span>
        </p>
      )}

      {!key.ok && (
        <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong className="font-bold">Senhas não podem ser salvas neste deploy.</strong>{" "}
          {key.reason}
        </p>
      )}
      <div className="flex flex-col gap-5">
        <ClientCredentialsCard clientId={id} credentials={credentials ?? []} />
        <ClientPanelInvite
          clientId={id}
          clientName={client?.name ?? "este cliente"}
          loginEmail={panelLogin?.email ?? null}
          canCreate={me?.role === "dono"}
        />
      </div>
    </div>
  );
}
