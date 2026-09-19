"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DateField } from "@/components/date-field";

function toISO(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function lastDays(days: number) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return { start: toISO(start), end: toISO(end) };
}

function monthOf(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { start: toISO(start), end: toISO(offset === 0 ? now : end) };
}

const PRESETS = [
  { label: "7 dias", range: () => lastDays(7) },
  { label: "30 dias", range: () => lastDays(30) },
  { label: "Este mês", range: () => monthOf(0) },
  { label: "Mês passado", range: () => monthOf(-1) },
];

export function DateRangePicker({ start, end }: { start: string; end: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const apply = (range: { start: string; end: string }) => {
    // Keep whatever else is filtering the page, like the marketplace.
    const params = new URLSearchParams(searchParams);
    params.set("de", range.start);
    params.set("ate", range.end);
    router.push(`${pathname}?${params}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => {
          const range = preset.range();
          const active = range.start === start && range.end === end;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => apply(range)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-navy text-white"
                  : "border border-navy/10 text-[#5B647E] hover:bg-brand-gray"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5">
        <div className="w-36">
          <DateField
            key={`de-${start}`}
            name="de"
            defaultValue={start}
            onChange={(value) => value && apply({ start: value, end })}
          />
        </div>
        <span className="text-xs text-[#94A0BD]">até</span>
        <div className="w-36">
          <DateField
            key={`ate-${end}`}
            name="ate"
            defaultValue={end}
            onChange={(value) => value && apply({ start, end: value })}
          />
        </div>
      </div>
    </div>
  );
}
