// Where a client's Mercado Livre tokens live, and the only code that reads
// them. Everything here runs with the service role, because meli_connections
// has RLS on and no policy — see 0045_meli_connections.sql for why.

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret, encryptSecret } from "@/lib/credentials-crypto";
import { SITE_URL } from "@/lib/site";
import {
  authorizationUrl,
  exchangeCode,
  fetchSeller,
  MeliOAuthError,
  pkcePair,
  randomToken,
  refreshTokens,
} from "./oauth";

/** Shown to the client or the team, so it says what to do next. */
export class MeliConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MeliConnectionError";
  }
}

const INVITE_DAYS = 7;
/** Renew this long before the token actually lapses. */
const RENEW_MARGIN_MS = 10 * 60 * 1000;
/** How long one worker owns a renewal before another may try. */
const LEASE_MS = 60 * 1000;

export type MeliConnection = {
  id: string;
  client_id: string;
  account_id: string;
  seller_id: string | null;
  nickname: string | null;
  site_id: string | null;
  status: "ativa" | "reautorizar" | "desativada";
};

const PUBLIC_COLUMNS = "id, client_id, account_id, seller_id, nickname, site_id, status";

/**
 * A single-use link for one store, good for a week.
 *
 * Nothing about the client's Mercado Livre account is known yet — that only
 * arrives when they authorise. The link carries the store it is for, so the
 * team can send two links to a client with two shops and they cannot be
 * crossed.
 */
export async function createInvite(
  clientId: string,
  accountId: string,
  createdBy: string | null,
): Promise<{ link: string; expiresAt: string }> {
  const db = createAdminClient();
  const token = randomToken();
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString();

  const { error } = await db.from("meli_invites").insert({
    token,
    client_id: clientId,
    account_id: accountId,
    expires_at: expiresAt,
    created_by: createdBy,
  });
  if (error) throw new MeliConnectionError(error.message);

  return { link: `${SITE_URL}/api/meli/conectar/${token}`, expiresAt };
}

/**
 * The client opened the link. Mint the state and the PKCE pair now, not when
 * the invite was made: a link that is never clicked should leave no
 * half-started exchange behind, and a link opened twice should get a fresh
 * pair rather than replay the first.
 */
export async function startConnection(token: string): Promise<string> {
  const db = createAdminClient();
  const { data: invite } = await db
    .from("meli_invites")
    .select("token")
    .eq("token", token)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!invite) {
    throw new MeliConnectionError("Link de conexão inválido, expirado ou já utilizado.");
  }

  const state = randomToken();
  const { verifier, challenge } = pkcePair();
  const { error } = await db
    .from("meli_invites")
    .update({ state, code_verifier: verifier })
    .eq("token", token);
  if (error) throw new MeliConnectionError(error.message);

  return authorizationUrl(state, challenge);
}

/**
 * Mercado Livre sent the client back with a code.
 *
 * The invite is claimed before the exchange, so a double click or an F5 cannot
 * spend the same code twice — and released again if the exchange fails for a
 * reason that isn't the client's, because otherwise a momentary blip at
 * Mercado Livre burns the link and the client has to be chased for a new one.
 */
export async function finishConnection(state: string, code: string): Promise<MeliConnection> {
  const db = createAdminClient();

  const { data: invite } = await db
    .from("meli_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("state", state)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("token, client_id, account_id, code_verifier")
    .maybeSingle();

  if (!invite) {
    throw new MeliConnectionError(
      "Este link já foi usado ou expirou. Se você acabou de autorizar, a conta já está " +
        "conectada; se não, peça um link novo à equipe.",
    );
  }

  let tokens;
  try {
    tokens = await exchangeCode(code, invite.code_verifier);
  } catch (error) {
    await db.from("meli_invites").update({ used_at: null }).eq("token", invite.token);
    throw error;
  }

  if (!tokens.refresh_token) {
    throw new MeliConnectionError(
      "O Mercado Livre não devolveu o refresh token. Ative o escopo offline_access no " +
        "aplicativo e gere um link novo.",
    );
  }

  const seller = await fetchSeller(tokens.access_token);
  const sellerId = String(tokens.user_id ?? seller.id);

  // Reconnecting an existing store has to be the same seller, or a client with
  // two shops signed into the wrong one silently rewires months of history to
  // the other account.
  const { data: existing } = await db
    .from("meli_connections")
    .select("seller_id, nickname")
    .eq("account_id", invite.account_id)
    .maybeSingle();

  if (existing?.seller_id && String(existing.seller_id) !== sellerId) {
    throw new MeliConnectionError(
      `Você entrou com a conta ${seller.nickname ?? sellerId}, mas este link é para ` +
        `reconectar a conta ${existing.nickname ?? "cadastrada"}. Saia do Mercado Livre, ` +
        "entre com a conta certa e abra o link de novo.",
    );
  }

  const { data: saved, error } = await db
    .from("meli_connections")
    .upsert(
      {
        client_id: invite.client_id,
        account_id: invite.account_id,
        seller_id: sellerId,
        nickname: seller.nickname ?? null,
        site_id: seller.site_id ?? null,
        access_token_cipher: encryptSecret(tokens.access_token),
        refresh_token_cipher: encryptSecret(tokens.refresh_token),
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        status: "ativa",
        last_error: null,
        renewing_until: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "account_id" },
    )
    .select(PUBLIC_COLUMNS)
    .single();

  if (error) throw new MeliConnectionError(error.message);
  return saved as MeliConnection;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A usable access token for a connection, renewed if it is close to lapsing.
 *
 * `rejectedToken` is for the other way a token dies: Mercado Livre answering
 * 401 before the expiry we were told about, which happens when the seller
 * changes their password. Passing the token that was refused renews it unless
 * somebody else already has.
 */
export async function getAccessToken(
  connectionId: string,
  options: { rejectedToken?: string; force?: boolean } = {},
): Promise<string> {
  const db = createAdminClient();

  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: row } = await db
      .from("meli_connections")
      .select("access_token_cipher, expires_at, status")
      .eq("id", connectionId)
      .maybeSingle<{
        access_token_cipher: string | null;
        expires_at: string | null;
        status: string;
      }>();

    assertUsable(row);

    const current = row.access_token_cipher ? decryptSecret(row.access_token_cipher) : null;
    const fresh =
      current &&
      row.expires_at &&
      new Date(row.expires_at).getTime() - Date.now() > RENEW_MARGIN_MS;
    const wasRejected = Boolean(options.rejectedToken) && options.rejectedToken === current;

    if (fresh && !options.force && !wasRejected) return current;

    // The value is quoted: an ISO timestamp carries dots and colons, and
    // PostgREST reads a bare dot as the separator before the value.
    const now = new Date().toISOString();
    const { data: claimed } = await db
      .from("meli_connections")
      .update({ renewing_until: new Date(Date.now() + LEASE_MS).toISOString() })
      .eq("id", connectionId)
      .or(`renewing_until.is.null,renewing_until.lt."${now}"`)
      .select("refresh_token_cipher")
      .maybeSingle<{ refresh_token_cipher: string | null }>();

    if (!claimed) {
      // Another worker holds the renewal. Its new token will be in the row
      // shortly, and spending the same single-use refresh token behind its
      // back would get us invalid_grant and mark a healthy account dead.
      await sleep(1500 * (attempt + 1));
      continue;
    }
    if (!claimed.refresh_token_cipher) {
      throw new MeliConnectionError("Esta conta não tem token guardado. Gere um link novo.");
    }

    return renew(db, connectionId, decryptSecret(claimed.refresh_token_cipher));
  }

  throw new MeliConnectionError(
    "Não consegui renovar o acesso a esta conta agora — outra sincronização está no meio " +
      "da renovação. Tente de novo em um minuto.",
  );
}

