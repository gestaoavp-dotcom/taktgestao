"use server";

import { revalidatePath } from "next/cache";
import { refreshEverything } from "@/lib/refresh-app";
import { createClient } from "@/lib/supabase/server";
import type { ParsedShopeeOrder } from "@/lib/parsers/shopee-orders";
import type { ParsedMercadoLivreOrder } from "@/lib/parsers/mercado-livre-orders";
import type { ParsedSheinOrder } from "@/lib/parsers/shein-orders";
import type { ParsedTikTokOrder } from "@/lib/parsers/tiktok-orders";
import type { ParsedAmazonOrder } from "@/lib/parsers/amazon-orders";
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
  if (!input.sku && !input.productName) return;
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

/**
 * One document row per month the file actually holds.
 *
 * A Mercado Livre export can cover June to October, and the sales already go
 * to their own months — but the document stayed a single row filed under the
 * first of them, so four months had no entry of their own: no count, no
 * status, nothing to remove on its own. Each month now has its row, all
 * pointing at the one uploaded file.
 */
async function splitReportByMonth(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reportId: string,
) {
  const { data: report } = await supabase
    .from("sales_reports")
    .select(
      "id, client_id, kind, marketplace, account_id, name, path, size, created_by, period_start, period_end",
    )
    .eq("id", reportId)
    .maybeSingle<{
      id: string; client_id: string; kind: string; marketplace: string;
      account_id: string | null; name: string; path: string; size: number;
      created_by: string | null; period_start: string | null; period_end: string | null;
    }>();

  if (!report?.period_start || !report.period_end) return;

  const monthsIn = (start: string, end: string) => {
    const out: string[] = [];
    const last = end.slice(0, 7);
    let [year, month] = start.slice(0, 7).split("-").map(Number);
    for (let guard = 0; guard < 60; guard++) {
      const key = `${year}-${String(month).padStart(2, "0")}`;
      out.push(key);
      if (key >= last) break;
      month += 1;
      if (month > 12) { month = 1; year += 1; }
    }
    return out;
  };

  const months = monthsIn(report.period_start, report.period_end);
  if (months.length <= 1) return;

  // Which of them the file really filled: counted in the database, a handful
  // of counts rather than every row of a long export.
  const filled: string[] = [];
  for (const month of months) {
    const { count } = await supabase
      .from("sales_orders")
      .select("id", { count: "exact", head: true })
      .eq("sales_report_id", reportId)
      .eq("report_month", `${month}-01`);
    if ((count ?? 0) > 0) filled.push(month);
  }
  if (filled.length <= 1) return;

  const lastDay = (month: string) => {
    const [y, m] = month.split("-").map(Number);
    return `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
  };
  const windowOf = (month: string) => ({
    start: `${month}-01` > report.period_start! ? `${month}-01` : report.period_start!,
    end: lastDay(month) < report.period_end! ? lastDay(month) : report.period_end!,
  });

  // The first month keeps the row that was uploaded, so its storage path and
  // its history stay put; the rest get rows of their own.
  const [first, ...rest] = filled;
  const firstWindow = windowOf(first);
  await supabase
    .from("sales_reports")
    .update({
      report_month: `${first}-01`,
      period_start: firstWindow.start,
      period_end: firstWindow.end,
    })
    .eq("id", reportId);

  for (const month of rest) {
    const w = windowOf(month);
    const { data: made } = await supabase
      .from("sales_reports")
      .insert({
        client_id: report.client_id,
        kind: report.kind,
        marketplace: report.marketplace,
        account_id: report.account_id,
        name: report.name,
        path: report.path,
        size: report.size,
        created_by: report.created_by,
        report_month: `${month}-01`,
        period_start: w.start,
        period_end: w.end,
        status: "processado",
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (!made) continue;
    await supabase
      .from("sales_orders")
      .update({ sales_report_id: made.id })
      .eq("sales_report_id", reportId)
      .eq("report_month", `${month}-01`);
  }
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
    | ParsedAmazonOrder
  )[];
  /** The window this document covers; set on the first batch only. */
  replace?: { start: string; end: string } | null;
  /** False while more batches are still coming. */
  finalize?: boolean;
}): Promise<ActionState> {
  // A sale without a date is counted by no chart, no filter and no month —
  // better to refuse the file than to store revenue nobody will ever see.
  const undated = input.orders.filter((o) => !o.created_on).length;
  if (undated) {
    return {
      error:
        `${undated} venda${undated === 1 ? "" : "s"} desse arquivo sem data de venda. ` +
        "O formato do relatório pode ter mudado — avise a equipe antes de importar.",
    };
  }

  const supabase = await createClient();

  // Read before the clear below, not after: these costs come out of the
  // client's own orders, and re-sending a file that covers every month a
  // client has would empty the table first and find nothing to carry over —
  // every cost typed by hand, gone on a re-upload.
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
    // Each sale under its own month: a file covering June to October fills
    // all five, not just the month it was uploaded under.
    report_month: `${o.created_on!.slice(0, 7)}-01`,
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

    await splitReportByMonth(supabase, input.reportId);

    revalidatePath(`/clientes/${input.clientId}/vendas/importar`);
    revalidatePath(`/clientes/${input.clientId}/vendas/pedidos`);
    refreshEverything();
  }
  return { ok: true };
}

/**
 * Mercado Livre's reports come one row per campaign and week, so a file
 * exported for several months spreads over them: each week goes to its own
 * month, from the month the upload was filed under onward. A week that began
 * in the month before belongs to the chosen one — that is how a monthly
 * export trims it. Shopee's start date is the ad's, not the period's, so its
 * rows stay in the chosen month.
 */
function adMonth(marketplace: string, startedOn: string | null, reportMonth: string) {
  if (marketplace !== "mercado_livre" || !startedOn) return reportMonth;
  const own = `${startedOn.slice(0, 7)}-01`;
  return own > reportMonth ? own : reportMonth;
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
    report_month: adMonth(input.marketplace, a.started_on, input.reportMonth),
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
  refreshEverything();
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
  refreshEverything();
  return { ok: true };
}

export async function markSalesReportError(reportId: string, clientId: string) {
  const supabase = await createClient();
  await supabase.from("sales_reports").update({ status: "erro" }).eq("id", reportId);
  revalidatePath(`/clientes/${clientId}/vendas/importar`);
}

/**
 * One upload can be filed as several months, all pointing at the same stored
 * file. It is removed with the last of them, never with the first — otherwise
 * deleting January takes February's download with it.
 */
async function removeFileIfLast(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string,
) {
  const { count } = await supabase
    .from("sales_reports")
    .select("id", { count: "exact", head: true })
    .eq("path", path);
  if ((count ?? 0) === 0) await supabase.storage.from("client-files").remove([path]);
}

export async function deleteSalesReportById(input: {
  id: string;
  clientId: string;
  path: string;
}) {
  const supabase = await createClient();

  await supabase.from("sales_reports").delete().eq("id", input.id);
  await removeFileIfLast(supabase, input.path);

  revalidatePath(`/clientes/${input.clientId}/vendas/importar`);
  revalidatePath(`/clientes/${input.clientId}/vendas/pedidos`);
  refreshEverything();
}

export async function deleteSalesReport(formData: FormData) {
  const supabase = await createClient();
  const clientId = formData.get("client_id") as string;
  const path = formData.get("path") as string;

  await supabase.from("sales_reports").delete().eq("id", formData.get("id") as string);
  await removeFileIfLast(supabase, path);

  revalidatePath(`/clientes/${clientId}/vendas/importar`);
  revalidatePath(`/clientes/${clientId}/vendas/pedidos`);
  refreshEverything();
}

export async function getSalesReportUrl(path: string) {
  const supabase = await createClient();
  const { data } = await supabase.storage.from("client-files").createSignedUrl(path, 60);

  return data?.signedUrl ?? null;
}

export type SavedTotals = {
  orders: number; lines: number; sold: number; net: number;
  cost: number; extra: number; tax: number; margin: number;
};

export async function updateOrderCosts(
  input: {
    id: string;
    clientId: string;
    cost: string;
    extra: string;
    tax: string;
    affiliate: string;
    filters: {
      month: string | null;
      marketplace: string | null;
      accountId: string | null;
      missingCost: boolean | null;
    };
  },
): Promise<{ totals: SavedTotals } | { error: string }> {
  const supabase = await createClient();

  const toNumberOrNull = (value: string) => {
    if (!value.trim()) return null;
    const n = Number(value.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  // One call that writes and answers: the database spreads the cost across the
  // product and the tax across the client, then hands back the totals for the
  // filter on screen. Without them the page had to be rebuilt to move one
  // number in the footer.
  const { data, error } = await supabase.rpc("save_order_costs", {
    p_order_id: input.id,
    p_client_id: input.clientId,
    p_cost: toNumberOrNull(input.cost),
    p_extra: toNumberOrNull(input.extra),
    p_tax: toNumberOrNull(input.tax),
    p_affiliate: toNumberOrNull(input.affiliate),
    p_month: input.filters.month,
    p_marketplace: input.filters.marketplace,
    p_account_id: input.filters.accountId,
    p_missing_cost: input.filters.missingCost,
  });

  if (error) return { error: error.message };
  return { totals: (data as SavedTotals[])[0] };
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
  refreshEverything();
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
 * Changes what a product costs, from a month forward.
 *
 * The Custos tab is where a cost is changed rather than first filled in: the
 * months before keep what the product cost at the time, which is the whole
 * reason the figure is stored per month and not once per product. Every call
 * that moves the number leaves a line in the history — that is what this tab
 * exists for, and what typing in Pedidos does not do.
 */
export async function setProductCost(input: {
  clientId: string;
  sku: string | null;
  productName: string | null;
  fromMonth: string;
  cost: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  if (!input.sku && !input.productName) return { error: "Produto sem SKU e sem título." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fromMonth)) return { error: "Mês inválido." };

  const trimmed = input.cost.trim();
  const next = trimmed ? Number(trimmed.replace(",", ".")) : null;
  if (trimmed && !Number.isFinite(next)) return { error: "Custo inválido." };

  // Matched the way costs are filed: by SKU when there is one, by exact title
  // when the marketplace gave none.
  const before = await (() => {
    const q = supabase
      .from("sales_orders")
      .select("cost")
      .eq("client_id", input.clientId)
      .eq("report_month", input.fromMonth);
    return (input.sku ? q.eq("sku", input.sku) : q.is("sku", null).eq("product_name", input.productName ?? ""))
      .limit(1)
      .maybeSingle<{ cost: number | null }>();
  })();

  const written = await (() => {
    const q = supabase
      .from("sales_orders")
      .update({ cost: next })
      .eq("client_id", input.clientId)
      .gte("report_month", input.fromMonth);
    return input.sku ? q.eq("sku", input.sku) : q.is("sku", null).eq("product_name", input.productName ?? "");
  })();
  if (written.error) return { error: written.error.message };

  // Amazon's own product rows carry the same cost under another name.
  await (() => {
    const q = supabase
      .from("sales_products")
      .update({ unit_cost: next })
      .eq("client_id", input.clientId)
      .gte("report_month", input.fromMonth);
    return input.sku ? q.eq("sku", input.sku) : q.is("sku", null).eq("product_name", input.productName ?? "");
  })();

  await noteCostChange(supabase, {
    clientId: input.clientId,
    sku: input.sku,
    productName: input.productName,
    effectiveMonth: input.fromMonth,
    previous: before.data?.cost ?? null,
    next,
  });

  revalidatePath(`/clientes/${input.clientId}/vendas/custos`);
  revalidatePath(`/clientes/${input.clientId}/vendas/pedidos`);
  refreshEverything();
  return { ok: true };
}

/**
 * A cost typed on the Produtos tab for a product that has no row of its own.
 *
 * Most products here are folded out of the orders rather than stored, and the
 * fields were read-only because of it — which from the outside looks like a
 * table that will not save. The orders are still where the cost lives, so this
 * finds one line of the product and hands it to the same function the Pedidos
 * tab uses: one spread, written once, with the TikTok recompute it carries.
 *
 * Only the unit cost and the tax travel. "Outros" belongs to a single order by
 * design, and a figure typed per product has no one order to land on.
 */
export async function updateDerivedProductCost(input: {
  clientId: string;
  marketplace: string;
  reportMonth: string;
  sku: string | null;
  productName: string | null;
  unitCost: string;
  tax: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();

  const toNumberOrNull = (value: string) => {
    if (!value.trim()) return null;
    const n = Number(value.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  // The extras and the affiliate share come back unchanged: this screen does
  // not ask for them, and save_order_costs writes every field it is given —
  // passing null would quietly erase a TikTok affiliate percentage along with
  // the net it determines.
  let query = supabase
    .from("sales_orders")
    .select("id, cost, extra_costs, affiliate_percent")
    .eq("client_id", input.clientId)
    .eq("marketplace", input.marketplace)
    .eq("report_month", input.reportMonth);

  query = input.sku
    ? query.eq("sku", input.sku)
    : query.is("sku", null).eq("product_name", input.productName ?? "");

  const { data: order } = await query
    .order("id")
    .limit(1)
    .maybeSingle<{
      id: string;
      cost: number | null;
      extra_costs: number | null;
      affiliate_percent: number | null;
    }>();

  if (!order) return { error: "Não achei os pedidos desse produto para gravar o custo." };

  const unitCost = toNumberOrNull(input.unitCost);

  const { error } = await supabase.rpc("save_order_costs", {
    p_order_id: order.id,
    p_client_id: input.clientId,
    p_cost: unitCost,
    p_extra: order.extra_costs,
    p_tax: toNumberOrNull(input.tax),
    p_affiliate: order.affiliate_percent,
    p_month: input.reportMonth,
    p_marketplace: null,
    p_account_id: null,
    p_missing_cost: null,
  });
  if (error) return { error: error.message };

  await noteCostChange(supabase, {
    clientId: input.clientId,
    sku: input.sku,
    productName: input.productName,
    effectiveMonth: input.reportMonth,
    previous: order.cost,
    next: unitCost,
  });

  revalidatePath(`/clientes/${input.clientId}/vendas/produtos`);
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
