"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ParsedShopeeOrder } from "@/lib/parsers/shopee-orders";
import type { ParsedMercadoLivreOrder } from "@/lib/parsers/mercado-livre-orders";
import type { ParsedAmazonProduct } from "@/lib/parsers/amazon-products";
import type { ParsedShopeeAd } from "@/lib/parsers/shopee-ads";
import type { ParsedShopeeTraffic } from "@/lib/parsers/shopee-traffic";
import type { SalesReportKind } from "@/lib/types";

type ActionState = { ok: true } | { error: string } | null;

export async function registerSalesReport(input: {
  clientId: string;
  kind: SalesReportKind;
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
      kind: input.kind,
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
  orders: (ParsedShopeeOrder | ParsedMercadoLivreOrder)[];
}): Promise<ActionState> {
  const supabase = await createClient();

  // A SKU's cost doesn't change month to month: carry over what the team
  // already filled in so a new import doesn't start from scratch.
  const skus = [...new Set(input.orders.map((o) => o.sku).filter((s): s is string => !!s))];
  const { data: known } = await supabase
    .from("sales_orders")
    .select("sku, cost")
    .eq("client_id", input.clientId)
    .in("sku", skus)
    .not("cost", "is", null)
    .returns<{ sku: string; cost: number }[]>();

  const costBySku = new Map((known ?? []).map((k) => [k.sku, k.cost]));

  // The tax rate is a single client-wide number: reuse it on the new rows.
  const { data: taxRow } = await supabase
    .from("sales_orders")
    .select("tax_percent")
    .eq("client_id", input.clientId)
    .not("tax_percent", "is", null)
    .limit(1)
    .maybeSingle<{ tax_percent: number }>();

  const rows = input.orders.map((o) => ({
    client_id: input.clientId,
    sales_report_id: input.reportId,
    marketplace: input.marketplace,
    report_month: input.reportMonth,
    ...o,
    cost: o.sku ? costBySku.get(o.sku) ?? null : null,
    tax_percent: taxRow?.tax_percent ?? null,
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

export async function importSalesAds(input: {
  clientId: string;
  reportId: string;
  marketplace: string;
  reportMonth: string;
  ads: ParsedShopeeAd[];
}): Promise<ActionState> {
  const supabase = await createClient();

  const rows = input.ads.map((a) => ({
    client_id: input.clientId,
    sales_report_id: input.reportId,
    marketplace: input.marketplace,
    report_month: input.reportMonth,
    ...a,
  }));

  if (rows.length) {
    const { error } = await supabase.from("sales_ads").insert(rows);
    if (error) return { error: error.message };
  }

  const { error: statusError } = await supabase
    .from("sales_reports")
    .update({ status: "processado" })
    .eq("id", input.reportId);
  if (statusError) return { error: statusError.message };

  revalidatePath(`/clientes/${input.clientId}/vendas/importar`);
  revalidatePath(`/clientes/${input.clientId}/vendas/ads`);
  return { ok: true };
}

export async function importSalesTraffic(input: {
  clientId: string;
  reportId: string;
  marketplace: string;
  reportMonth: string;
  products: ParsedShopeeTraffic[];
}): Promise<ActionState> {
  const supabase = await createClient();

  const rows = input.products.map((p) => ({
    client_id: input.clientId,
    sales_report_id: input.reportId,
    marketplace: input.marketplace,
    report_month: input.reportMonth,
    ...p,
  }));

  if (rows.length) {
    const { error } = await supabase.from("sales_traffic").insert(rows);
    if (error) return { error: error.message };
  }

  const { error: statusError } = await supabase
    .from("sales_reports")
    .update({ status: "processado" })
    .eq("id", input.reportId);
  if (statusError) return { error: statusError.message };

  revalidatePath(`/clientes/${input.clientId}/vendas/importar`);
  revalidatePath(`/clientes/${input.clientId}/vendas/trafego`);
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

  const cost = toNumberOrNull(formData.get("cost"));
  const taxPercent = toNumberOrNull(formData.get("tax_percent"));

  const { data: updated, error } = await supabase
    .from("sales_orders")
    .update({
      cost,
      extra_costs: toNumberOrNull(formData.get("extra_costs")),
      tax_percent: taxPercent,
    })
    .eq("id", id)
    .select("sku")
    .single();

  if (error) return { error: error.message };

  // The cost belongs to the SKU, not to one order: fill in every other order
  // of the same product so the team types it once.
  if (updated?.sku) {
    const { error: spreadError } = await supabase
      .from("sales_orders")
      .update({ cost })
      .eq("client_id", clientId)
      .eq("sku", updated.sku)
      .neq("id", id);

    if (spreadError) return { error: spreadError.message };
  }

  // The tax rate is one number for the whole client.
  const { error: taxError } = await supabase
    .from("sales_orders")
    .update({ tax_percent: taxPercent })
    .eq("client_id", clientId)
    .neq("id", id);

  if (taxError) return { error: taxError.message };

  revalidatePath(`/clientes/${clientId}/vendas/pedidos`);
  return { ok: true };
}

export async function importSalesProducts(input: {
  clientId: string;
  reportId: string;
  marketplace: string;
  reportMonth: string;
  products: ParsedAmazonProduct[];
}): Promise<ActionState> {
  const supabase = await createClient();

  const rows = input.products.map((p) => ({
    client_id: input.clientId,
    sales_report_id: input.reportId,
    marketplace: input.marketplace,
    report_month: input.reportMonth,
    ...p,
  }));

  if (rows.length) {
    const { error } = await supabase.from("sales_products").insert(rows);
    if (error) return { error: error.message };
  }

  const { error: statusError } = await supabase
    .from("sales_reports")
    .update({ status: "processado" })
    .eq("id", input.reportId);
  if (statusError) return { error: statusError.message };

  revalidatePath(`/clientes/${input.clientId}/vendas/importar`);
  revalidatePath(`/clientes/${input.clientId}/vendas/produtos`);
  return { ok: true };
}

/**
 * Saves the seller's own costs on a product line.
 *
 * A cost belongs to the product, not to the month: typing it once fills every
 * month of the same SKU. The tax rate is one number for the whole client, so it
 * lands on every product row at once — both mirroring the Pedidos tab, where
 * the team already learned this behaviour.
 */
export async function updateProductCosts(
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

  const unitCost = toNumberOrNull(formData.get("unit_cost"));
  const extraCosts = toNumberOrNull(formData.get("extra_costs"));
  const taxPercent = toNumberOrNull(formData.get("tax_percent"));

  const { data: row } = await supabase
    .from("sales_products")
    .select("sku")
    .eq("id", id)
    .maybeSingle<{ sku: string | null }>();

  if (row?.sku) {
    await supabase
      .from("sales_products")
      .update({ unit_cost: unitCost })
      .eq("client_id", clientId)
      .eq("sku", row.sku);
  } else {
    await supabase.from("sales_products").update({ unit_cost: unitCost }).eq("id", id);
  }

  await supabase.from("sales_products").update({ extra_costs: extraCosts }).eq("id", id);
  await supabase
    .from("sales_products")
    .update({ tax_percent: taxPercent })
    .eq("client_id", clientId);

  revalidatePath(`/clientes/${clientId}/vendas/produtos`);
  return { ok: true };
}
