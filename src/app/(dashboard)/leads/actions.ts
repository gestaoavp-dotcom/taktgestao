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
