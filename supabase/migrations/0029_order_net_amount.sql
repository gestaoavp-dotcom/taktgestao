-- What the marketplace actually paid for an order, stored once.
--
-- Mercado Livre states it in a column. Shopee does not: it has to be worked
-- out from the report row, a 66-column JSON blob, which meant the figure was
-- recomputed on every page load and the blob had to be read to do it.
--
-- Two things follow from storing it. The raw row is read only when someone
-- opens one order, and the totals become a sum the database can do — SQL was
-- never going to untangle that JSON.
--
-- net_settlement stays as the marketplace reported it. This is our reading of
-- it, and keeping them apart means a corrected formula never overwrites the
-- source.

alter table public.sales_orders
  add column if not exists net_amount numeric(12, 2);

create index if not exists sales_orders_net_amount_idx
  on public.sales_orders(client_id, report_month)
  where net_amount is not null;
