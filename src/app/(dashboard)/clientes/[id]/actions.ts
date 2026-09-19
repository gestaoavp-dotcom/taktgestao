"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { ok: true } | { error: string } | null;

function toNumber(value: FormDataEntryValue | null) {
  if (!value) return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export async function updateBilling(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const clientId = formData.get("client_id") as string;

  const { error } = await supabase
    .from("clients")
    .update({
      monthly_fee: toNumber(formData.get("monthly_fee")),
      payment_day: toNumber(formData.get("payment_day")),
      payment_method: (formData.get("payment_method") as string) || null,
    })
    .eq("id", clientId);

  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}

export async function updateContact(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const clientId = formData.get("client_id") as string;

  const { error } = await supabase
    .from("clients")
    .update({
      contact_email: (formData.get("contact_email") as string) || null,
      contact_phone: (formData.get("contact_phone") as string) || null,
    })
    .eq("id", clientId);

  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clientId}/informacoes`);
  return { ok: true };
}

export async function addAccount(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const clientId = formData.get("client_id") as string;

  const { error } = await supabase.from("client_accounts").insert({
    client_id: clientId,
    marketplace: formData.get("marketplace") as string,
    store_name: formData.get("store_name") as string,
    cnpj: (formData.get("cnpj") as string) || null,
    created_by: auth.user?.id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}

export async function updateAccount(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const clientId = formData.get("client_id") as string;

  const { error } = await supabase
    .from("client_accounts")
    .update({
      store_name: formData.get("store_name") as string,
      cnpj: (formData.get("cnpj") as string) || null,
    })
    .eq("id", formData.get("id") as string);

  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}

export async function deleteAccount(formData: FormData) {
  const supabase = await createClient();
  const clientId = formData.get("client_id") as string;

  await supabase.from("client_accounts").delete().eq("id", formData.get("id") as string);

  revalidatePath(`/clientes/${clientId}`);
}

export async function addUpdate(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const clientId = formData.get("client_id") as string;

  const { error } = await supabase.from("client_updates").insert({
    client_id: clientId,
    kind: formData.get("kind") as string,
    title: formData.get("title") as string,
    body: (formData.get("body") as string) || null,
    happened_on: (formData.get("happened_on") as string) || undefined,
    created_by: auth.user?.id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}

export async function deleteUpdate(formData: FormData) {
  const supabase = await createClient();
  const clientId = formData.get("client_id") as string;

  await supabase.from("client_updates").delete().eq("id", formData.get("id") as string);

  revalidatePath(`/clientes/${clientId}`);
}

export async function registerFile(input: {
  clientId: string;
  name: string;
  path: string;
  size: number;
}): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { error } = await supabase.from("client_files").insert({
    client_id: input.clientId,
    name: input.name,
    path: input.path,
    size: input.size,
    created_by: auth.user?.id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/clientes/${input.clientId}`);
  return { ok: true };
}

export async function deleteFile(formData: FormData) {
  const supabase = await createClient();
  const clientId = formData.get("client_id") as string;
  const path = formData.get("path") as string;

  await supabase.storage.from("client-files").remove([path]);
  await supabase.from("client_files").delete().eq("id", formData.get("id") as string);

  revalidatePath(`/clientes/${clientId}`);
}

export async function addChange(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const clientId = formData.get("client_id") as string;

  const { error } = await supabase.from("client_changes").insert({
    client_id: clientId,
    changed_on: (formData.get("changed_on") as string) || undefined,
    marketplace: (formData.get("marketplace") as string) || null,
    account_id: (formData.get("account_id") as string) || null,
    category: (formData.get("category") as string) || null,
    description: formData.get("description") as string,
    reason: (formData.get("reason") as string) || null,
    owner: (formData.get("owner") as string) || null,
    status: (formData.get("status") as string) || "aberta",
    closed_on: (formData.get("closed_on") as string) || null,
    goal: (formData.get("goal") as string) || null,
    evidence: (formData.get("evidence") as string) || null,
    created_by: auth.user?.id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clientId}/controle`);
  return { ok: true };
}

export async function updateChange(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const clientId = formData.get("client_id") as string;
  const id = formData.get("id") as string;

  const { error } = await supabase
    .from("client_changes")
    .update({
      changed_on: (formData.get("changed_on") as string) || undefined,
      marketplace: (formData.get("marketplace") as string) || null,
      account_id: (formData.get("account_id") as string) || null,
      category: (formData.get("category") as string) || null,
      description: formData.get("description") as string,
      reason: (formData.get("reason") as string) || null,
      owner: (formData.get("owner") as string) || null,
      status: (formData.get("status") as string) || "aberta",
      closed_on: (formData.get("closed_on") as string) || null,
      goal: (formData.get("goal") as string) || null,
      evidence: (formData.get("evidence") as string) || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clientId}/controle`);
  return { ok: true };
}

export async function updateChangeStatus(formData: FormData) {
  const supabase = await createClient();
  const clientId = formData.get("client_id") as string;
  const status = formData.get("status") as string;

  await supabase
    .from("client_changes")
    .update({
      status,
      closed_on: status === "concluida" ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq("id", formData.get("id") as string);

  revalidatePath(`/clientes/${clientId}/controle`);
}

export async function deleteChange(formData: FormData) {
  const supabase = await createClient();
  const clientId = formData.get("client_id") as string;

  await supabase.from("client_changes").delete().eq("id", formData.get("id") as string);

  revalidatePath(`/clientes/${clientId}/controle`);
}

export async function addLink(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const clientId = formData.get("client_id") as string;

  const { error } = await supabase.from("client_links").insert({
    client_id: clientId,
    label: formData.get("label") as string,
    url: formData.get("url") as string,
    created_by: auth.user?.id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clientId}/links`);
  return { ok: true };
}

export async function deleteLink(formData: FormData) {
  const supabase = await createClient();
  const clientId = formData.get("client_id") as string;

  await supabase.from("client_links").delete().eq("id", formData.get("id") as string);

  revalidatePath(`/clientes/${clientId}/links`);
}

export async function getFileUrl(path: string) {
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("client-files")
    .createSignedUrl(path, 60);

  return data?.signedUrl ?? null;
}
