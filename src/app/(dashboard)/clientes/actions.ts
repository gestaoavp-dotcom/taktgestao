"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CreateClientState = { ok: true } | { error: string } | null;

export async function createClientRecord(
  _prevState: CreateClientState,
  formData: FormData,
): Promise<CreateClientState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const name = formData.get("name") as string;
  const store_name = (formData.get("store_name") as string) || null;
  const marketplaces = formData.getAll("marketplaces") as string[];
  const contact_phone = (formData.get("contact_phone") as string) || null;

  const { error } = await supabase.from("clients").insert({
    name,
    store_name,
    marketplaces,
    contact_phone,
    created_by: auth.user?.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clientes");
  return { ok: true };
}

export async function deleteClientRecord(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;

  await supabase.from("clients").delete().eq("id", id);

  revalidatePath("/clientes");
}
