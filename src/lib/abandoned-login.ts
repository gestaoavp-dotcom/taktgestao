import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The id of the login holding this e-mail, when that login reaches nothing:
 * no profile, or a client-level profile bound to no client (what deleting a
 * client used to leave behind, and what a sign-up made outside the app ends
 * as). Null when the e-mail is free or belongs to a login in use.
 *
 * Callers delete such a login and make a fresh one rather than reuse it:
 * whoever made it may know its password.
 */
export async function findAbandonedLogin(admin: SupabaseClient, email: string) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("role, client_id")
    .eq("id", user.id)
    .maybeSingle<{ role: string; client_id: string | null }>();

  const reachesNothing = !profile || (profile.role === "cliente" && !profile.client_id);
  return reachesNothing ? user.id : null;
}
