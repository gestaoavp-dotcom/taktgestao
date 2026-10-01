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
 * Who is logged in, asked once per request.
 *
 * `getUser()` is a round trip to the auth server every time it is called, and
 * the layout, this file and a page each used to call it on the way to the same
 * answer — three waits of about 200 ms before any page query had started.
 */
export const currentUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
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
