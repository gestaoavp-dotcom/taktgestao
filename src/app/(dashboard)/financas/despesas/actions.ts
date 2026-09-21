"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ExpenseState = { ok: true } | { error: string } | null;

export async function addExpense(
  _prevState: ExpenseState,
  formData: FormData,
): Promise<ExpenseState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { error } = await supabase.from("finance_entries").insert({
    type: "expense",
    description: formData.get("description") as string,
    amount: Number(String(formData.get("amount")).replace(",", ".")),
    due_date: (formData.get("due_date") as string) || null,
    status: "pending",
    created_by: auth.user?.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/financas/despesas");
  return { ok: true };
}

export async function toggleExpenseStatus(formData: FormData) {
  const supabase = await createClient();

  await supabase
    .from("finance_entries")
    .update({ status: formData.get("status") as string })
    .eq("id", formData.get("id") as string);

  revalidatePath("/financas/despesas");
}

export async function deleteExpense(formData: FormData) {
  const supabase = await createClient();

  await supabase.from("finance_entries").delete().eq("id", formData.get("id") as string);

  revalidatePath("/financas/despesas");
}
