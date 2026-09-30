-- What an affiliate earns on a sale, as a percentage the seller sets.
--
-- TikTok Shop's order export carries no fee column at all — not its own
-- commission, which comes from a published table, and not the creator's share,
-- which the seller chooses per product. This is the second one.
--
-- A percentage rather than an amount, because that is how it is set, and it
-- then applies to whatever the item sold for.

alter table public.sales_orders
  add column if not exists affiliate_percent numeric(5, 2);
