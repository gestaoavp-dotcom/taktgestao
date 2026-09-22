// Encrypts marketplace passwords before they reach the database.
//
// AES-256-GCM, with the key held only in the server environment. GCM also
// authenticates: a ciphertext altered in the database fails to decrypt instead
// of returning plausible nonsense.
//
// This module must never be imported from a client component — the key would
// be bundled and shipped to the browser. Everything here runs inside server
// actions, and the plaintext exists only for the length of one request.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";

function secretKey() {
  const raw = process.env.CREDENTIALS_KEY;
  if (!raw) {
    throw new Error(
      "CREDENTIALS_KEY não está configurada. Gere uma com " +
        "`openssl rand -base64 32` e guarde em .env.local e na Vercel.",
    );
  }

  const bytes = Buffer.from(raw, "base64");
  if (bytes.length !== 32) {
    throw new Error("CREDENTIALS_KEY precisa ser 32 bytes em base64.");
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
