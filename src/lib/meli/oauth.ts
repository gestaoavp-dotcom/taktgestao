// The OAuth half of the Mercado Livre connection: building the authorisation
// URL, trading the code for tokens, and renewing them.
//
// Nothing here touches the database. It is the protocol and only the protocol,
// so the rules Mercado Livre imposes — PKCE, a single-use refresh token, an
// access token that lasts six hours — stay in one place and the storage layer
// in another.

import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { SITE_URL } from "@/lib/site";

export type MeliTokens = {
  access_token: string;
  token_type: string;
  /** Seconds. Normally 21600 — six hours. */
  expires_in: number;
  scope?: string;
  user_id: number;
  refresh_token?: string;
};

/**
 * Mercado Livre says no to the whole exchange, and the reason matters.
 *
 * `invalid_grant` is the one that means the client's side changed — they
 * revoked the app, changed their password, or the refresh token sat unused
 * long enough to lapse. Every other failure is ours: wrong client secret, a
 * redirect URI that doesn't match the registered one, Mercado Livre being
 * down. Telling them apart is what keeps the app from marking a healthy
 * account as needing the client's attention because our own deploy is
 * misconfigured.
 */
export class MeliOAuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "MeliOAuthError";
  }

  get needsReauthorisation() {
    return this.code === "invalid_grant";
  }
}

const AUTH_URL =
  process.env.ML_AUTH_URL ?? "https://auth.mercadolivre.com.br/authorization";
const API_URL = (process.env.ML_API_URL ?? "https://api.mercadolibre.com").replace(/\/+$/, "");

export function meliApiUrl() {
  return API_URL;
}

/**
 * Has to be character-for-character the URI registered in the Mercado Livre
 * application, https included and no trailing slash, or the exchange fails
 * with a message that doesn't say so.
 */
export function redirectUri() {
  return process.env.ML_REDIRECT_URI ?? `${SITE_URL}/api/meli/callback`;
}

function credentials() {
  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "ML_CLIENT_ID e ML_CLIENT_SECRET não chegaram neste deploy. " +
        "Crie o aplicativo em developers.mercadolivre.com.br e guarde os dois na Vercel.",
    );
  }
  return { clientId, clientSecret };
}

/** Whether this deploy can connect at all, for a page to say so up front. */
export function meliConfigured() {
  return Boolean(process.env.ML_CLIENT_ID && process.env.ML_CLIENT_SECRET);
}

export function randomToken(bytes = 24) {
  return randomBytes(bytes).toString("base64url");
}

/**
 * PKCE: the verifier stays with us, only its hash travels to Mercado Livre.
 * Without it, anyone who intercepts the redirect holds a usable code.
 */
export function pkcePair() {
  const verifier = randomBytes(48).toString("base64url");
  return {
    verifier,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
  };
}

export function authorizationUrl(state: string, codeChallenge?: string) {
  const { clientId } = credentials();
  const url = new URL(AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("state", state);
  if (codeChallenge) {
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
  }
  return url.toString();
}

async function callTokenEndpoint(body: Record<string, string>): Promise<MeliTokens> {
  const response = await fetch(`${API_URL}/oauth/token`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    // In the body, not the query string: a refresh token in a URL is a secret
    // written into every log between here and Mercado Livre.
    body: new URLSearchParams(body).toString(),
    signal: AbortSignal.timeout(15_000),
  });

  const text = await response.text();
  let json: Record<string, string> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    // Not JSON — the status and the first of the body is all we get.
  }

  if (!response.ok) {
    throw new MeliOAuthError(
      `Mercado Livre recusou o /oauth/token (${response.status}): ` +
        (json.message ?? json.error_description ?? text.slice(0, 200)),
      response.status,
      json.error ?? json.code,
    );
  }
  if (!json.access_token) {
    throw new MeliOAuthError("Resposta do /oauth/token sem access_token.", response.status);
  }
  return json as unknown as MeliTokens;
}

export function exchangeCode(code: string, codeVerifier?: string | null) {
  const { clientId, clientSecret } = credentials();
  const body: Record<string, string> = {
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri(),
  };
  if (codeVerifier) body.code_verifier = codeVerifier;
  return callTokenEndpoint(body);
}

export function refreshTokens(refreshToken: string) {
  const { clientId, clientSecret } = credentials();
  return callTokenEndpoint({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
}

/** Who the access token belongs to, asked once at the end of the handshake. */
export async function fetchSeller(accessToken: string): Promise<{
  id: number;
  nickname?: string;
  site_id?: string;
}> {
  const response = await fetch(`${API_URL}/users/me`, {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new MeliOAuthError(`Não foi possível ler /users/me (${response.status}).`, response.status);
  }
  return response.json();
}
