"use client";

import { useState } from "react";

const WIDTH = 1000;
const HEIGHT = 280;
const PAD_LEFT = 40;
const PAD_RIGHT = 16;
const PAD_TOP = 24;
const PAD_BOTTOM = 32;
const GAP = 4;

function niceMax(value: number) {
  if (value <= 0) return 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function BarChart({
  data,
  valueFormatter = (v) => String(v),
}: {
  data: { date: string; value: number; label: string; tooltipLabel: string }[];
  valueFormatter?: (value: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const slot = data.length ? plotW / data.length : 0;
  const barW = Math.max(1, slot - GAP);

  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const labelEvery = Math.max(1, Math.ceil(data.length / 10));

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ height: "auto" }}>
        {gridLines.map((g) => {
          const y = PAD_TOP + plotH * (1 - g);
          return (
            <g key={g}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={y}
                y2={y}
                stroke="#E8EBEF"
                strokeWidth={1}
              />
              <text x={PAD_LEFT - 8} y={y} textAnchor="end" dy="3" fontSize="11" fill="#94A0BD">
                {valueFormatter(Math.round(max * g))}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const x = PAD_LEFT + i * slot;
          const h = (d.value / max) * plotH;
          const y = PAD_TOP + plotH - h;
          const isHover = hover === i;
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={PAD_TOP}
                width={slot}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
              <rect
                x={x + GAP / 2}
                y={d.value > 0 ? y : PAD_TOP + plotH - 2}
                width={barW}
                height={d.value > 0 ? h : 2}
                rx={2}
                fill={isHover ? "#132249" : d.value > 0 ? "#2B5FF1" : "#E8EBEF"}
              />
              {i % labelEvery === 0 && (
                <text x={x + slot / 2} y={HEIGHT - 8} textAnchor="middle" fontSize="11" fill="#94A0BD">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hover !== null && data[hover] && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded bg-navy px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
          style={{
            left: `${((PAD_LEFT + hover * slot + slot / 2) / WIDTH) * 100}%`,
            top: `${(Math.max(PAD_TOP, PAD_TOP + plotH - (data[hover].value / max) * plotH) / HEIGHT) * 100}%`,
          }}
        >
          <div className="text-white/70">{data[hover].tooltipLabel}</div>
          <div className="font-display">{valueFormatter(data[hover].value)}</div>
        </div>
      )}
    </div>
  );
}
