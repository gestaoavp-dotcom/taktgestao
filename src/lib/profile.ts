import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// Who is looking, for the parts of the interface that differ by level.
//
// The database rules are what keep a client out of other people's data; this
// is what keeps the screen from offering them tools they cannot use — an
// import button that will be refused, a tab of the agency's own finances.
//
// Cached per request, so a layout, a page and a tab bar asking the same
// question cost one query between them.

/**
 * Who is logged in, asked once per request and answered without leaving the
 * server.
 *
 * The token is signed with an asymmetric key, so getClaims checks the
 * signature against the cached public key — where getUser asks the auth
 * server, which measured 130–145 ms. This answer decides what the interface
 * offers, not what the database hands over: every query still carries the
 * token and still meets the row-level rules, and the server actions that
 * write re-read the caller's level with getUser before they do.
 */
export const currentUser = cache(async (): Promise<{ id: string; email?: string } | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return null;
  return { id: data.claims.sub, email: data.claims.email };
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await currentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return data;
});

/** The agency. A client login is the only thing this is false for. */
export async function isTeam() {
  const profile = await getProfile();
  return profile?.role === "dono" || profile?.role === "operador";
}
