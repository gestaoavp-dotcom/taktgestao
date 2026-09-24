"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
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

/** A single past day, start and end alike. */
function dayBefore(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return { start: toISO(d), end: toISO(d) };
}

function yearOf(offset: number) {
  const now = new Date();
  const year = now.getFullYear() + offset;
  return {
    start: `${year}-01-01`,
    end: offset === 0 ? toISO(now) : `${year}-12-31`,
  };
}

const PRESETS = [
  { label: "Hoje", range: () => dayBefore(0) },
  { label: "Ontem", range: () => dayBefore(1) },
  { label: "7 dias", range: () => lastDays(7) },
  { label: "14 dias", range: () => lastDays(14) },
  { label: "30 dias", range: () => lastDays(30) },
  { label: "90 dias", range: () => lastDays(90) },
  { label: "Este mês", range: () => monthOf(0) },
  // A closed month is the only window that includes marketplaces reporting by
  // month rather than by order, so it earns its place beside the rolling ones.
  { label: "Mês passado", range: () => monthOf(-1), note: "mês fechado" },
  { label: "Este ano", range: () => yearOf(0) },
];

export function DateRangePicker({ start, end }: { start: string; end: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Changing only the query string re-renders the page without remounting the
  // route, so loading.tsx never fires and nothing on screen moves. The
  // transition is what makes the wait visible, and it shows up on the control
  // that was actually clicked.
  const [pending, startTransition] = useTransition();
  // Which button was pressed. The active one is still the old window until the
  // navigation lands, so it is the wrong place to put the spinner.
  const [clicked, setClicked] = useState<string | null>(null);

  const apply = (range: { start: string; end: string }, label?: string) => {
    setClicked(label ?? null);
    // Keep whatever else is filtering the page, like the marketplace.
    const params = new URLSearchParams(searchParams);
    params.set("de", range.start);
    params.set("ate", range.end);
    startTransition(() => router.push(`${pathname}?${params}`));
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-2 transition-opacity ${
        pending ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => {
          const range = preset.range();
          const active = range.start === start && range.end === end;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => apply(range, preset.label)}
              title={preset.note}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-navy text-white"
                  : "border border-navy/10 text-[#5B647E] hover:bg-brand-gray"
              }`}
            >
              <span className="flex items-center gap-1.5">
                {preset.label}
                {pending && clicked === preset.label && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
              </span>
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
