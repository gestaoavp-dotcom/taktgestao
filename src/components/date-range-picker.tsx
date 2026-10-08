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
          the same decision, so they share a border and read left to right.
          Three of them side by side need about 400 px, which a phone does not
          have — below sm they stack into two rows, and that overflow was what
          pushed the whole page wider than the screen. */}
      <div className="flex w-full flex-col gap-2 sm:w-fit sm:flex-row sm:items-center sm:gap-0 sm:rounded-lg sm:border sm:border-line sm:bg-panel">
      <select
        aria-label="Período"
        value={current}
        onChange={(e) => {
          const preset = presets.find((p) => p.label === e.target.value);
          if (preset) apply(preset.range);
        }}
        className="w-full rounded-lg border border-line bg-panel py-2 pl-3 pr-2 text-sm font-semibold text-ink outline-none focus:bg-panel-2/40 sm:w-auto sm:rounded-none sm:rounded-l-lg sm:border-0 sm:border-r sm:bg-transparent"
      >
        {!current && <option value="">Personalizado</option>}
        {presets.map((preset) => (
          <option key={preset.label} value={preset.label}>
            {preset.label}
            {preset.note ? ` (${preset.note})` : ""}
          </option>
        ))}
      </select>

        <div className="flex w-full items-center rounded-lg border border-line bg-panel sm:contents">
        <div className="min-w-0 flex-1 sm:w-32 sm:flex-none">
          <DateField
            key={`de-${start}`}
            name="de"
            defaultValue={start}
            max={today}
            onChange={(value) => value && apply({ start: value, end })}
            className="flex w-full items-center justify-between gap-1 border-0 bg-transparent px-2 py-2 text-sm outline-none hover:bg-panel-2/40"
          />
        </div>
        <span className="flex-none px-1 text-xs text-ink-3">até</span>
        <div className="min-w-0 flex-1 sm:w-32 sm:flex-none">
          <DateField
            key={`ate-${end}`}
            name="ate"
            defaultValue={end}
            min={start}
            max={today}
            onChange={(value) => value && apply({ start, end: value })}
            className="flex w-full items-center justify-between gap-1 rounded-r-lg border-0 bg-transparent px-2 py-2 text-sm outline-none hover:bg-panel-2/40"
          />
        </div>

        </div>

        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin text-ink-3" />}
      </div>

      <p className="mt-1.5 text-[11px] text-ink-3">
        Dados fechados até domingo, {formatBR(until)} — os relatórios da semana sobem às segundas.
      </p>
    </div>
  );
}
