"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayInBrazil } from "@/lib/report-week";

export async function markPaid(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  await supabase.from("client_payments").upsert(
    {
      client_id: formData.get("client_id") as string,
      cnpj_id: formData.get("cnpj_id") as string,
      reference_month: formData.get("reference_month") as string,
      amount: Number(formData.get("amount")),
      due_date: formData.get("due_date") as string,
      paid_on: todayInBrazil(),
      created_by: auth.user?.id,
    },
    { onConflict: "cnpj_id,reference_month" },
  );

  revalidatePath("/financas");
}

export async function unmarkPaid(formData: FormData) {
  const supabase = await createClient();

  await supabase
    .from("client_payments")
    .delete()
    .eq("cnpj_id", formData.get("cnpj_id") as string)
    .eq("reference_month", formData.get("reference_month") as string);

  revalidatePath("/financas");
}
