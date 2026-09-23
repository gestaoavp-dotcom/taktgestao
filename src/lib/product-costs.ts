import type { SupabaseClient } from "@supabase/supabase-js";

// What a product cost the seller changes over time, so it is recorded per
// month rather than as one number per SKU.
//
// Two rules follow from that, and both are what the team asked for:
//  - Editing a cost applies to that month and every month after it. Earlier
//    months keep what they cost at the time, because a closed month's result
//    should not move when this year's price does.
//  - A new import starts from the most recent cost known at or before its own
//    month, so the team types a price once and every later upload arrives
//    filled in.

type Row = { sku: string | null; report_month: string; cost: number | null };

/**
 * The cost to assume for each SKU in a report of `month`.
 *
 * Prefers the newest cost recorded at or before that month. A month older than
 * anything on file falls back to the oldest cost there is — better a known
 * price than an empty column.
 */
export async function knownCosts(
  supabase: SupabaseClient,
  table: "sales_orders" | "sales_products",
  costColumn: "cost" | "unit_cost",
  clientId: string,
  skus: string[],
  month: string,
): Promise<Map<string, number>> {
  if (!skus.length) return new Map();

  const { data } = await supabase
    .from(table)
    .select(`sku, report_month, ${costColumn}`)
    .eq("client_id", clientId)
    .in("sku", skus)
    .not(costColumn, "is", null)
    .order("report_month");

  const rows = ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
    sku: r.sku as string | null,
    report_month: r.report_month as string,
    cost: Number(r[costColumn]),
  })) as Row[];

  const byAtOrBefore = new Map<string, number>();
  const earliest = new Map<string, number>();

  for (const row of rows) {
    if (!row.sku || row.cost == null) continue;
    if (!earliest.has(row.sku)) earliest.set(row.sku, row.cost);
    // Ordered ascending, so the last one that still qualifies wins.
    if (row.report_month <= month) byAtOrBefore.set(row.sku, row.cost);
  }

  for (const [sku, cost] of earliest) {
    if (!byAtOrBefore.has(sku)) byAtOrBefore.set(sku, cost);
  }
  return byAtOrBefore;
}

/** The tax rate in force for a report of `month`, by the same reasoning. */
export async function knownTax(
  supabase: SupabaseClient,
  table: "sales_orders" | "sales_products",
  clientId: string,
  month: string,
): Promise<number | null> {
  const { data } = await supabase
    .from(table)
    .select("tax_percent, report_month")
    .eq("client_id", clientId)
    .not("tax_percent", "is", null)
    .lte("report_month", month)
    .order("report_month", { ascending: false })
    .limit(1)
    .maybeSingle<{ tax_percent: number }>();

  if (data) return data.tax_percent;

  const { data: any } = await supabase
    .from(table)
    .select("tax_percent")
    .eq("client_id", clientId)
    .not("tax_percent", "is", null)
    .order("report_month")
    .limit(1)
    .maybeSingle<{ tax_percent: number }>();

  return any?.tax_percent ?? null;
}
