import "server-only";
import { createClient } from "@supabase/supabase-js";

// The service-role key ignores every row-level rule in the database. It exists
// here for one job: creating a login, which no ordinary session can do.
//
// Three things keep that contained:
//   * "server-only" above — importing this from a client component fails the
//     build rather than shipping the key to a browser
//   * the client is built inside the call, never at module load, so nothing
//     holds it open
//   * every caller checks the signed-in user is a dono first, in the database,
//     before getting here
//
// Nothing else in the app uses it. Reads and writes go through the user's own
// session, so the rules apply to them.

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
