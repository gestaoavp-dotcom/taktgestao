"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isTeam } from "@/lib/profile";
import { createInvite, deactivate, MeliConnectionError } from "@/lib/meli/connections";
import { meliConfigured } from "@/lib/meli/oauth";

export type MeliLinkState =
  | { link: string; expiresAt: string }
  | { error: string }
  | null;

/**
 * Makes the one-time link for a client to authorise their Mercado Livre
 * account, and hands it back to the team member to send.
 *
 * It is not sent from here on purpose. Whoever is on the other end of that
 * link can attach a Mercado Livre account to this store, so it goes out the
 * way the team already talks to that client, not to whatever address happens
 * to be on file.
 */
export async function generateMeliLink(
  _prevState: MeliLinkState,
  formData: FormData,
): Promise<MeliLinkState> {
  if (!(await isTeam())) return { error: "Só a equipe gera link de conexão." };
  if (!meliConfigured()) {
    return {
      error:
        "Faltam ML_CLIENT_ID e ML_CLIENT_SECRET neste deploy. Crie o aplicativo em " +
        "developers.mercadolivre.com.br e salve os dois na Vercel.",
    };
  }

  const clientId = String(formData.get("client_id") ?? "");
  const accountId = String(formData.get("account_id") ?? "");
  if (!clientId || !accountId) return { error: "Escolha a loja." };

  // The store has to be this client's, and has to be a Mercado Livre one —
  // the ids arrive from a form, so neither is taken on trust.
  const supabase = await createClient();
  const { data: account } = await supabase
    .from("client_accounts")
    .select("id, marketplace")
    .eq("id", accountId)
    .eq("client_id", clientId)
    .maybeSingle<{ id: string; marketplace: string }>();

  if (!account) return { error: "Loja não encontrada para este cliente." };
  if (account.marketplace !== "mercado_livre") {
    return { error: "Essa loja não é do Mercado Livre." };
  }

  const { data: auth } = await supabase.auth.getUser();

  try {
    const { link, expiresAt } = await createInvite(clientId, accountId, auth.user?.id ?? null);
    revalidatePath(`/clientes/${clientId}/informacoes`);
    return { link, expiresAt };
  } catch (error) {
    if (!(error instanceof MeliConnectionError)) console.error("[meli/link]", error);
    return {
      error:
        error instanceof MeliConnectionError
          ? error.message
          : "Não consegui gerar o link agora.",
    };
  }
}

export type MeliDisconnectState = { ok: true } | { error: string } | null;

export async function disconnectMeli(
  _prevState: MeliDisconnectState,
  formData: FormData,
): Promise<MeliDisconnectState> {
  if (!(await isTeam())) return { error: "Só a equipe desconecta uma conta." };

  const clientId = String(formData.get("client_id") ?? "");
  const accountId = String(formData.get("account_id") ?? "");
  if (!clientId || !accountId) return { error: "Escolha a loja." };

  const supabase = await createClient();
  const { data: account } = await supabase
    .from("client_accounts")
    .select("id")
    .eq("id", accountId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (!account) return { error: "Loja não encontrada para este cliente." };

  try {
    await deactivate(accountId);
    revalidatePath(`/clientes/${clientId}/informacoes`);
    return { ok: true };
  } catch (error) {
    if (!(error instanceof MeliConnectionError)) console.error("[meli/desconectar]", error);
    return { error: "Não consegui desconectar agora." };
  }
}
