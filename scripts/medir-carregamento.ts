/*
 * Measures what each page reads from the database, and how long it takes.
 *
 *   npx tsx scripts/medir-carregamento.ts
 *   npm run medir
 *
 * Exists because every performance problem in this project was found by
 * measuring and none by guessing. Twice the thing that looked slow was not the
 * thing that was slow, and twice a number that looked plausible was capped at
 * a thousand rows.
 *
 * Run it after adding a page that lists rows, and before believing a page is
 * fast. The budgets below are what "fine" looks like today; a page over them
 * is not necessarily broken, but it is the one to look at first.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { ORDER_LIST_COLUMNS } from "../src/lib/sales-columns.ts";

const BUDGET_KB = 1500;
const BUDGET_MS = 1500;

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);

async function readAll(table: string, columns: string, clientId?: string) {
  const started = Date.now();
  let rows: unknown[] = [];

  for (let from = 0; ; from += 1000) {
    let q = db.from(table).select(columns).order("id").range(from, from + 999);
    if (clientId) q = q.eq("client_id", clientId);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    rows = rows.concat(data);
    if (data.length < 1000) break;
  }

  return {
    rows: rows.length,
    ms: Date.now() - started,
    kb: Math.round(Buffer.byteLength(JSON.stringify(rows)) / 1024),
  };
}

const { data: clients } = await db.from("clients").select("id, name").order("name");

const checks: { page: string; run: () => ReturnType<typeof readAll> }[] = [
  { page: "Produtos", run: () => readAll("sales_products", "*") },
  { page: "Ads", run: () => readAll("sales_ads", "*") },
  { page: "Tráfego", run: () => readAll("sales_traffic", "*") },
  { page: "Controle", run: () => readAll("client_changes", "*") },
];

for (const c of clients ?? []) {
  checks.push({
    page: `Pedidos · ${c.name}`,
    run: () => readAll("sales_orders", ORDER_LIST_COLUMNS, c.id),
  });
}

console.log("página                        linhas       KB      ms");
console.log("─".repeat(58));

let over = 0;
for (const check of checks) {
  const r = await check.run();
  if (!r.rows) continue;
  const heavy = r.kb > BUDGET_KB || r.ms > BUDGET_MS;
  if (heavy) over++;
  console.log(
    `${check.page.padEnd(28)} ${String(r.rows).padStart(6)} ${String(r.kb).padStart(8)} ${String(r.ms).padStart(7)}${heavy ? "  ← acima do orçamento" : ""}`,
  );
}

console.log("─".repeat(58));
console.log(
  over
    ? `${over} página(s) acima de ${BUDGET_KB} KB ou ${BUDGET_MS} ms — vale olhar.`
    : `Todas dentro de ${BUDGET_KB} KB e ${BUDGET_MS} ms.`,
);
