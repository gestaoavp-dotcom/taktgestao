"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateLeadStatus(formData: FormData) {
  const supabase = await createClient();

  await supabase
    .from("leads")
    .update({ status: formData.get("status") as string })
    .eq("id", formData.get("id") as string);

  revalidatePath("/leads");
}

export type DeleteLeadState = { ok: true } | { error: string } | null;

/**
 * Deletes a lead for good. The admin's alone, and only with its PIN — the
 * same one that deletes a client, created here the first time if it has none.
 * A lead that became a client goes without touching the client.
 */
export async function deleteLead(
  _prevState: DeleteLeadState,
  formData: FormData,
): Promise<DeleteLeadState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Faça login novamente." };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle<{ role: string }>();
  if (me?.role !== "dono") return { error: "Só o admin pode apagar leads." };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { authorizeWithPin } = await import("@/lib/admin-pin");
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const problem = await authorizeWithPin(admin, auth.user.id, formData);
  if (problem) return { error: problem };

  const { error } = await supabase.from("leads").delete().eq("id", formData.get("id") as string);
  if (error) return { error: error.message };

  revalidatePath("/leads");
  return { ok: true };
}

export type LeadEmailState = { ok: true } | { error: string } | null;

/** The lead's main e-mail, correctable by the team before it is converted. */
export async function updateLeadEmail(
  _prevState: LeadEmailState,
  formData: FormData,
): Promise<LeadEmailState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "E-mail inválido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ email })
    .eq("id", formData.get("id") as string);
  if (error) return { error: error.message };

  revalidatePath("/leads");
  return { ok: true };
}
