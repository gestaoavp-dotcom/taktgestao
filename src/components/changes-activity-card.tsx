"use client";

import { useMemo, useState } from "react";
import { AreaChart } from "@/components/area-chart";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";

function fromISO(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildDayRange(startISO: string, endISO: string) {
  const days: string[] = [];
  const cursor = fromISO(startISO);
  const end = fromISO(endISO);
  while (cursor <= end) {
    days.push(toISO(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function ChangesActivityCard({
  changes,
  clientMarketplaces,
  monthStart,
  monthEnd,
}: {
  changes: { changed_on: string; marketplace: string | null }[];
  clientMarketplaces: string[];
  monthStart: string;
  monthEnd: string;
}) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? changes : changes.filter((c) => c.marketplace === filter);

  const chartData = useMemo(() => {
    const days = buildDayRange(monthStart, monthEnd);
    const countByDay = new Map<string, number>();
    for (const c of filtered) {
      countByDay.set(c.changed_on, (countByDay.get(c.changed_on) ?? 0) + 1);
    }
    return days.map((date) => ({ date, value: countByDay.get(date) ?? 0 }));
  }, [filtered, monthStart, monthEnd]);

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-navy">Alterações por dia</h3>
          <p className="text-xs text-[#94A0BD]">
            Total no mês: <span className="font-semibold text-navy">{filtered.length}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === "all"
                ? "bg-navy text-white"
                : "border border-navy/10 text-[#5B647E] hover:bg-brand-gray"
            }`}
          >
            Todos
          </button>
          {clientMarketplaces.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setFilter(m)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === m
                  ? "bg-navy text-white"
                  : "border border-navy/10 text-[#5B647E] hover:bg-brand-gray"
              }`}
            >
              {MARKETPLACE_LABEL[m] ?? m}
            </button>
          ))}
        </div>
      </div>

      <AreaChart data={chartData} valueFormatter={(v) => String(Math.round(v))} />
    </div>
  );
}
