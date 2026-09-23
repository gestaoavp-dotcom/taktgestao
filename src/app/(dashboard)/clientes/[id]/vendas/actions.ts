"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ParsedShopeeOrder } from "@/lib/parsers/shopee-orders";
import type { ParsedMercadoLivreOrder } from "@/lib/parsers/mercado-livre-orders";
import type { ParsedAmazonProduct } from "@/lib/parsers/amazon-products";
import type { ParsedShopeeAd } from "@/lib/parsers/shopee-ads";
import type { ParsedMercadoLivreAd } from "@/lib/parsers/mercado-livre-ads";
import type { ParsedShopeeTraffic } from "@/lib/parsers/shopee-traffic";
import type { SalesReportKind } from "@/lib/types";
import { knownCosts, knownTax } from "@/lib/product-costs";

/**
 * Records a cost edit, when it actually changed something.
 *
 * Kept apart from the update so a failure here never blocks the edit: losing a
 * line of history is bad, refusing the work because of it is worse.
 */
async function noteCostChange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    clientId: string;
    sku: string | null;
    productName: string | null;
    effectiveMonth: string;
    previous: number | null;
    next: number | null;
  },
) {
  if (!input.sku) return;
  if (Number(input.previous ?? NaN) === Number(input.next ?? NaN)) return;
  if (input.previous == null && input.next == null) return;

  const { data: auth } = await supabase.auth.getUser();
  await supabase.from("product_cost_changes").insert({
    client_id: input.clientId,
    sku: input.sku,
    product_name: input.productName,
    effective_month: input.effectiveMonth,
    previous_cost: input.previous,
    new_cost: input.next,
    changed_by: auth.user?.id,
  });
}

type ActionState = { ok: true } | { error: string } | null;

