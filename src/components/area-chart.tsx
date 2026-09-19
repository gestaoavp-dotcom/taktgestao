"use client";

import { useState } from "react";

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

function niceMax(value: number) {
  if (value <= 0) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

const WIDTH = 1000;
const HEIGHT = 280;
const PAD_LEFT = 64;
const PAD_RIGHT = 16;
const PAD_TOP = 24;
const PAD_BOTTOM = 32;

export function AreaChart({ data }: { data: { date: string; value: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const points = data.map((d, i) => ({
    x: PAD_LEFT + (data.length === 1 ? 0 : (i / (data.length - 1)) * plotW),
    y: PAD_TOP + plotH - (d.value / max) * plotH,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? PAD_LEFT} ${
    PAD_TOP + plotH
  } L ${points[0]?.x ?? PAD_LEFT} ${PAD_TOP + plotH} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const labelEvery = Math.ceil(data.length / 7);

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ height: "auto" }}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2B5FF1" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#2B5FF1" stopOpacity="0" />
          </linearGradient>
        </defs>

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
              <text x={PAD_LEFT - 10} y={y} textAnchor="end" dy="3" fontSize="11" fill="#94A0BD">
                {formatAxis(max * g)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#areaFill)" />
        <path d={linePath} fill="none" stroke="#2B5FF1" strokeWidth={2} />

        {points.map((p, i) => (
          <g key={p.date}>
            <rect
              x={p.x - plotW / data.length / 2}
              y={PAD_TOP}
              width={plotW / data.length}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
            {hover === i && (
              <line
                x1={p.x}
                x2={p.x}
                y1={PAD_TOP}
                y2={PAD_TOP + plotH}
                stroke="#132249"
                strokeOpacity={0.15}
                strokeDasharray="3,3"
              />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={hover === i ? 5 : 3}
              fill="#FFFFFF"
              stroke="#2B5FF1"
              strokeWidth={2}
            />
            {i % labelEvery === 0 && (
              <text
                x={p.x}
                y={HEIGHT - 8}
                textAnchor="middle"
                fontSize="11"
                fill="#94A0BD"
              >
                {formatDateShort(p.date)}
              </text>
            )}
          </g>
        ))}
      </svg>

      {hover !== null && points[hover] && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded bg-navy px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
          style={{
            left: `${(points[hover].x / WIDTH) * 100}%`,
            top: `${(points[hover].y / HEIGHT) * 100}%`,
          }}
        >
          <div className="text-white/70">{formatDateShort(points[hover].date)}</div>
          <div className="font-display">{formatCurrency(points[hover].value)}</div>
        </div>
      )}
    </div>
  );
}
