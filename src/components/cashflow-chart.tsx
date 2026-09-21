export type MonthPoint = {
  key: string;
  label: string;
  recebido: number;
  fixed: number;
  variable: number;
};

const COLORS = {
  recebido: "#2b5ff1",
  fixed: "#132249",
  variable: "#f1bf44",
};

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function CashflowChart({ months }: { months: MonthPoint[] }) {
  const width = 700;
  const height = 300;
  const left = 64;
  const right = 16;
  const top = 16;
  const bottom = 240;
  const plotWidth = width - left - right;
  const plotHeight = bottom - top;

  const max = Math.max(1, ...months.flatMap((m) => [m.recebido, m.fixed, m.variable]));
  const slotWidth = plotWidth / Math.max(months.length, 1);
  const barGap = 4;
  const barWidth = (slotWidth - barGap * 4) / 3;
  const yFor = (value: number) => bottom - (value / max) * plotHeight;
  const gridSteps = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Recebido e despesas por mês"
      >
        {gridSteps.map((step) => {
          const y = bottom - step * plotHeight;
          return (
            <g key={step}>
              <line x1={left} y1={y} x2={width - right} y2={y} stroke="#e8ebef" strokeWidth={1} />
              <text x={left - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#94A0BD">
                {formatCompactCurrency(max * step)}
              </text>
            </g>
          );
        })}

        {months.map((m, i) => {
          const slotX = left + i * slotWidth;
          const bars = [
            { value: m.recebido, color: COLORS.recebido },
            { value: m.fixed, color: COLORS.fixed },
            { value: m.variable, color: COLORS.variable },
          ];

          return (
            <g key={m.key}>
              {bars.map((bar, j) => {
                const x = slotX + barGap + j * (barWidth + barGap);
                const y = yFor(bar.value);
                return (
                  <rect
                    key={j}
                    x={x}
                    y={y}
                    width={Math.max(0, barWidth)}
                    height={Math.max(0, bottom - y)}
                    rx={2}
                    fill={bar.color}
                  />
                );
              })}
              <text
                x={slotX + slotWidth / 2}
                y={height - 8}
                textAnchor="middle"
                fontSize={11}
                fill="#5B647E"
              >
                {m.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex items-center justify-center gap-5 text-xs text-[#5B647E]">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS.recebido }} />
          Recebido
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS.fixed }} />
          Despesas fixas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS.variable }} />
          Despesas variáveis
        </span>
      </div>
    </div>
  );
}
