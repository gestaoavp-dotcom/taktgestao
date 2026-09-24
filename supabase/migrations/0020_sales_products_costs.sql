-- What the seller pays for the product, which no marketplace report knows.
--
-- unit_cost is per unit, because that is how a product report is read and how
-- the team buys. tax_percent is one number per client, repeated on every row
-- so a page can read it without a second query — the same shape sales_orders
-- already uses.

alter table public.sales_products
  add column if not exists unit_cost numeric(12, 2),
  add column if not exists extra_costs numeric(12, 2),
  add column if not exists tax_percent numeric(5, 2);
