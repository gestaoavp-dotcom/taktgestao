"use client";

import { useState } from "react";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateShort(date: string) {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}

export function BarChart({ data }: { data: { date: string; value: number }[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="relative">
      <div className="flex h-48 items-end gap-[2px]">
        {data.map((d, i) => (
          <div
            key={d.date}
            className="group relative flex-1"
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
          >
            {hoverIndex === i && (
              <div className="absolute -top-11 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-navy px-2 py-1 text-xs font-medium text-white shadow-lg">
                <div>{formatDateShort(d.date)}</div>
                <div className="font-display">{formatCurrency(d.value)}</div>
              </div>
            )}
            <div
              className={`w-full rounded-t transition-colors ${
                hoverIndex === i ? "bg-navy" : "bg-blue"
              }`}
              style={{
                height: `${Math.max(2, (d.value / max) * 100)}%`,
                minHeight: 2,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-[#94A0BD]">
        <span>{data[0] ? formatDateShort(data[0].date) : ""}</span>
        <span>{data.length ? formatDateShort(data[data.length - 1].date) : ""}</span>
      </div>
    </div>
  );
}
