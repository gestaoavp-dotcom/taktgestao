"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DateField } from "@/components/date-field";
import { lastReportSunday, reportPresets } from "@/lib/report-week";

function formatBR(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

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
  // Reports for a week go up on the Monday after it: nothing past the last
  // closed Sunday is whole, so neither the shortcuts nor the calendar go there.
  const until = lastReportSunday();
  const presets = reportPresets();

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
        {presets.map((preset) => {
          const range = preset.range;
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
            max={until}
            onChange={(value) => value && apply({ start: value, end })}
          />
        </div>
        <span className="text-xs text-[#94A0BD]">até</span>
        <div className="w-36">
          <DateField
            key={`ate-${end}`}
            name="ate"
            defaultValue={end}
            min={start}
            max={until}
            onChange={(value) => value && apply({ start, end: value })}
          />
        </div>
      </div>

      <p className="w-full text-[11px] text-[#94A0BD]">
        Dados fechados até domingo, {formatBR(until)} — os relatórios da semana sobem às segundas.
      </p>
    </div>
  );
}