function assertUsable<T extends { status: string }>(row: T | null): asserts row is T {
  if (!row) throw new MeliConnectionError("Conexão não encontrada.");
  if (row.status === "desativada") throw new MeliConnectionError("Esta conexão foi desativada.");
  if (row.status === "reautorizar") {
    throw new MeliConnectionError(
      "O acesso a esta conta expirou ou foi revogado pelo vendedor. Gere um link novo e " +
        "peça ao cliente para autorizar de novo.",
    );
  }
}

async function renew(
  db: ReturnType<typeof createAdminClient>,
  connectionId: string,
  refreshToken: string,
): Promise<string> {
  let tokens;
  try {
    tokens = await refreshTokens(refreshToken);
  } catch (error) {
    // Only invalid_grant means the client's side changed. A wrong secret or a
    // Mercado Livre outage must not send the team chasing a reauthorisation.
    if (error instanceof MeliOAuthError && error.needsReauthorisation) {
      await db
        .from("meli_connections")
        .update({ status: "reautorizar", last_error: error.message, renewing_until: null })
        .eq("id", connectionId);
    } else {
      await db.from("meli_connections").update({ renewing_until: null }).eq("id", connectionId);
    }
    throw error;
  }

  // Mercado Livre rotates the refresh token on every renewal and the old one
  // stops working the moment this call succeeded. If the write below fails we
  // have a live token that nothing knows about, so the update is scoped only
  // by id and never by status: whatever else changed, these tokens are the
  // current ones. Except deactivation — a client who asked to be removed while
  // this was in flight stays removed.
  const changes: Record<string, string | null> = {
    access_token_cipher: encryptSecret(tokens.access_token),
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    status: "ativa",
    last_error: null,
    renewing_until: null,
    updated_at: new Date().toISOString(),
  };
  // Left out rather than set to null when absent: writing null here would
  // throw away the only way back into the account.
  if (tokens.refresh_token) {
    changes.refresh_token_cipher = encryptSecret(tokens.refresh_token);
  }

  const { error } = await db
    .from("meli_connections")
    .update(changes)
    .eq("id", connectionId)
    .neq("status", "desativada");

  if (error) {
    console.error(`[meli] conexão ${connectionId}: tokens renovados e não gravados`, error.message);
    throw new MeliConnectionError(
      "Renovei o acesso no Mercado Livre mas não consegui gravar. Tente sincronizar de novo.",
    );
  }

  return tokens.access_token;
}

/** Forgets the tokens. The client should also remove the app on their side. */
export async function deactivate(accountId: string): Promise<void> {
  const db = createAdminClient();
  const { error } = await db
    .from("meli_connections")
    .update({
      status: "desativada",
      access_token_cipher: null,
      refresh_token_cipher: null,
      renewing_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", accountId);
  if (error) throw new MeliConnectionError(error.message);
}

/** The connections a sync should visit. Never returns a cipher. */
export async function activeConnections(clientId?: string): Promise<MeliConnection[]> {
  const db = createAdminClient();
  let query = db.from("meli_connections").select(PUBLIC_COLUMNS).eq("status", "ativa");
  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query.order("created_at");
  if (error) throw new MeliConnectionError(error.message);
  return (data ?? []) as MeliConnection[];
}
