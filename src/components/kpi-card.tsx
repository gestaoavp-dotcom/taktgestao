"use client";

import { Users, Wallet, Package, Receipt, ArrowUp, ArrowDown } from "lucide-react";

const ICONS = { users: Users, wallet: Wallet, package: Package, receipt: Receipt };
const ICON_STYLES = {
  users: "bg-blue/10 text-blue",
  wallet: "bg-green-100 text-green-700",
  package: "bg-yellow/20 text-navy",
  receipt: "bg-navy/10 text-navy",
};

export function KpiCard({
  label,
  value,
  trend,
  icon,
}: {
  label: string;
  value: string;
  trend: number;
  icon: keyof typeof ICONS;
}) {
  const Icon = ICONS[icon];
  const positive = trend >= 0;

  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <p className="text-sm text-[#5B647E]">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${ICON_STYLES[icon]}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      <p className="font-display text-2xl font-bold text-navy">{value}</p>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-[#94A0BD]">
        <span
          className={`inline-flex items-center gap-0.5 font-medium ${
            positive ? "text-green-600" : "text-red-600"
          }`}
        >
          {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {Math.abs(trend).toFixed(1)}%
        </span>
        vs período anterior
      </div>
    </div>
  );
}
