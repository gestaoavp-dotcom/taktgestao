"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ParsedShopeeOrder } from "@/lib/parsers/shopee-orders";
import type { ParsedMercadoLivreOrder } from "@/lib/parsers/mercado-livre-orders";
import type { ParsedSheinOrder } from "@/lib/parsers/shein-orders";
import type { ParsedTikTokOrder } from "@/lib/parsers/tiktok-orders";
import type { ParsedAmazonProduct } from "@/lib/parsers/amazon-products";
import type { ParsedShopeeAd } from "@/lib/parsers/shopee-ads";
import type { ParsedMercadoLivreAd } from "@/lib/parsers/mercado-livre-ads";
import type { ParsedShopeeTraffic } from "@/lib/parsers/shopee-traffic";
import type { SalesOrder, SalesReportKind } from "@/lib/types";
import type { OrderBreakdown } from "@/lib/parsers/breakdown";
import { buildOrderBreakdown, orderNet, orderShares } from "@/lib/parsers/order-breakdown";
import { costKey, knownCosts, knownTax } from "@/lib/product-costs";
import { ORDER_LIST_COLUMNS, ORDERS_PAGE } from "@/lib/sales-columns";

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
  periodStart?: string | null;
  periodEnd?: string | null;
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
      period_start: input.periodStart ?? input.reportMonth,
      period_end: input.periodEnd ?? null,
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
  orders: (
    | ParsedShopeeOrder
    | ParsedMercadoLivreOrder
    | ParsedSheinOrder
    | ParsedTikTokOrder
  )[];
  /** The window this document covers; set on the first batch only. */
  replace?: { start: string; end: string } | null;
  /** False while more batches are still coming. */
  finalize?: boolean;
}): Promise<ActionState> {
  const supabase = await createClient();

  // Clear the window before the first batch lands, so uploading the 1st to the
  // 24th after the 1st to the 17th leaves one set of orders and not one and a
  // half. Scoped to this store, so two shops on the same marketplace do not
  // erase each other.
  if (input.replace) {
    let clear = supabase
      .from("sales_orders")
      .delete()
      .eq("client_id", input.clientId)
      .eq("marketplace", input.marketplace)
      .gte("created_on", input.replace.start)
      .lte("created_on", input.replace.end);

    clear = input.accountId
      ? clear.eq("account_id", input.accountId)
      : clear.is("account_id", null);

    const { error: clearError } = await clear;
    if (clearError) return { error: clearError.message };
  }

  // Arrive filled in: each SKU starts from the newest cost recorded at or
  // before this report's month, and the tax rate in force then.
  const costByKey = await knownCosts(
    supabase,
    "sales_orders",
    "cost",
    input.clientId,
    input.reportMonth,
  );
  const taxPercent = await knownTax(supabase, "sales_orders", input.clientId, input.reportMonth);

  // Worked out here, with the report row in hand, instead of on every page
  // load from a JSON blob the database cannot sum.
  const shares = orderShares(
    input.orders.map((o, i) => ({ ...o, id: String(i), marketplace: input.marketplace })) as never,
  );

  const rows = input.orders.map((o, i) => ({
    client_id: input.clientId,
    sales_report_id: input.reportId,
    marketplace: input.marketplace,
    account_id: input.accountId,
    report_month: input.reportMonth,
    ...o,
    net_amount: orderNet(
      { ...o, id: String(i), marketplace: input.marketplace } as never,
      shares.get(String(i)) ?? 1,
    ),
    cost: costByKey.get(costKey(o) ?? "") ?? null,
    tax_percent: taxPercent,
  }));

  if (rows.length) {
    const { error } = await supabase.from("sales_orders").insert(rows);
    if (error) return { error: error.message };
  }

  // Only the last batch settles the document, so a run that stops halfway
  // leaves it visibly unfinished instead of claiming to be done.
  if (input.finalize !== false) {
    const { error: statusError } = await supabase
      .from("sales_reports")
      .update({ status: "processado" })
      .eq("id", input.reportId);
    if (statusError) return { error: statusError.message };

    revalidatePath(`/clientes/${input.clientId}/vendas/importar`);
    revalidatePath(`/clientes/${input.clientId}/vendas/pedidos`);
  }
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

  const costByKey = await knownCosts(
    supabase,
    "sales_products",
    "unit_cost",
    input.clientId,
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
    unit_cost: costByKey.get(costKey(p) ?? "") ?? null,
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
  const affiliatePercent = toNumberOrNull(formData.get("affiliate_percent"));

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
      affiliate_percent: affiliatePercent,
    })
    .eq("id", id)
    .select("sku, product_name, report_month, marketplace")
    .single();

  if (error) return { error: error.message };

  // The cost belongs to the SKU, not to one order — but to the SKU *from this
  // month on*. Earlier months keep what the product cost at the time, so a
  // closed month's result never moves because today's price changed.
  // Filed under the SKU when there is one, under the exact title when there is
  // not — so a marketplace that omits SKUs does not mean typing the same cost
  // on every line of the same product.
  if (updated) {
    let spread = supabase
      .from("sales_orders")
      .update({ cost, affiliate_percent: affiliatePercent })
      .eq("client_id", clientId)
      .gte("report_month", updated.report_month)
      .neq("id", id);

    if (updated.sku) spread = spread.eq("sku", updated.sku);
    else if (updated.product_name) {
      spread = spread.is("sku", null).eq("product_name", updated.product_name);
    } else spread = spread.eq("id", id);

    const { error: spreadError } = await spread;
    if (spreadError) return { error: spreadError.message };
  }

  // One statement for the whole product: the pieces are stored, so the
  // database does the arithmetic. Rewriting each line from here took two of
  // the three seconds it cost to leave the field.
  if (updated?.marketplace === "tiktok") {
    const { error: affiliateError } = await supabase.rpc("set_affiliate_percent", {
      p_client_id: clientId,
      p_sku: updated.sku,
      p_product_name: updated.product_name,
      p_from_month: updated.report_month,
      p_percent: affiliatePercent,
    });
    if (affiliateError) return { error: affiliateError.message };
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

  const costByKey = await knownCosts(
    supabase,
    "sales_products",
    "unit_cost",
    input.clientId,
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
    unit_cost: costByKey.get(costKey(p) ?? "") ?? null,
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

  if (row?.sku || row?.product_name) {
    let spread = supabase
      .from("sales_products")
      .update({ unit_cost: unitCost })
      .eq("client_id", clientId)
      .gte("report_month", row.report_month);

    spread = row.sku
      ? spread.eq("sku", row.sku)
      : spread.is("sku", null).eq("product_name", row.product_name);

    await spread;
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

/**
 * The full breakdown of one order, fetched when its row is opened.
 *
 * The raw report row is 66 columns wide and only one order's is ever read at a
 * time, so the list ships without it: that is three quarters of what the
 * Pedidos page used to weigh. Computed here rather than sent as raw, so the
 * columns still never cross the wire.
 */
export async function getOrderBreakdown(
  orderId: string,
  share: number,
): Promise<OrderBreakdown | { error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sales_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle<SalesOrder>();

  if (error) return { error: error.message };
  if (!data) return { error: "Pedido não encontrado." };

  const breakdown = buildOrderBreakdown(data, share);
  return breakdown ?? { error: "Esse pedido não tem o detalhamento da planilha guardado." };
}

export type OrderFilters = {
  clientId: string;
  month?: string | null;
  marketplace?: string | null;
  accountId?: string | null;
  missingCost?: boolean | null;
};

/**
 * One page of orders for a filter.
 *
 * The page used to load every order a client had so the table could filter in
 * the browser. At roughly 2300 a month that stops working within the year, so
 * the filters live in the query and the rows arrive a page at a time.
 */
export async function listOrders(
  filters: OrderFilters,
  offset: number,
): Promise<{ orders: SalesOrder[] } | { error: string }> {
  const supabase = await createClient();

  let query = supabase
    .from("sales_orders")
    .select(ORDER_LIST_COLUMNS)
    .eq("client_id", filters.clientId)
    .order("created_on", { ascending: false })
    // Dates repeat, so the id keeps paging from skipping or repeating a row.
    .order("id")
    .range(offset, offset + ORDERS_PAGE - 1);

  if (filters.month) query = query.eq("report_month", filters.month);
  if (filters.marketplace) query = query.eq("marketplace", filters.marketplace);
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.missingCost === true) query = query.is("cost", null);
  if (filters.missingCost === false) query = query.not("cost", "is", null);

  const { data, error } = await query.returns<SalesOrder[]>();
  if (error) return { error: error.message };
  return { orders: data ?? [] };
}
