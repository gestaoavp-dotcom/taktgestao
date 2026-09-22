"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret, decryptSecret } from "@/lib/credentials-crypto";

export type CredentialState = { ok: true } | { error: string } | null;

function text(formData: FormData, field: string) {
  const value = String(formData.get(field) ?? "").trim();
  return value || null;
}

/**
 * Saves one access record. The password is encrypted here and nowhere else —
 * the plaintext lives only in this function's scope, and is never returned,
 * revalidated into a page, or written to a log.
 *
 * Left blank while editing, the stored password is kept: the form never
 * receives the current one, so an empty field means "unchanged", not "erase".
 */
export async function saveCredential(
  _prevState: CredentialState,
  formData: FormData,
): Promise<CredentialState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Faça login novamente." };

  const clientId = String(formData.get("client_id"));
  const id = text(formData, "id");
  const storeName = text(formData, "store_name");
  if (!storeName) return { error: "O nome da loja é obrigatório." };

  const password = String(formData.get("password") ?? "");

  // A missing or malformed key must reach the form as a message. Left to
  // throw, it takes the whole page down and says nothing useful.
  let cipher: string | null = null;
  if (password) {
    try {
      cipher = encryptSecret(password);
    } catch (e) {
      return { error: (e as Error).message };
    }
  }

  const fields = {
    client_id: clientId,
    marketplace: text(formData, "marketplace"),
    store_name: storeName,
    label: text(formData, "label"),
    login: text(formData, "login"),
    url: text(formData, "url"),
    notes: text(formData, "notes"),
    updated_at: new Date().toISOString(),
    ...(cipher ? { password_cipher: cipher } : {}),
  };

  const { error } = id
    ? await supabase.from("client_credentials").update(fields).eq("id", id)
    : await supabase
        .from("client_credentials")
        .insert({ ...fields, created_by: auth.user.id });

  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clientId}/informacoes/acessos`);
  return { ok: true };
}

/**
 * Hands one password back, for one click, and records who asked.
 *
 * The listing never carries the ciphertext, so this is the only path from the
 * database to a password — which is what makes the reveal log complete.
 */
export async function revealCredential(
  id: string,
): Promise<{ password: string } | { error: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Faça login novamente." };

  const { data, error } = await supabase
    .from("client_credentials")
    .select("password_cipher")
    .eq("id", id)
    .maybeSingle<{ password_cipher: string | null }>();

  if (error) return { error: error.message };
  if (!data?.password_cipher) return { error: "Esse acesso não tem senha guardada." };

  await supabase
    .from("credential_reveals")
    .insert({ credential_id: id, user_id: auth.user.id });

  try {
    return { password: decryptSecret(data.password_cipher) };
  } catch (e) {
    if ((e as Error).message.includes("CREDENTIALS_KEY")) {
      return { error: (e as Error).message };
    }
    // Either the key changed or the row was altered outside the app. Say so
    // rather than showing whatever the bytes happen to decode to.
    return {
      error:
        "Não consegui decifrar essa senha. Ela foi salva com outra CREDENTIALS_KEY, " +
        "ou o registro foi alterado fora do sistema.",
    };
  }
}

export async function deleteCredential(formData: FormData) {
  const supabase = await createClient();
  const clientId = String(formData.get("client_id"));

  await supabase
    .from("client_credentials")
    .delete()
    .eq("id", String(formData.get("id")));

  revalidatePath(`/clientes/${clientId}/informacoes/acessos`);
}
