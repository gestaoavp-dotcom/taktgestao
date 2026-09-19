// The shape every marketplace's order breakdown produces, so the Pedidos table
// renders any of them without knowing which platform it is looking at.

export type BreakdownLine = {
  label: string;
  note?: string;
  value: number;
  /** item: adds · deduction: subtracts · info: shown but never counted */
  kind: "item" | "deduction" | "info";
};

export type BreakdownSection = {
  title: string;
  note?: string;
  lines: BreakdownLine[];
  total: number;
  /** Sections whose total is subtracted from the order's income. */
  subtracted?: boolean;
  /** false = shown for context only, never part of the net. */
  counted?: boolean;
};

export type OrderBreakdown = {
  sections: BreakdownSection[];
  net: number;
  voided: boolean;
  shared: boolean;
  otherFields: { label: string; value: unknown }[];
};

export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const n = parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function round(value: number) {
  return Math.round(value * 100) / 100;
}
