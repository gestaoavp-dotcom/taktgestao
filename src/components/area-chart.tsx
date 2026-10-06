"use client";

import { useState } from "react";

type Day = { date: string; value: number };

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/** Axis ticks are scale markers, not amounts — cents would just add noise. */
function formatAxis(value: number) {
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

/** Built from the parts, so the day never slips a timezone on the way in. */
function weekdayOf(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d)
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "");
}

function niceMax(value: number) {
  if (value <= 0) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/**
 * About eight dates across the axis, with the last day always among them: it's
 * the end of the period, and a chart that stops labelling ten days early reads
 * as if it ended there. A neighbour too close to it is dropped instead.
 */
function labelledDays(count: number): Set<number> {
  const step = Math.max(1, Math.ceil(count / 8));
  const labels = new Set<number>();
  for (let i = 0; i < count; i += step) labels.add(i);

  const last = count - 1;
  if (last > 0) {
    const previous = Math.floor(last / step) * step;
    if (last - previous < step * 0.6) labels.delete(previous);
    labels.add(last);
  }
  return labels;
}

const WIDTH = 1000;
const HEIGHT = 280;
const PAD_LEFT = 68;
const PAD_RIGHT = 16;
const PAD_TOP = 28;
const PAD_BOTTOM = 32;

export function AreaChart({ data }: { data: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const peak = data.reduce((best, d) => (d.value > best ? d.value : best), 0);
  const max = niceMax(peak);
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const baseline = PAD_TOP + plotH;

  const points = data.map((d, i) => ({
    x: PAD_LEFT + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW),
    y: baseline - (d.value / max) * plotH,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? PAD_LEFT} ${baseline} L ${
    points[0]?.x ?? PAD_LEFT
  } ${baseline} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const labels = labelledDays(data.length);
  const band = plotW / Math.max(data.length, 1);

  // The best day, named on the chart: without it the only numbers are the axis,
  // and the shape says nothing about how big the high point actually was.
  const peakIndex = peak > 0 ? points.findIndex((p) => p.value === peak) : -1;

  if (data.length === 0 || peak === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-ink-3">
        Nenhum faturamento nesse período.
      </div>
    );
  }

  const active = hover !== null ? points[hover] : null;
  const activeLeft = active ? (active.x / WIDTH) * 100 : 0;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        style={{ height: "auto" }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridLines.map((g) => {
          const y = baseline - plotH * g;
          return (
            <g key={g}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={y}
                y2={y}
                stroke={g === 0 ? "var(--chart-base)" : "var(--chart-grid)"}
                strokeWidth={1}
              />
              <text x={PAD_LEFT - 12} y={y} textAnchor="end" dy="3" fontSize="11" fill="var(--ink-3)">
                {formatAxis(max * g)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#areaFill)" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {active && (
          <line
            x1={active.x}
            x2={active.x}
            y1={PAD_TOP}
            y2={baseline}
            stroke="var(--ink)"
            strokeOpacity={0.18}
            strokeDasharray="3,3"
          />
        )}

        {/* A day with no sale gets no marker: ninety dots sitting on the
            baseline read as data, when they are the absence of it. */}
        {points.map((p, i) =>
          p.value > 0 ? (
            <circle
              key={`dot-${p.date}`}
              cx={p.x}
              cy={p.y}
              r={hover === i ? 5 : 3}
              fill="var(--panel)"
              stroke="var(--chart-1)"
              strokeWidth={2}
            />
          ) : null,
        )}

        {peakIndex >= 0 && hover === null && (
          <text
            x={Math.min(Math.max(points[peakIndex].x, PAD_LEFT + 40), WIDTH - PAD_RIGHT - 40)}
            y={Math.max(points[peakIndex].y - 12, PAD_TOP - 8)}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="var(--ink)"
          >
            {formatAxis(peak)}
          </text>
        )}

        {points.map((p, i) => (
          <g key={p.date}>
            <rect
              x={p.x - band / 2}
              y={PAD_TOP}
              width={band}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onTouchStart={() => setHover(i)}
            />
            {labels.has(i) && (
              <text x={p.x} y={HEIGHT - 8} textAnchor="middle" fontSize="11" fill="var(--ink-3)">
                {formatDateShort(p.date)}
              </text>
            )}
          </g>
        ))}
      </svg>

      {active && (
        <div
          className={`pointer-events-none absolute -translate-y-full rounded-md bg-action px-2.5 py-1.5 text-xs font-medium text-on-accent shadow-lg ${
            activeLeft < 10 ? "" : activeLeft > 90 ? "-translate-x-full" : "-translate-x-1/2"
          }`}
          style={{
            left: `${activeLeft}%`,
            top: `${((active.value > 0 ? active.y - 10 : baseline - 10) / HEIGHT) * 100}%`,
          }}
        >
          <div className="text-on-accent/70">
            {weekdayOf(active.date)}, {formatDateShort(active.date)}
          </div>
          <div className="font-display">{formatCurrency(active.value)}</div>
        </div>
      )}
    </div>
  );
}
