import "server-only";
import { createClient } from "@supabase/supabase-js";

// The service-role key ignores every row-level rule in the database. Ordinary
// reads and writes never come near it: they go through the user's own session,
// so the rules apply to them. Three jobs need past the rules, and they are the
// whole list:
//
//   * creating a login, which no ordinary session can do
//   * the Mercado Livre OAuth callback, which arrives in the client's browser
//     with no session of ours at all and must write to meli_connections —
//     a table with RLS on and no policy, unreachable any other way
//   * the Mercado Livre sync, which runs from a cron with no user behind it
//
// Four things keep that contained:
//   * "server-only" above — importing this from a client component fails the
//     build rather than shipping the key to a browser
//   * the client is built inside the call, never at module load, so nothing
//     holds it open
//   * the caller proves it is allowed before getting here: a dono checked in
//     the database for the first, a single-use invite for the second, the
//     CRON_SECRET for the third
//   * each of those callers touches only the rows its proof covers
//
// A new caller belongs in this list or it does not belong here.

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // Names the variables this deploy does have. A typo and a missing variable
    // produce the same silence otherwise, and we spent a round on each.
    const seen = Object.keys(process.env)
      .filter((k) => /SUPABASE/i.test(k))
      .sort()
      .join(", ");

    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não chegou neste deploy. " +
        `As variáveis do Supabase que existem aqui são: ${seen || "nenhuma"}. ` +
        "Confira o nome exato na Vercel, em Settings → Environment Variables, " +
        "e refaça o deploy depois de salvar — a Vercel só lê variáveis ao construir.",
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
