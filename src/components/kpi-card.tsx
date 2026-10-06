"use client";

import { Users, Wallet, Package, Receipt, ArrowUp, ArrowDown } from "lucide-react";

const ICONS = { users: Users, wallet: Wallet, package: Package, receipt: Receipt };
// Blue carries data, gold carries what was left over — and nothing else on
// the card is allowed a third accent.
const ICON_STYLES = {
  users: "bg-accent/10 text-accent-ink",
  wallet: "bg-accent/10 text-accent-ink",
  package: "bg-accent/10 text-accent-ink",
  receipt: "bg-gold/15 text-gold-ink",
};

export function KpiCard({
  label,
  value,
  trend,
  icon,
  sub,
  note,
}: {
  label: string;
  value: string;
  trend: number;
  icon: keyof typeof ICONS;
  /** A smaller figure right under the main one. */
  sub?: string;
  /** A line under the figure, for what it leaves out. */
  note?: string;
}) {
  const Icon = ICONS[icon];
  const positive = trend >= 0;

  return (
    <div className="rounded-lg bg-panel p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <p className="text-sm text-ink-2">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${ICON_STYLES[icon]}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      <p className="font-display text-2xl font-bold text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs font-semibold text-ink-2">{sub}</p>}
      <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-3">
        <span
          className={`inline-flex items-center gap-0.5 font-medium ${
            positive ? "text-pos" : "text-danger"
          }`}
        >
          {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {Math.abs(trend).toFixed(1)}%
        </span>
        vs período anterior
      </div>
      {note && <p className="mt-2 text-xs leading-snug text-ink-2">{note}</p>}
    </div>
  );
}
