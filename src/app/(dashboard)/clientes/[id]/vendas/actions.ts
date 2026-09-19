"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ParsedShopeeOrder } from "@/lib/parsers/shopee-orders";

type ActionState = { ok: true } | { error: string } | null;

export async function registerSalesReport(input: {
  clientId: string;
  marketplace: string;
  reportMonth: string;
  name: string;
  path: string;
  size: number;
}): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("sales_reports")
    .insert({
      client_id: input.clientId,
      marketplace: input.marketplace,
      report_month: input.reportMonth,
      name: input.name,
      path: input.path,
      size: input.size,
      created_by: auth.user?.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/clientes/${input.clientId}/vendas/importar`);
  return { id: data.id };
}

export async function importSalesOrders(input: {
  clientId: string;
  reportId: string;
  marketplace: string;
  reportMonth: string;
  orders: ParsedShopeeOrder[];
}): Promise<ActionState> {
  const supabase = await createClient();

  const rows = input.orders.map((o) => ({
    client_id: input.clientId,
    sales_report_id: input.reportId,
    marketplace: input.marketplace,
    report_month: input.reportMonth,
    ...o,
  }));

  if (rows.length) {
    const { error } = await supabase.from("sales_orders").insert(rows);
    if (error) return { error: error.message };
  }

  const { error: statusError } = await supabase
    .from("sales_reports")
    .update({ status: "processado" })
    .eq("id", input.reportId);
  if (statusError) return { error: statusError.message };

  revalidatePath(`/clientes/${input.clientId}/vendas/importar`);
  revalidatePath(`/clientes/${input.clientId}/vendas/pedidos`);
  return { ok: true };
}

export async function markSalesReportError(reportId: string, clientId: string) {
  const supabase = await createClient();
  await supabase.from("sales_reports").update({ status: "erro" }).eq("id", reportId);
  revalidatePath(`/clientes/${clientId}/vendas/importar`);
}

export async function deleteSalesReportById(input: {
  id: string;
  clientId: string;
  path: string;
}) {
  const supabase = await createClient();

  await supabase.storage.from("client-files").remove([input.path]);
  await supabase.from("sales_reports").delete().eq("id", input.id);

  revalidatePath(`/clientes/${input.clientId}/vendas/importar`);
  revalidatePath(`/clientes/${input.clientId}/vendas/pedidos`);
}

export async function deleteSalesReport(formData: FormData) {
  const supabase = await createClient();
  const clientId = formData.get("client_id") as string;
  const path = formData.get("path") as string;

  await supabase.storage.from("client-files").remove([path]);
  await supabase.from("sales_reports").delete().eq("id", formData.get("id") as string);

  revalidatePath(`/clientes/${clientId}/vendas/importar`);
  revalidatePath(`/clientes/${clientId}/vendas/pedidos`);
}

export async function getSalesReportUrl(path: string) {
  const supabase = await createClient();
  const { data } = await supabase.storage.from("client-files").createSignedUrl(path, 60);

  return data?.signedUrl ?? null;
}

export async function updateOrderCosts(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const clientId = formData.get("client_id") as string;
  const id = formData.get("id") as string;

  function toNumberOrNull(value: FormDataEntryValue | null) {
    if (value === null || value === "") return null;
    const n = Number(String(value).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  const { error } = await supabase
    .from("sales_orders")
    .update({
      cost: toNumberOrNull(formData.get("cost")),
      extra_costs: toNumberOrNull(formData.get("extra_costs")),
      tax_percent: toNumberOrNull(formData.get("tax_percent")),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clientId}/vendas/pedidos`);
  return { ok: true };
}
