"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart } from "@/components/bar-chart";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isoOf(year: number, month: number, day: number) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

export function ChangesActivityCard({
  changes,
  clientMarketplaces,
}: {
  changes: { changed_on: string; marketplace: string | null }[];
  clientMarketplaces: string[];
}) {
  const [filter, setFilter] = useState<string>("all");
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const isCurrentMonth = view.year === now.getFullYear() && view.month === now.getMonth();

  const filtered = filter === "all" ? changes : changes.filter((c) => c.marketplace === filter);

  const { chartData, total } = useMemo(() => {
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const countByDay = new Map<string, number>();
    for (const c of filtered) {
      countByDay.set(c.changed_on, (countByDay.get(c.changed_on) ?? 0) + 1);
    }

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const date = isoOf(view.year, view.month, day);
      return {
        date,
        value: countByDay.get(date) ?? 0,
        label: day % 5 === 0 || day === 1 ? String(day) : "",
        tooltipLabel: `${pad2(day)}/${pad2(view.month + 1)}`,
      };
    });

    return { chartData: days, total: days.reduce((sum, d) => sum + d.value, 0) };
  }, [filtered, view]);

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-navy">Gráfico de Controle de Alterações</h3>
          <p className="text-xs text-[#94A0BD]">Ações registradas em Controle, por dia</p>
        </div>

        <div className="rounded-lg bg-blue/5 px-5 py-2 text-right">
          <div className="font-display text-3xl font-bold leading-none text-navy">{total}</div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#5B647E]">
            alterações em {MONTHS[view.month].toLowerCase()}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const d = new Date(view.year, view.month - 1, 1);
              setView({ year: d.getFullYear(), month: d.getMonth() });
            }}
            aria-label="Mês anterior"
            className="rounded-lg border border-navy/10 p-1.5 text-[#5B647E] hover:bg-brand-gray"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="w-40 text-center text-sm font-semibold text-navy">
            {MONTHS[view.month]} {view.year}
          </span>
          <button
            type="button"
            onClick={() => {
              const d = new Date(view.year, view.month + 1, 1);
              setView({ year: d.getFullYear(), month: d.getMonth() });
            }}
            disabled={isCurrentMonth}
            aria-label="Próximo mês"
            className="rounded-lg border border-navy/10 p-1.5 text-[#5B647E] hover:bg-brand-gray disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
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

      <BarChart data={chartData} />
    </div>
  );
}
