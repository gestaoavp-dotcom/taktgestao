"use client";

import { useState } from "react";

export function BarChart({
  data,
  formatValue,
  formatDate,
}: {
  data: { date: string; value: number }[];
  formatValue: (value: number) => string;
  formatDate: (date: string) => string;
}) {
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
                <div>{formatDate(d.date)}</div>
                <div className="font-display">{formatValue(d.value)}</div>
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
        <span>{formatDate(data[0]?.date)}</span>
        <span>{formatDate(data[data.length - 1]?.date)}</span>
      </div>
    </div>
  );
}
