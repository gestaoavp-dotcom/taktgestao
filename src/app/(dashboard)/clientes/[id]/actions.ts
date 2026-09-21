"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { ok: true } | { error: string } | null;

function toNumber(value: FormDataEntryValue | null) {
  if (!value) return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export async function addCnpj(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const clientId = formData.get("client_id") as string;

  const { error } = await supabase.from("client_cnpjs").insert({
    client_id: clientId,
    cnpj: formData.get("cnpj") as string,
    label: (formData.get("label") as string) || null,
    monthly_fee: toNumber(formData.get("monthly_fee")),
    payment_day: toNumber(formData.get("payment_day")),
    payment_method: (formData.get("payment_method") as string) || null,
    created_by: auth.user?.id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clientId}/informacoes`);
  revalidatePath("/financas");
  return { ok: true };
}

export async function updateBilling(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const clientId = formData.get("client_id") as string;
  const cnpjId = formData.get("cnpj_id") as string;
  const newFee = toNumber(formData.get("monthly_fee"));

  const { data: before } = await supabase
    .from("client_cnpjs")
    .select("monthly_fee")
    .eq("id", cnpjId)
    .maybeSingle<{ monthly_fee: number | null }>();

  const { error } = await supabase
    .from("client_cnpjs")
    .update({
      cnpj: formData.get("cnpj") as string,
      label: (formData.get("label") as string) || null,
      monthly_fee: newFee,
      payment_day: toNumber(formData.get("payment_day")),
      payment_method: (formData.get("payment_method") as string) || null,
    })
    .eq("id", cnpjId);

  if (error) return { error: error.message };

  // A changed fee is logged on its own, so a reajuste can always be traced
  // back even though the card only ever shows the current value.
  const oldFee = before?.monthly_fee ?? null;
  const changed = Number(oldFee ?? 0) !== Number(newFee ?? 0);
  if (changed && newFee !== null) {
    await supabase.from("client_fee_changes").insert({
      client_id: clientId,
      cnpj_id: cnpjId,
      effective_on: (formData.get("effective_on") as string) || undefined,
      previous_amount: oldFee,
      amount: newFee,
      note: (formData.get("fee_note") as string) || null,
      created_by: auth.user?.id,
    });
  }

  revalidatePath(`/clientes/${clientId}`, "layout");
  revalidatePath("/financas");
  return { ok: true };
}

export async function deleteCnpj(formData: FormData) {
  const supabase = await createClient();
  const clientId = formData.get("client_id") as string;

  await supabase.from("client_cnpjs").delete().eq("id", formData.get("cnpj_id") as string);

  revalidatePath(`/clientes/${clientId}/informacoes`);
  revalidatePath("/financas");
}

export async function updateClient(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const clientId = formData.get("client_id") as string;

  const { error } = await supabase
    .from("clients")
    .update({
      name: formData.get("name") as string,
      store_name: (formData.get("store_name") as string) || null,
      marketplaces: formData.getAll("marketplaces") as string[],
      contact_email: (formData.get("contact_email") as string) || null,
      contact_phone: (formData.get("contact_phone") as string) || null,
    })
    .eq("id", clientId);

  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clientId}`, "layout");
  revalidatePath("/clientes");
  revalidatePath("/financas");
  return { ok: true };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Stores can share a CNPJ, so a typed number resolves to the client's existing
 * record when there is one and creates it otherwise. Comparison is on digits
 * only, so the same CNPJ typed with or without punctuation still matches.
 */
async function resolveCnpjId(
  supabase: Supabase,
  clientId: string,
  raw: string,
  userId?: string,
): Promise<{ id: string | null } | { error: string }> {
  const digits = raw.replace(/D/g, "");
  if (!digits) return { id: null };

  const { data: existing } = await supabase
    .from("client_cnpjs")
    .select("id, cnpj")
    .eq("client_id", clientId)
    .returns<{ id: string; cnpj: string }[]>();

  const match = (existing ?? []).find((c) => c.cnpj.replace(/D/g, "") === digits);
  if (match) return { id: match.id };

  const { data: created, error } = await supabase
    .from("client_cnpjs")
    .insert({ client_id: clientId, cnpj: raw, created_by: userId })
    .select("id")
    .single<{ id: string }>();

  if (error) return { error: error.message };
  return { id: created.id };
}

export async function addAccount(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const clientId = formData.get("client_id") as string;

  const resolved = await resolveCnpjId(
    supabase,
    clientId,
    (formData.get("cnpj") as string) ?? "",
    auth.user?.id,
  );
  if ("error" in resolved) return { error: resolved.error };

  const { error } = await supabase.from("client_accounts").insert({
    client_id: clientId,
    marketplace: formData.get("marketplace") as string,
    store_name: formData.get("store_name") as string,
    cnpj_id: resolved.id,
    created_by: auth.user?.id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clientId}`, "layout");
  revalidatePath("/financas");
  return { ok: true };
}

export async function updateAccount(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const clientId = formData.get("client_id") as string;

  const resolved = await resolveCnpjId(
    supabase,
    clientId,
    (formData.get("cnpj") as string) ?? "",
    auth.user?.id,
  );
  if ("error" in resolved) return { error: resolved.error };

  const { error } = await supabase
    .from("client_accounts")
    .update({
      store_name: formData.get("store_name") as string,
      cnpj_id: resolved.id,
    })
    .eq("id", formData.get("id") as string);

  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clientId}`, "layout");
  revalidatePath("/financas");
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
