-- Reports come in three flavours now: sales (orders), traffic and ads.
-- Existing rows are all sales reports.
alter table public.sales_reports
  add column if not exists kind text not null default 'vendas';

alter table public.sales_reports
  add constraint sales_reports_kind_check check (kind in ('vendas', 'trafego', 'ads'));
