-- One row per ad, parsed from an imported ads report. Only absolute figures
-- are stored: CTR, ROAS, ACOS and conversion rates are derived where shown,
-- so a total divides the sums instead of averaging each ad's own ratio.

create table if not exists public.sales_ads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  sales_report_id uuid not null references public.sales_reports(id) on delete cascade,
  marketplace text not null,
  report_month date not null,
  ad_name text not null,
  status text,
  ad_type text,
  bid_method text,
  placement text,
  product_id text,
  started_on date,
  ended_on date,
  impressions integer default 0,
  clicks integer default 0,
  add_to_cart integer default 0,
  conversions integer default 0,
  direct_conversions integer default 0,
  items_sold integer default 0,
  direct_items_sold integer default 0,
  gmv numeric(12, 2) default 0,
  direct_revenue numeric(12, 2) default 0,
  expense numeric(12, 2) default 0,
  raw jsonb,
  created_at timestamptz not null default now()
);

alter table public.sales_ads enable row level security;

create policy "Authenticated users can do anything with sales_ads"
  on public.sales_ads for all to authenticated using (true) with check (true);

create index if not exists sales_ads_client_idx on public.sales_ads(client_id);
create index if not exists sales_ads_report_idx on public.sales_ads(sales_report_id);
