"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
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

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromISO(value: string | null | undefined) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatBR(value: string) {
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

function buildMonthGrid(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DateField({
  name,
  defaultValue,
  placeholder = "dd/mm/aaaa",
  required,
  className,
  onChange,
}: {
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
  className?: string;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => fromISO(defaultValue) ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const commit = (next: string) => {
    setValue(next);
    onChange?.(next);
  };

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const days = buildMonthGrid(viewDate);
  const selected = fromISO(value);

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} required={required} />
      <button
        type="button"
        onClick={() => {
          setViewDate(fromISO(value) ?? new Date());
          setOpen((o) => !o);
        }}
        className={
          className ??
          "flex w-full items-center justify-between rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
        }
      >
        <span className={value ? "text-navy" : "text-[#94A0BD]"}>
          {value ? formatBR(value) : placeholder}
        </span>
        <Calendar className="h-4 w-4 flex-shrink-0 text-[#94A0BD]" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-64 rounded-lg border border-navy/10 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
              className="rounded p-1 text-[#5B647E] hover:bg-brand-gray"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-navy">
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
              className="rounded p-1 text-[#5B647E] hover:bg-brand-gray"
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] font-semibold text-[#94A0BD]">
            {WEEKDAYS.map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {days.map((d, i) =>
              d ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    commit(toISO(d));
                    setOpen(false);
                  }}
                  className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors ${
                    selected && toISO(d) === toISO(selected)
                      ? "bg-navy font-semibold text-white"
                      : "text-navy hover:bg-brand-gray"
                  }`}
                >
                  {d.getDate()}
                </button>
              ) : (
                <span key={i} />
              ),
            )}
          </div>

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                commit(toISO(new Date()));
                setOpen(false);
              }}
              className="flex-1 rounded-lg border border-navy/10 py-1 text-xs font-semibold text-navy hover:bg-brand-gray"
            >
              Hoje
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  commit("");
                  setOpen(false);
                }}
                className="flex-1 rounded-lg border border-navy/10 py-1 text-xs font-semibold text-[#5B647E] hover:bg-brand-gray"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
