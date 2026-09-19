import type { SupabaseClient } from "@supabase/supabase-js";
import { isBilledOrder } from "@/lib/parsers/order-breakdown";

// Assembles the monthly report from the four sources the team imports:
// orders, ads, traffic and the change log. Every figure is computed here —
// nothing is estimated — and each block also carries the previous month so
// the report reads as a comparison rather than a snapshot.

export type ReportSection = "vendas" | "produtos" | "ads" | "trafego" | "controle";

export const REPORT_SECTIONS: { value: ReportSection; label: string }[] = [
  { value: "vendas", label: "Vendas" },
  { value: "produtos", label: "Produtos" },
  { value: "ads", label: "Ads" },
  { value: "trafego", label: "Tráfego" },
  { value: "controle", label: "Ações do mês" },
];

export type ReportNote = { kind: "destaque" | "alerta"; text: string };

export type DayAction = {
  date: string;
  description: string;
  category: string | null;
  status: string;
  owner: string | null;
  /** Registered on the day itself, or in the two days leading up to it. */
  sameDay: boolean;
};

export type ReportAction = {
  date: string;
  description: string;
  category: string | null;
  status: string;
  owner: string | null;
  reason: string | null;
  goal: string | null;
};

export type DayDetail = {
  date: string;
  revenue: number;
  orders: number;
  /** How far from the month's daily average, in percent. */
  vsAverage: number;
  actions: DayAction[];
};

export type MonthlyReport = {
  month: string;
  monthLabel: string;
  marketplace: string | null;
  sales: {
    revenue: number;
    orders: number;
    ticket: number;
    prevRevenue: number;
    prevOrders: number;
    prevTicket: number;
    byMarketplace: { marketplace: string; revenue: number; orders: number }[];
  };
  products: {
    sku: string;
    name: string;
    revenue: number;
    units: number;
    orders: number;
    share: number;
  }[];
  ads: {
    expense: number;
    gmv: number;
    roas: number;
    acos: number;
    clicks: number;
    conversions: number;
    costPerConversion: number;
    shareOfRevenue: number;
    prevExpense: number;
    prevRoas: number;
    worst: { name: string; roas: number; expense: number } | null;
    best: { name: string; roas: number; expense: number } | null;
  } | null;
  traffic: {
    impressions: number;
    clicks: number;
    ctr: number;
    visitors: number;
    bounceRate: number;
    cartUnits: number;
    buyers: number;
    conversion: number;
    prevVisitors: number;
    prevConversion: number;
    leaking: { name: string; visitors: number; conversion: number } | null;
  } | null;
  daily: {
    days: { date: string; revenue: number; orders: number }[];
    average: number;
    best: DayDetail[];
    worst: DayDetail[];
    zeroDays: string[];
  };
  changes: {
    total: number;
    byCategory: { category: string; count: number }[];
    byStatus: { status: string; count: number }[];
    byOwner: { owner: string; count: number }[];
    /** Every action of the month, oldest first — the work log the client sees. */
    items: ReportAction[];
    pending: ReportAction[];
  };
  notes: ReportNote[];
};

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function monthLabelOf(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]} de ${y}`;
}

function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(y, m, 0).getDate();
  const prev = new Date(y, m - 2, 1);
  return {
    start: `${y}-${pad(m)}-01`,
    end: `${y}-${pad(m)}-${pad(lastDay)}`,
    prevMonth: `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}-01`,
  };
}

function pctChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function fmtPct(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1).replace(".", ",")}%`;
}

