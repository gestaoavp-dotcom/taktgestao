import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A client's first CNPJ takes the stores that have none: until then there was
 * nothing to bind them to, and leaving them loose splits the client in two in
 * every view that groups by CNPJ. With several CNPJs already, where a loose
 * store belongs is a choice, not a default — that stays manual.
 */
export async function linkLooseStoresToFirstCnpj(
  supabase: SupabaseClient,
  clientId: string,
  cnpjId: string,
) {
  const { count } = await supabase
    .from("client_cnpjs")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);
  if (count !== 1) return;

  await supabase
    .from("client_accounts")
    .update({ cnpj_id: cnpjId })
    .eq("client_id", clientId)
    .is("cnpj_id", null);
}
