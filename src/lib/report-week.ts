import type { DateRange } from "@/lib/sales-summary";

// The sales reports for a Monday-to-Sunday week go up on the Monday after it,
// so data is only whole up to the last closed Sunday. Every sales view stops
// there: a period reaching into the open week shows days not yet uploaded as
// zero, and drags the chart and every comparison down with them.

// Calendar math on plain ISO dates, in UTC, so no server time zone moves a day.
function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekday(iso: string) {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

function lastDayOfMonth(yearMonth: string) {
  const [y, m] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

function shiftMonth(yearMonth: string, delta: number) {
  const [y, m] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

/** Today in Brazil, whatever zone the code runs in. */
export function todayInBrazil() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/** The last Sunday whose week is closed — a week back when today is Sunday. */
export function lastReportSunday(today = todayInBrazil()) {
  const day = weekday(today);
  return addDays(today, day === 0 ? -7 : -day);
}

const DEFAULT_WEEKS = 4;

/**
 * The period a sales view shows: what the URL asks for, never past the last
 * closed Sunday, and four whole weeks ending there when it asks for nothing.
 */
export function reportRange(de?: string, ate?: string): DateRange {
  const until = lastReportSunday();
  const valid = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);

  let end = valid(ate) ?? until;
  if (end > until) end = until;
  let start = valid(de) ?? addDays(until, -(DEFAULT_WEEKS * 7 - 1));
  if (start > end) start = end;
  return { start, end };
}

/** Whole weeks and months, all ending no later than the last closed Sunday. */
export function reportPresets(today = todayInBrazil()) {
  const until = lastReportSunday(today);
  const weeks = (n: number) => ({ start: addDays(until, -(n * 7 - 1)), end: until });
  const month = today.slice(0, 7);
  const previous = shiftMonth(month, -1);
  const clamp = (r: DateRange) => ({ start: r.start, end: r.end > until ? until : r.end });

  const presets: { label: string; range: DateRange; note?: string }[] = [
    { label: "Última semana", range: weeks(1), note: "segunda a domingo" },
    { label: "2 semanas", range: weeks(2) },
    { label: "4 semanas", range: weeks(4) },
    { label: "12 semanas", range: weeks(12) },
    { label: "Este mês", range: clamp({ start: `${month}-01`, end: until }) },
    {
      label: "Mês passado",
      range: clamp({ start: `${previous}-01`, end: lastDayOfMonth(previous) }),
      // Its last days may still sit in a week not uploaded yet.
      note: lastDayOfMonth(previous) <= until ? "mês fechado" : "até o último domingo",
    },
    { label: "Este ano", range: clamp({ start: `${today.slice(0, 4)}-01-01`, end: until }) },
  ];

  // Early in a month its first Sunday may not have closed yet: nothing to show.
  return presets.filter((p) => p.range.start <= p.range.end);
}
