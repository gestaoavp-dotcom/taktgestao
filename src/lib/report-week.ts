import type { DateRange } from "@/lib/sales-summary";

// The sales reports for a Monday-to-Sunday week go up on the Monday after it,
// so data is only whole up to the last closed Sunday. The default period and
// the rolling shortcuts end there: reaching into the open week would show days
// not yet uploaded as zero, and drag the chart and every comparison down.

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

const DEFAULT_DAYS = 30;

/**
 * The period a sales view shows: the 30 days ending on the last closed Sunday
 * when the URL asks for nothing, and otherwise whatever it asks for — Hoje and
 * Ontem are for a look at days not uploaded yet, so a chosen period is not cut.
 */
export function reportRange(de?: string, ate?: string): DateRange {
  const until = lastReportSunday();

  const end = realDate(ate) ?? until;
  let start = realDate(de) ?? addDays(until, -(DEFAULT_DAYS - 1));
  if (start > end) start = end;
  // A period is drawn day by day and compared with one just as long before it,
  // so an address asking for decades would build tens of thousands of points.
  const earliest = addDays(end, -(MAX_DAYS - 1));
  if (start < earliest) start = earliest;
  return { start, end };
}

/** Longest period a sales view shows: three years. */
const MAX_DAYS = 3 * 366;

/**
 * The date when it is a real one. "2026-02-31" has the right shape and is no
 * day at all — passed on, the database refuses it and the page shows zeros.
 */
function realDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value ? value : undefined;
}

/**
 * The shortcuts. The rolling ones, this month and this year end on the last
 * closed Sunday, where the data is whole; Hoje and Ontem are those very days;
 * Mês passado is the whole month.
 */
export function reportPresets(today = todayInBrazil()) {
  const until = lastReportSunday(today);
  const days = (n: number) => ({ start: addDays(until, -(n - 1)), end: until });
  const day = (offset: number) => ({ start: addDays(today, offset), end: addDays(today, offset) });
  const month = today.slice(0, 7);
  const previous = shiftMonth(month, -1);
  // Early in a month, before its first Sunday closes, there is no closed part
  // of it yet: the month so far is all there is to show.
  const monthEnd = until >= `${month}-01` ? until : today;
  const yearStart = `${today.slice(0, 4)}-01-01`;

  return [
    { label: "Hoje", range: day(0) },
    { label: "Ontem", range: day(-1) },
    { label: "7 dias", range: days(7) },
    { label: "14 dias", range: days(14) },
    { label: "30 dias", range: days(30) },
    { label: "90 dias", range: days(90) },
    { label: "Este mês", range: { start: `${month}-01`, end: monthEnd } },
    {
      label: "Mês passado",
      range: { start: `${previous}-01`, end: lastDayOfMonth(previous) },
      note: "mês fechado",
    },
    { label: "Este ano", range: { start: yearStart, end: until >= yearStart ? until : today } },
  ] as { label: string; range: DateRange; note?: string }[];
}
