-- Keep every column from the marketplace's report, not just the ones we
-- picked out, so the team can see the full price → discounts → net
-- breakdown for each order exactly as the platform reported it.
alter table public.sales_orders
  add column if not exists raw jsonb;
