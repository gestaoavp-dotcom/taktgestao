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

export async function deleteLead(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("leads").delete().eq("id", formData.get("id") as string);
  revalidatePath("/leads");
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
