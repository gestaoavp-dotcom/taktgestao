-- The Pedidos page reads one client's orders, newest first, and the summaries
-- read a date range. A single-column index on client_id leaves the sort and
-- the range to be worked out row by row.

create index if not exists sales_orders_client_month_idx
  on public.sales_orders(client_id, report_month, created_on desc);
