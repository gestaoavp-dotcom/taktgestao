// Encrypts marketplace passwords before they reach the database.
//
// AES-256-GCM, with the key held only in the server environment. GCM also
// authenticates: a ciphertext altered in the database fails to decrypt instead
// of returning plausible nonsense.
//
// This module must never be imported from a client component — the key would
// be bundled and shipped to the browser. Everything here runs inside server
// actions, and the plaintext exists only for the length of one request.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

/**
 * Takes the key as a person would paste it.
 *
 * A dashboard field is filled by hand, and the three things that reliably come
 * along — the variable name from a copied `NAME=value` line, quotes from a
 * shell, a trailing newline — are unambiguous and worth simply accepting. The
 * alternative is a deploy that looks configured and refuses every password.
 */
function normaliseKey(raw: string) {
  return raw
    .trim()
    .replace(/^CREDENTIALS_KEY\s*=\s*/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

function secretKey() {
  const raw = process.env.CREDENTIALS_KEY;
  if (!raw) {
    throw new Error(
      "CREDENTIALS_KEY não está configurada. Gere uma com " +
        "`openssl rand -base64 32` e guarde em .env.local e na Vercel.",
    );
  }

  const bytes = Buffer.from(normaliseKey(raw), "base64");
  if (bytes.length !== 32) {
    throw new Error(
      `CREDENTIALS_KEY inválida: deu ${bytes.length} bytes, precisa de 32. ` +
        "Confira se o valor na Vercel é só a chave, sem o \"CREDENTIALS_KEY=\" " +
        "na frente e sem espaço ou quebra de linha no fim.",
    );
  }
  return bytes;
}

/** Returns `v1.<iv>.<tag>.<ciphertext>`, all base64. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);

  return [
    VERSION,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    body.toString("base64"),
  ].join(".");
}

export function decryptSecret(stored: string): string {
  const [version, iv, tag, body] = stored.split(".");
  if (version !== VERSION || !iv || !tag || !body) {
    throw new Error("Senha guardada em formato desconhecido.");
  }

  const decipher = createDecipheriv("aes-256-gcm", secretKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(body, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * What the running server makes of the key, without throwing and without
 * revealing it. Lets a page say "the deploy has no key" instead of leaving
 * that to be discovered when someone tries to save.
 */
export function keyStatus(): { ok: true } | { ok: false; reason: string } {
  const raw = process.env.CREDENTIALS_KEY;
  if (!raw) {
    return {
      ok: false,
      reason:
        "A CREDENTIALS_KEY não chegou neste deploy. Confira se a variável existe no " +
        "ambiente certo na Vercel e refaça o deploy — a Vercel só lê variáveis ao construir.",
    };
  }

  const bytes = Buffer.from(normaliseKey(raw), "base64").length;
  if (bytes !== 32) {
    return {
      ok: false,
      reason:
        `A CREDENTIALS_KEY deste deploy tem ${bytes} bytes e precisa de 32. ` +
        'O valor na Vercel deve ser só a chave — sem "CREDENTIALS_KEY=" na frente, ' +
        "sem aspas e sem espaço ou quebra de linha.",
    };
  }

  return { ok: true };
}

/**
 * A short fingerprint of the key this deploy is using.
 *
 * Eight hex characters of its SHA-256: enough to tell one key from another at
 * a glance, useless for reconstructing it. Exists because a rotation can only
 * be confirmed by comparing the key in two places, and the key itself must not
 * travel between them.
 */
export function keyFingerprint(): string | null {
  const raw = process.env.CREDENTIALS_KEY;
  if (!raw) return null;

  const bytes = Buffer.from(normaliseKey(raw), "base64");
  if (bytes.length !== 32) return null;

  return createHash("sha256").update(bytes).digest("hex").slice(0, 8);
}
