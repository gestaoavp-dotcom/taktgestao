"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DateField } from "@/components/date-field";
import { lastReportSunday, reportPresets, todayInBrazil } from "@/lib/report-week";

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
  // transition is what makes the wait visible.
  const [pending, startTransition] = useTransition();
  // Reports for a week go up on the Monday after it, so the rolling shortcuts
  // end on the last closed Sunday; a date picked by hand may go up to today.
  const until = lastReportSunday();
  const today = todayInBrazil();
  const presets = reportPresets();
  // Whichever shortcut matches the period on screen; none means dates typed by hand.
  const current = presets.find((p) => p.range.start === start && p.range.end === end)?.label ?? "";

  const apply = (range: { start: string; end: string }) => {
    // Keep whatever else is filtering the page, like the marketplace.
    const params = new URLSearchParams(searchParams);
    params.set("de", range.start);
    params.set("ate", range.end);
    startTransition(() => router.push(`${pathname}?${params}`));
  };

  return (
    <div className={`transition-opacity ${pending ? "opacity-60" : ""}`}>
      {/* One control, not three loose ones: the shortcut and the two dates are
          the same decision, so they share a border and read left to right. */}
      <div className="flex w-fit items-center rounded-lg border border-navy/10 bg-white">
      <select
        aria-label="Período"
        value={current}
        onChange={(e) => {
          const preset = presets.find((p) => p.label === e.target.value);
          if (preset) apply(preset.range);
        }}
        className="rounded-l-lg border-r border-navy/10 bg-transparent py-2 pl-3 pr-2 text-sm font-semibold text-navy outline-none focus:bg-brand-gray/40"
      >
        {!current && <option value="">Personalizado</option>}
        {presets.map((preset) => (
          <option key={preset.label} value={preset.label}>
            {preset.label}
            {preset.note ? ` (${preset.note})` : ""}
          </option>
        ))}
      </select>

        <div className="w-32">
          <DateField
            key={`de-${start}`}
            name="de"
            defaultValue={start}
            max={today}
            onChange={(value) => value && apply({ start: value, end })}
            className="flex w-full items-center justify-between gap-1 border-0 bg-transparent px-2 py-2 text-sm outline-none hover:bg-brand-gray/40"
          />
        </div>
        <span className="text-xs text-[#94A0BD]">até</span>
        <div className="w-32">
          <DateField
            key={`ate-${end}`}
            name="ate"
            defaultValue={end}
            min={start}
            max={today}
            onChange={(value) => value && apply({ start, end: value })}
            className="flex w-full items-center justify-between gap-1 rounded-r-lg border-0 bg-transparent px-2 py-2 text-sm outline-none hover:bg-brand-gray/40"
          />
        </div>

        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#94A0BD]" />}
      </div>

      <p className="mt-1.5 text-[11px] text-[#94A0BD]">
        Dados fechados até domingo, {formatBR(until)} — os relatórios da semana sobem às segundas.
      </p>
    </div>
  );
}
