"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createFinanceEntry(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const type = formData.get("type") as string;
  const description = formData.get("description") as string;
  const amount = Number(formData.get("amount"));
  const client_id = (formData.get("client_id") as string) || null;
  const due_date = (formData.get("due_date") as string) || null;

  await supabase.from("finance_entries").insert({
    type,
    description,
    amount,
    client_id,
    due_date,
    created_by: auth.user?.id,
  });

  revalidatePath("/financas");
}

export async function toggleFinanceEntryStatus(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;

  await supabase
    .from("finance_entries")
    .update({
      status,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  revalidatePath("/financas");
}

export async function deleteFinanceEntry(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;

  await supabase.from("finance_entries").delete().eq("id", id);

  revalidatePath("/financas");
}
