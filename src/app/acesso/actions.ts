"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Spends the one-time token from the access link and signs the client in.
 *
 * Only on a button press, never on page load: mail providers open links in
 * advance to scan them, and a token spent on load would be gone before the
 * client ever clicked.
 */
export async function redeemAccessLink(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  if (!tokenHash) redirect("/acesso?erro=1");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
  if (error) redirect("/acesso?erro=1");

  // A login that came in by link has no password yet; the middleware keeps it
  // on this page until it has chosen one, then it goes on to /boas-vindas.
  redirect("/trocar-senha");
}
