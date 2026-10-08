"use client";

import {
  Users,
  Wallet,
  Package,
  Receipt,
  Megaphone,
  Percent,
  Coins,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

const ICONS = {
  users: Users,
  wallet: Wallet,
  package: Package,
  receipt: Receipt,
  megaphone: Megaphone,
  percent: Percent,
  profit: Coins,
};
// One accent on the card. Gold belongs to profit, and none of these figures
// is profit — "receipt" is the average ticket.
const ICON_STYLES = {
  users: "bg-accent/10 text-accent-ink",
  wallet: "bg-accent/10 text-accent-ink",
  package: "bg-accent/10 text-accent-ink",
  receipt: "bg-accent/10 text-accent-ink",
  megaphone: "bg-accent/10 text-accent-ink",
  percent: "bg-accent/10 text-accent-ink",
  // Gold is what was left over, and only that.
  profit: "bg-gold/15 text-gold-ink",
};

export function KpiCard({
  label,
  value,
  trend,
  icon,
  invert = false,
  sub,
  note,
}: {
  label: string;
  value: string;
  /** Left out when there is nothing meaningful to compare against. */
  trend?: number;
  icon: keyof typeof ICONS;
  /** For a figure where going up is the bad direction, such as a cost. */
  invert?: boolean;
  /** A smaller figure right under the main one. */
  sub?: string;
  /** A line under the figure, for what it leaves out. */
  note?: string;
}) {
  const Icon = ICONS[icon];
  const up = (trend ?? 0) >= 0;
  const good = invert ? !up : up;

  return (
    <div className="lift rounded-2xl bg-panel p-3.5 shadow-sm sm:p-5">
      <div className="mb-2.5 flex items-start justify-between gap-3 sm:mb-3">
        {/* Small label in caps, big bold figure — the moodboard's rule for
            every number in the app. */}
        <p className="pt-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-3 sm:pt-1 sm:text-[11px]">
          {label}
        </p>
        <div className={`hidden h-9 w-9 flex-none items-center justify-center rounded-full sm:flex ${ICON_STYLES[icon]}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      <p className="font-display text-[19px] font-extrabold leading-none tracking-[-0.02em] text-ink sm:text-[28px]">
        {value}
      </p>
      {sub && <p className="mt-1.5 text-xs font-semibold text-ink-2">{sub}</p>}
      {trend !== undefined && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-3 sm:mt-3 sm:text-xs">
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              good ? "bg-pos/10 text-pos" : "bg-danger/10 text-danger"
            }`}
          >
            {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
          <span className="hidden sm:inline">vs período anterior</span>
        </div>
      )}
      {note && <p className="mt-2 text-xs leading-snug text-ink-2">{note}</p>}
    </div>
  );
}
