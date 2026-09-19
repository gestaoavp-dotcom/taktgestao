import { MARKETPLACE_BADGE, MARKETPLACE_LABEL } from "@/lib/marketplaces";

export function MarketplaceBadge({ marketplace }: { marketplace: string }) {
  const badge = MARKETPLACE_BADGE[marketplace];
  const label = MARKETPLACE_LABEL[marketplace] ?? marketplace;

  return (
    <span
      title={label}
      className={`rounded px-1.5 py-0.5 text-[10px] font-bold leading-none ${
        badge?.className ?? "bg-brand-gray text-navy"
      }`}
    >
      {badge?.short ?? label}
    </span>
  );
}
