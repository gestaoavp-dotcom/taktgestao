"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ImportRow = { date: string; revenue: number; orders: number };

export async function importSalesDaily(input: {
  clientId: string;
  platform: string;
  rows: ImportRow[];
}) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!input.rows.length) {
    return { error: "Nenhuma linha para importar." };
  }

  const { error } = await supabase.from("sales_daily").upsert(
    input.rows.map((row) => ({
      client_id: input.clientId,
      platform: input.platform,
      date: row.date,
      revenue: row.revenue,
      orders_count: row.orders,
      created_by: auth.user?.id,
    })),
    { onConflict: "client_id,platform,date" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/vendas");
  revalidatePath("/");
  return { success: true, count: input.rows.length };
}

export async function deleteSalesDay(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;

  await supabase.from("sales_daily").delete().eq("id", id);

  revalidatePath("/vendas");
  revalidatePath("/");
}
