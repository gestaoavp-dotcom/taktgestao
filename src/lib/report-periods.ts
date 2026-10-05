import type { SupabaseClient } from "@supabase/supabase-js";

/** The days a settled report covers, end included. */
export type ReportPeriod = { start: string; end: string };

/** "2026-02-01" → "2026-02-28". */
export function monthEnd(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month.slice(0, 7)}-${String(last).padStart(2, "0")}`;
}

export function spansMonths(p: ReportPeriod) {
  return p.start.slice(0, 7) !== p.end.slice(0, 7);
}

export function periodWithin(p: ReportPeriod, start: string, end: string) {
  return p.start >= start && p.end <= end;
}

export function periodOverlaps(p: ReportPeriod, start: string, end: string) {
  return p.start <= end && p.end >= start;
}

type ReportRow = {
  id: string;
  report_month: string | null;
  period_start: string | null;
  period_end: string | null;
};

/**
 * The window each report covers. A product report (Amazon) totals its whole
 * window with no day in it, so it can only count where a period holds that
 * window entire. Reports from before periods were recorded settle one month.
 */
export async function loadReportPeriods(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, ReportPeriod>> {
  const unique = [...new Set(ids)];
  const periods = new Map<string, ReportPeriod>();

  // In chunks: the ids travel in the URL.
  for (let i = 0; i < unique.length; i += 100) {
    const { data } = await supabase
      .from("sales_reports")
      .select("id, report_month, period_start, period_end")
      .in("id", unique.slice(i, i + 100))
      .returns<ReportRow[]>();
    for (const r of data ?? []) {
      const start = r.period_start ?? r.report_month;
      if (!start) continue;
      const month = r.report_month ?? `${start.slice(0, 7)}-01`;
      periods.set(r.id, { start, end: r.period_end ?? monthEnd(month) });
    }
  }
  return periods;
}

/**
 * The windows each client's Amazon orders reports cover. Where one exists, the
 * orders are the revenue — dated, day by day — and a product report over the
 * same days would count the same sales twice; it stays for Amazon's fees.
 */
export async function loadAmazonOrderPeriods(
  supabase: SupabaseClient,
  clientId?: string,
): Promise<Map<string, ReportPeriod[]>> {
  let q = supabase
    .from("sales_reports")
    .select("client_id, report_month, period_start, period_end")
    .eq("marketplace", "amazon")
    .eq("kind", "pedidos")
    .eq("status", "processado");
  if (clientId) q = q.eq("client_id", clientId);
  const { data } = await q.returns<
    { client_id: string; report_month: string | null; period_start: string | null; period_end: string | null }[]
  >();

  const byClient = new Map<string, ReportPeriod[]>();
  for (const r of data ?? []) {
    const start = r.period_start ?? r.report_month;
    if (!start) continue;
    const end = r.period_end ?? monthEnd(r.report_month ?? start);
    byClient.set(r.client_id, [...(byClient.get(r.client_id) ?? []), { start, end }]);
  }
  return byClient;
}

/** Whether a client's Amazon orders already cover any of these days. */
export function coveredByAmazonOrders(
  periods: Map<string, ReportPeriod[]>,
  clientId: string,
  p: ReportPeriod,
) {
  return (periods.get(clientId) ?? []).some((o) => periodOverlaps(o, p.start, p.end));
}
