"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CreateClientState = { ok: true; id: string } | { error: string } | null;

export async function createClientRecord(
  _prevState: CreateClientState,
  formData: FormData,
): Promise<CreateClientState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const name = formData.get("name") as string;
  const contact_phone = (formData.get("contact_phone") as string) || null;

  const { data, error } = await supabase
    .from("clients")
    .insert({
      name,
      contact_phone,
      created_by: auth.user?.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clientes");
  return { ok: true, id: data.id };
}

export async function deleteClientRecord(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;

  await supabase.from("clients").delete().eq("id", id);

  revalidatePath("/clientes");
}