export async function registerSalesReport(input: {
  clientId: string;
  kind: SalesReportKind;
  marketplace: string;
  accountId: string | null;
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
      account_id: input.accountId,
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
  accountId: string | null;
  reportMonth: string;
  orders: (ParsedShopeeOrder | ParsedMercadoLivreOrder)[];
}): Promise<ActionState> {
  const supabase = await createClient();

  // Arrive filled in: each SKU starts from the newest cost recorded at or
  // before this report's month, and the tax rate in force then.
  const skus = [...new Set(input.orders.map((o) => o.sku).filter((s): s is string => !!s))];
  const costBySku = await knownCosts(
    supabase,
    "sales_orders",
    "cost",
    input.clientId,
    skus,
    input.reportMonth,
  );
  const taxPercent = await knownTax(supabase, "sales_orders", input.clientId, input.reportMonth);

  const rows = input.orders.map((o) => ({
    client_id: input.clientId,
    sales_report_id: input.reportId,
    marketplace: input.marketplace,
    account_id: input.accountId,
    report_month: input.reportMonth,
    ...o,
    cost: o.sku ? costBySku.get(o.sku) ?? null : null,
    tax_percent: taxPercent,
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
  accountId: string | null;
  reportMonth: string;
  ads: (ParsedShopeeAd | ParsedMercadoLivreAd)[];
}): Promise<ActionState> {
  const supabase = await createClient();

  const rows = input.ads.map((a) => ({
    client_id: input.clientId,
    sales_report_id: input.reportId,
    marketplace: input.marketplace,
    account_id: input.accountId,
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
  accountId: string | null;
  reportMonth: string;
  products: ParsedShopeeTraffic[];
}): Promise<ActionState> {
  const supabase = await createClient();

  const skus = [...new Set(input.products.map((p) => p.sku).filter((s): s is string => !!s))];
  const costBySku = await knownCosts(
    supabase,
    "sales_products",
    "unit_cost",
    input.clientId,
    skus,
    input.reportMonth,
  );
  const taxPercent = await knownTax(supabase, "sales_products", input.clientId, input.reportMonth);

  const rows = input.products.map((p) => ({
    client_id: input.clientId,
    sales_report_id: input.reportId,
    marketplace: input.marketplace,
    account_id: input.accountId,
    report_month: input.reportMonth,
    ...p,
    unit_cost: p.sku ? costBySku.get(p.sku) ?? null : null,
    tax_percent: taxPercent,
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

  const { data: before } = await supabase
    .from("sales_orders")
    .select("cost, sku, product_name, report_month")
    .eq("id", id)
    .maybeSingle<{
      cost: number | null;
      sku: string | null;
      product_name: string | null;
      report_month: string;
    }>();

  const { data: updated, error } = await supabase
    .from("sales_orders")
    .update({
      cost,
      extra_costs: toNumberOrNull(formData.get("extra_costs")),
      tax_percent: taxPercent,
    })
    .eq("id", id)
    .select("sku, report_month")
    .single();

  if (error) return { error: error.message };

  // The cost belongs to the SKU, not to one order — but to the SKU *from this
  // month on*. Earlier months keep what the product cost at the time, so a
  // closed month's result never moves because today's price changed.
  if (updated?.sku) {
    const { error: spreadError } = await supabase
      .from("sales_orders")
      .update({ cost })
      .eq("client_id", clientId)
      .eq("sku", updated.sku)
      .gte("report_month", updated.report_month)
      .neq("id", id);

    if (spreadError) return { error: spreadError.message };
  }

  // The tax rate is one number for the client, and changes the same way.
  const { error: taxError } = await supabase
    .from("sales_orders")
    .update({ tax_percent: taxPercent })
    .eq("client_id", clientId)
    .gte("report_month", updated.report_month)
    .neq("id", id);

  if (taxError) return { error: taxError.message };

  await noteCostChange(supabase, {
    clientId,
    sku: before?.sku ?? null,
    productName: before?.product_name ?? null,
    effectiveMonth: before?.report_month ?? updated.report_month,
    previous: before?.cost ?? null,
    next: cost,
  });

  revalidatePath(`/clientes/${clientId}/vendas/pedidos`);
  return { ok: true };
}

export async function importSalesProducts(input: {
  clientId: string;
  reportId: string;
  marketplace: string;
  accountId: string | null;
  reportMonth: string;
  products: ParsedAmazonProduct[];
}): Promise<ActionState> {
  const supabase = await createClient();

  const skus = [...new Set(input.products.map((p) => p.sku).filter((s): s is string => !!s))];
  const costBySku = await knownCosts(
    supabase,
    "sales_products",
    "unit_cost",
    input.clientId,
    skus,
    input.reportMonth,
  );
  const taxPercent = await knownTax(supabase, "sales_products", input.clientId, input.reportMonth);

  const rows = input.products.map((p) => ({
    client_id: input.clientId,
    sales_report_id: input.reportId,
    marketplace: input.marketplace,
    account_id: input.accountId,
    report_month: input.reportMonth,
    ...p,
    unit_cost: p.sku ? costBySku.get(p.sku) ?? null : null,
    tax_percent: taxPercent,
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
    .select("sku, product_name, report_month, unit_cost")
    .eq("id", id)
    .maybeSingle<{
      sku: string | null;
      product_name: string | null;
      report_month: string;
      unit_cost: number | null;
    }>();

  if (row?.sku) {
    await supabase
      .from("sales_products")
      .update({ unit_cost: unitCost })
      .eq("client_id", clientId)
      .eq("sku", row.sku)
      .gte("report_month", row.report_month);
  } else {
    await supabase.from("sales_products").update({ unit_cost: unitCost }).eq("id", id);
  }

  await supabase.from("sales_products").update({ extra_costs: extraCosts }).eq("id", id);
  await supabase
    .from("sales_products")
    .update({ tax_percent: taxPercent })
    .eq("client_id", clientId)
    .gte("report_month", row?.report_month ?? "1900-01-01");

  await noteCostChange(supabase, {
    clientId,
    sku: row?.sku ?? null,
    productName: row?.product_name ?? null,
    effectiveMonth: row?.report_month ?? new Date().toISOString().slice(0, 10),
    previous: row?.unit_cost ?? null,
    next: unitCost,
  });

  revalidatePath(`/clientes/${clientId}/vendas/produtos`);
  return { ok: true };
}
