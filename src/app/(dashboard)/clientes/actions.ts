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
  const cnpj = ((formData.get("cnpj") as string) || "").trim();
  const label = ((formData.get("label") as string) || "").trim() || null;
  const marketplaces = formData.getAll("marketplaces") as string[];

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

  // The CNPJ and its lojas are the manager's own pré-cadastro, done right here
  // at creation. Requesting the same info from the client is a separate,
  // later feature — this is only the internal side of it.
  if (cnpj) {
    const { data: cnpjRow } = await supabase
      .from("client_cnpjs")
      .insert({
        client_id: data.id,
        cnpj,
        label,
        created_by: auth.user?.id,
      })
      .select("id")
      .single<{ id: string }>();

    if (cnpjRow && marketplaces.length > 0) {
      await supabase.from("client_accounts").insert(
        marketplaces.map((marketplace) => ({
          client_id: data.id,
          cnpj_id: cnpjRow.id,
          marketplace,
          store_name: label || name,
          created_by: auth.user?.id,
        })),
      );
    }
  }

  revalidatePath("/clientes");
  revalidatePath("/financas");
  return { ok: true, id: data.id };
}

export async function deleteClientRecord(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;

  await supabase.from("clients").delete().eq("id", id);

  revalidatePath("/clientes");
}
