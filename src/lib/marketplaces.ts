export const MARKETPLACES = [
  { value: "mercado_livre", label: "Mercado Livre" },
  { value: "shopee", label: "Shopee" },
  { value: "amazon", label: "Amazon" },
  { value: "shein", label: "Shein" },
  { value: "tiktok", label: "TikTok" },
] as const;

export const MARKETPLACE_LABEL: Record<string, string> = Object.fromEntries(
  MARKETPLACES.map((m) => [m.value, m.label]),
);

/** Short name and brand colours for the badge shown next to a store. */
export const MARKETPLACE_BADGE: Record<string, { short: string; className: string }> = {
  mercado_livre: { short: "Meli", className: "bg-[#FFE600] text-[#2D3277]" },
  shopee: { short: "Shopee", className: "bg-[#EE4D2D] text-white" },
  amazon: { short: "Amazon", className: "bg-[#232F3E] text-[#FF9900]" },
  shein: { short: "Shein", className: "bg-[#111111] text-white" },
  tiktok: { short: "TikTok", className: "bg-[#010101] text-[#25F4EE]" },
};
