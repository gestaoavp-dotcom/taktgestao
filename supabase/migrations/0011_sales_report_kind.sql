-- Reports come in three flavours now: orders, traffic and ads.
-- Existing rows are all order reports.
alter table public.sales_reports
  add column if not exists kind text not null default 'pedidos';

alter table public.sales_reports
  add constraint sales_reports_kind_check check (kind in ('pedidos', 'trafego', 'ads'));