function fmtDay(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function fmtBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

type OrderRow = {
  order_id: string;
  created_on: string | null;
  marketplace: string;
  sku: string | null;
  product_name: string | null;
  quantity: number;
  subtotal: number;
  total_value: number;
  net_settlement: number;
};

export async function buildMonthlyReport(
  supabase: SupabaseClient,
  clientId: string,
  options: { month: string; marketplace?: string; sections: ReportSection[] },
): Promise<MonthlyReport> {
  const { month, marketplace, sections } = options;
  const { start, end, prevMonth } = monthBounds(month);
  const prev = monthBounds(prevMonth);

  const ordersQuery = (from: string, to: string) => {
    let q = supabase
      .from("sales_orders")
      .select(
        "order_id, created_on, marketplace, sku, product_name, quantity, subtotal, total_value, net_settlement",
      )
      .eq("client_id", clientId)
      .gte("created_on", from)
      .lte("created_on", to);
    if (marketplace) q = q.eq("marketplace", marketplace);
    return q.returns<OrderRow[]>();
  };

  const [{ data: current }, { data: previous }] = await Promise.all([
    ordersQuery(start, end),
    ordersQuery(prev.start, prev.end),
  ]);

  // An order that was cancelled or refunded was never revenue.
  const billed = (current ?? []).filter(isBilledOrder);
  const billedPrev = (previous ?? []).filter(isBilledOrder);

  const revenueOf = (rows: OrderRow[]) => rows.reduce((s, o) => s + Number(o.subtotal), 0);
  const ordersOf = (rows: OrderRow[]) => new Set(rows.map((o) => o.order_id)).size;

  const revenue = revenueOf(billed);
  const orders = ordersOf(billed);
  const prevRevenue = revenueOf(billedPrev);
  const prevOrders = ordersOf(billedPrev);

  const byMarketplace = Array.from(
    billed.reduce((map, o) => {
      const e = map.get(o.marketplace) ?? { revenue: 0, ids: new Set<string>() };
      e.revenue += Number(o.subtotal);
      e.ids.add(o.order_id);
      return map.set(o.marketplace, e);
    }, new Map<string, { revenue: number; ids: Set<string> }>()),
  )
    .map(([m, e]) => ({ marketplace: m, revenue: e.revenue, orders: e.ids.size }))
    .sort((a, b) => b.revenue - a.revenue);

  const products = sections.includes("produtos")
    ? Array.from(
        billed.reduce((map, o) => {
          const key = o.sku ?? o.product_name ?? "—";
          const e = map.get(key) ?? {
            name: o.product_name ?? key,
            revenue: 0,
            units: 0,
            ids: new Set<string>(),
          };
          e.revenue += Number(o.subtotal);
          e.units += o.quantity;
          e.ids.add(o.order_id);
          return map.set(key, e);
        }, new Map<string, { name: string; revenue: number; units: number; ids: Set<string> }>()),
      )
        .map(([sku, e]) => ({
          sku,
          name: e.name,
          revenue: e.revenue,
          units: e.units,
          orders: e.ids.size,
          share: revenue > 0 ? (e.revenue / revenue) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
    : [];

  // --- Ads -----------------------------------------------------------------
  let ads: MonthlyReport["ads"] = null;
  if (sections.includes("ads")) {
    const adsQuery = (m: string) => {
      let q = supabase
        .from("sales_ads")
        .select("ad_name, expense, gmv, clicks, conversions")
        .eq("client_id", clientId)
        .eq("report_month", m);
      if (marketplace) q = q.eq("marketplace", marketplace);
      return q.returns<
        { ad_name: string; expense: number; gmv: number; clicks: number; conversions: number }[]
      >();
    };
    const [{ data: adsNow }, { data: adsPrev }] = await Promise.all([
      adsQuery(start),
      adsQuery(prev.start),
    ]);

    if (adsNow?.length) {
      const sum = (rows: typeof adsNow, key: "expense" | "gmv" | "clicks" | "conversions") =>
        rows.reduce((s, a) => s + Number(a[key]), 0);

      const expense = sum(adsNow, "expense");
      const gmv = sum(adsNow, "gmv");
      const conversions = sum(adsNow, "conversions");
      const prevExpense = adsPrev?.length ? sum(adsPrev, "expense") : 0;
      const prevGmv = adsPrev?.length ? sum(adsPrev, "gmv") : 0;

      const spending = adsNow.filter((a) => Number(a.expense) > 0);
      const byRoas = [...spending].sort(
        (a, b) => Number(a.gmv) / Number(a.expense) - Number(b.gmv) / Number(b.expense),
      );

      ads = {
        expense,
        gmv,
        roas: expense > 0 ? gmv / expense : 0,
        acos: gmv > 0 ? (expense / gmv) * 100 : 0,
        clicks: sum(adsNow, "clicks"),
        conversions,
        costPerConversion: conversions > 0 ? expense / conversions : 0,
        shareOfRevenue: revenue > 0 ? (expense / revenue) * 100 : 0,
        prevExpense,
        prevRoas: prevExpense > 0 ? prevGmv / prevExpense : 0,
        worst: byRoas[0]
          ? {
              name: byRoas[0].ad_name,
              roas: Number(byRoas[0].gmv) / Number(byRoas[0].expense),
              expense: Number(byRoas[0].expense),
            }
          : null,
        best: byRoas.at(-1)
          ? {
              name: byRoas.at(-1)!.ad_name,
              roas: Number(byRoas.at(-1)!.gmv) / Number(byRoas.at(-1)!.expense),
              expense: Number(byRoas.at(-1)!.expense),
            }
          : null,
      };
    }
  }

  // --- Traffic -------------------------------------------------------------
  let traffic: MonthlyReport["traffic"] = null;
  if (sections.includes("trafego")) {
    const trafficQuery = (m: string) => {
      let q = supabase
        .from("sales_traffic")
        .select(
          "product_name, impressions, clicks, visitors, bounced_visitors, cart_units, buyers_paid",
        )
        .eq("client_id", clientId)
        .eq("report_month", m)
        // Variations carry no traffic of their own; counting them would
        // double the same visitor.
        .eq("is_variation", false);
      if (marketplace) q = q.eq("marketplace", marketplace);
      return q.returns<
        {
          product_name: string;
          impressions: number;
          clicks: number;
          visitors: number;
          bounced_visitors: number;
          cart_units: number;
          buyers_paid: number;
        }[]
      >();
    };
    const [{ data: tNow }, { data: tPrev }] = await Promise.all([
      trafficQuery(start),
      trafficQuery(prev.start),
    ]);

    if (tNow?.length) {
      const total = (rows: typeof tNow, key: keyof (typeof tNow)[number]) =>
        rows.reduce((s, r) => s + Number(r[key]), 0);

      const impressions = total(tNow, "impressions");
      const clicks = total(tNow, "clicks");
      const visitors = total(tNow, "visitors");
      const buyers = total(tNow, "buyers_paid");
      const prevVisitors = tPrev?.length ? total(tPrev, "visitors") : 0;
      const prevBuyers = tPrev?.length ? total(tPrev, "buyers_paid") : 0;

      // The product drawing real traffic but converting worst: where the
      // money is already being spent and the page isn't holding up.
      const candidates = tNow.filter((r) => r.visitors >= 50);
      const leaking = candidates.length
        ? candidates.reduce((worst, r) =>
            r.buyers_paid / r.visitors < worst.buyers_paid / worst.visitors ? r : worst,
          )
        : null;

      traffic = {
        impressions,
        clicks,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        visitors,
        bounceRate: visitors > 0 ? (total(tNow, "bounced_visitors") / visitors) * 100 : 0,
        cartUnits: total(tNow, "cart_units"),
        buyers,
        conversion: visitors > 0 ? (buyers / visitors) * 100 : 0,
        prevVisitors,
        prevConversion: prevVisitors > 0 ? (prevBuyers / prevVisitors) * 100 : 0,
        leaking: leaking
          ? {
              name: leaking.product_name,
              visitors: leaking.visitors,
              conversion: (leaking.buyers_paid / leaking.visitors) * 100,
            }
          : null,
      };
    }
  }

  // --- Change log ----------------------------------------------------------
  // Fetched from a couple of days before the month starts: an action taken on
  // the 30th shows its effect in the first days of the next month, and the
  // day-by-day reading looks back two days from each highlighted day.
  const lookback = addDays(start, -2);
  let changeQuery = supabase
    .from("client_changes")
    .select("changed_on, description, category, status, owner, marketplace, reason, goal")
    .eq("client_id", clientId)
    .gte("changed_on", lookback)
    .lte("changed_on", end);
  if (marketplace) changeQuery = changeQuery.eq("marketplace", marketplace);

  const { data: changeRows } = await changeQuery.returns<
    {
      changed_on: string;
      description: string;
      category: string | null;
      status: string;
      owner: string | null;
      marketplace: string | null;
      reason: string | null;
      goal: string | null;
    }[]
  >();

  const daily = buildDaily(billed, start, end, changeRows ?? []);

  let changes: MonthlyReport["changes"] = {
    total: 0,
    byCategory: [],
    byStatus: [],
    byOwner: [],
    items: [],
    pending: [],
  };
  if (sections.includes("controle")) {
    const rows = (changeRows ?? []).filter((r) => r.changed_on >= start);

    const tally = (key: "category" | "status") =>
      Array.from(
        (rows ?? []).reduce(
          (map, r) => map.set(r[key] ?? "—", (map.get(r[key] ?? "—") ?? 0) + 1),
          new Map<string, number>(),
        ),
      )
        .map(([k, count]) => ({ [key]: k, count }))
        .sort((a, b) => b.count - a.count);

    const items: ReportAction[] = (rows ?? [])
      .map((r) => ({
        date: r.changed_on,
        description: r.description,
        category: r.category,
        status: r.status,
        owner: r.owner,
        reason: r.reason,
        goal: r.goal,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Owners are typed by hand ("Léo", "léo", "LÉO"), so group case-insensitively
    // and show the spelling used most often.
    const owners = new Map<string, { label: string; count: number }>();
    for (const item of items) {
      if (!item.owner) continue;
      const key = item.owner.trim().toLowerCase();
      const entry = owners.get(key) ?? { label: item.owner.trim(), count: 0 };
      entry.count += 1;
      owners.set(key, entry);
    }

    changes = {
      total: items.length,
      byCategory: tally("category") as { category: string; count: number }[],
      byStatus: tally("status") as { status: string; count: number }[],
      byOwner: Array.from(owners.values())
        .map((o) => ({ owner: o.label, count: o.count }))
        .sort((a, b) => b.count - a.count),
      items,
      pending: items.filter((r) => r.status !== "concluida"),
    };
  }

  return {
    month,
    monthLabel: monthLabelOf(month),
    marketplace: marketplace ?? null,
    sales: {
      revenue,
      orders,
      ticket: orders > 0 ? revenue / orders : 0,
      prevRevenue,
      prevOrders,
      prevTicket: prevOrders > 0 ? prevRevenue / prevOrders : 0,
      byMarketplace,
    },
    products,
    ads,
    traffic,
    daily,
    changes,
    notes: buildNotes({
      revenue,
      prevRevenue,
      orders,
      prevOrders,
      products,
      ads,
      traffic,
      daily,
      changes,
    }),
  };
}

/**
 * Revenue day by day, with the change-log actions that could explain each
 * standout day: the ones registered that day, plus the two days before, since
 * an adjustment rarely shows its effect the same afternoon.
 */
function buildDaily(
  billed: OrderRow[],
  start: string,
  end: string,
  changeRows: { changed_on: string; description: string; category: string | null; status: string; owner: string | null }[],
): MonthlyReport["daily"] {
  const byDate = new Map<string, { revenue: number; ids: Set<string> }>();
  for (const o of billed) {
    if (!o.created_on) continue;
    const e = byDate.get(o.created_on) ?? { revenue: 0, ids: new Set<string>() };
    e.revenue += Number(o.subtotal);
    e.ids.add(o.order_id);
    byDate.set(o.created_on, e);
  }

  const days: { date: string; revenue: number; orders: number }[] = [];
  for (let date = start; date <= end; date = addDays(date, 1)) {
    const e = byDate.get(date);
    days.push({ date, revenue: e?.revenue ?? 0, orders: e?.ids.size ?? 0 });
  }

  const selling = days.filter((d) => d.revenue > 0);
  const average = selling.length
    ? selling.reduce((s, d) => s + d.revenue, 0) / selling.length
    : 0;

  const detail = (d: { date: string; revenue: number; orders: number }): DayDetail => ({
    ...d,
    vsAverage: average > 0 ? ((d.revenue - average) / average) * 100 : 0,
    actions: changeRows
      .filter((c) => c.changed_on <= d.date && c.changed_on >= addDays(d.date, -2))
      .map((c) => ({
        date: c.changed_on,
        description: c.description,
        category: c.category,
        status: c.status,
        owner: c.owner,
        sameDay: c.changed_on === d.date,
      })),
  });

  const ranked = [...selling].sort((a, b) => b.revenue - a.revenue);

  return {
    days,
    average,
    best: ranked.slice(0, 3).map(detail),
    worst: ranked.slice(-3).reverse().map(detail),
    zeroDays: days.filter((d) => d.revenue === 0).map((d) => d.date),
  };
}

/**
 * The written reading of the month. Rules rather than prose generation: each
 * note states a number the report already shows and why it matters.
 */
function buildNotes(input: {
  revenue: number;
  prevRevenue: number;
  orders: number;
  prevOrders: number;
  products: MonthlyReport["products"];
  ads: MonthlyReport["ads"];
  traffic: MonthlyReport["traffic"];
  daily: MonthlyReport["daily"];
  changes: MonthlyReport["changes"];
}): ReportNote[] {
  const notes: ReportNote[] = [];
  const { revenue, prevRevenue, orders, prevOrders, products, ads, traffic, daily, changes } = input;

  if (prevRevenue > 0) {
    const delta = pctChange(revenue, prevRevenue);
    notes.push({
      kind: delta >= 0 ? "destaque" : "alerta",
      text: `Faturamento de ${fmtBRL(revenue)}, ${fmtPct(delta)} contra ${fmtBRL(prevRevenue)} no mês anterior.`,
    });

    const orderDelta = pctChange(orders, prevOrders);
    if (Math.abs(delta - orderDelta) >= 10) {
      notes.push({
        kind: "destaque",
        text:
          delta > orderDelta
            ? `O faturamento subiu mais que o volume (${fmtPct(delta)} contra ${fmtPct(orderDelta)} em pedidos): o ticket médio puxou o resultado.`
            : `O volume cresceu mais que o faturamento (${fmtPct(orderDelta)} contra ${fmtPct(delta)}): o ticket médio caiu no período.`,
      });
    }
  } else if (revenue > 0) {
    notes.push({
      kind: "destaque",
      text: `Faturamento de ${fmtBRL(revenue)} em ${orders} pedidos. Sem mês anterior importado para comparar.`,
    });
  }

  if (products.length >= 2 && products[0].share >= 50) {
    notes.push({
      kind: "alerta",
      text: `${products[0].name} responde por ${products[0].share.toFixed(0)}% do faturamento — a receita está concentrada em um produto só.`,
    });
  }

  if (ads) {
    notes.push({
      kind: ads.roas >= 4 ? "destaque" : "alerta",
      text: `Ads: ${fmtBRL(ads.expense)} investidos geraram ${fmtBRL(ads.gmv)} (ROAS ${ads.roas.toFixed(2).replace(".", ",")}), o equivalente a ${ads.shareOfRevenue.toFixed(1).replace(".", ",")}% do faturamento do mês.`,
    });
    if (ads.worst && ads.worst.roas < 4 && ads.worst.expense > 0) {
      notes.push({
        kind: "alerta",
        text: `O anúncio "${ads.worst.name}" teve o pior retorno: ROAS ${ads.worst.roas.toFixed(2).replace(".", ",")} com ${fmtBRL(ads.worst.expense)} investidos.`,
      });
    }
  }

  if (traffic) {
    if (traffic.prevVisitors > 0) {
      notes.push({
        kind: "destaque",
        text: `${traffic.visitors.toLocaleString("pt-BR")} visitantes (${fmtPct(pctChange(traffic.visitors, traffic.prevVisitors))}), com conversão de ${traffic.conversion.toFixed(2).replace(".", ",")}%.`,
      });
    }
    if (traffic.bounceRate >= 50) {
      notes.push({
        kind: "alerta",
        text: `Taxa de rejeição de ${traffic.bounceRate.toFixed(1).replace(".", ",")}%: metade dos visitantes sai sem interagir.`,
      });
    }
    if (traffic.leaking && traffic.leaking.conversion < 1) {
      notes.push({
        kind: "alerta",
        text: `"${traffic.leaking.name}" recebeu ${traffic.leaking.visitors.toLocaleString("pt-BR")} visitantes e converteu ${traffic.leaking.conversion.toFixed(1).replace(".", ",")}% — o tráfego chega, a página não segura.`,
      });
    }
  }

  const best = daily.best[0];
  if (best) {
    const sameDay = best.actions.filter((a) => a.sameDay);
    notes.push({
      kind: "destaque",
      text:
        `Melhor dia: ${fmtDay(best.date)}, com ${fmtBRL(best.revenue)} em ${best.orders} ${best.orders === 1 ? "pedido" : "pedidos"} — ${fmtPct(best.vsAverage)} sobre a média diária.` +
        (best.actions.length
          ? ` ${sameDay.length ? "No mesmo dia" : "Nos dois dias anteriores"} houve ${best.actions.length} ${best.actions.length === 1 ? "ação" : "ações"} no Controle.`
          : " Nenhuma ação registrada no Controle nesse dia ou na véspera."),
    });
  }

  const worst = daily.worst[0];
  if (worst && daily.best.length > 1) {
    notes.push({
      kind: "alerta",
      text: `Pior dia com venda: ${fmtDay(worst.date)}, ${fmtBRL(worst.revenue)} (${fmtPct(worst.vsAverage)} da média).`,
    });
  }

  if (daily.zeroDays.length > 0) {
    notes.push({
      kind: "alerta",
      text: `${daily.zeroDays.length} ${daily.zeroDays.length === 1 ? "dia" : "dias"} sem nenhuma venda no mês.`,
    });
  }

  if (changes.total > 0) {
    notes.push({
      kind: "destaque",
      text: `${changes.total} ${changes.total === 1 ? "ação registrada" : "ações registradas"} no Controle durante o mês.`,
    });
  }
  if (changes.pending.length > 0) {
    notes.push({
      kind: "alerta",
      text: `${changes.pending.length} ${changes.pending.length === 1 ? "ação segue" : "ações seguem"} sem conclusão.`,
    });
  }

  return notes;
}
