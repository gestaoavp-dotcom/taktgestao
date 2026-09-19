-- One row per product (and per variation) from an imported traffic report.
-- Only absolute figures are stored: CTR, bounce and conversion rates are
-- derived where shown, so a total divides the sums instead of averaging.
--
-- is_variation marks a product's variation rows, which carry no traffic of
-- their own — including them in a total would count the product twice.

create table if not exists public.sales_traffic (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  sales_report_id uuid not null references public.sales_reports(id) on delete cascade,
  marketplace text not null,
  report_month date not null,
  item_id text,
  product_name text not null,
  sku text,
  variation_name text,
  is_variation boolean not null default false,
  impressions integer default 0,
  clicks integer default 0,
  unique_impressions integer default 0,
  unique_clicks integer default 0,
  visitors integer default 0,
  page_views integer default 0,
  bounced_visitors integer default 0,
  search_clicks integer default 0,
  likes integer default 0,
  cart_visitors integer default 0,
  cart_units integer default 0,
  orders_placed integer default 0,
  orders_paid integer default 0,
  units_placed integer default 0,
  units_paid integer default 0,
  buyers_placed integer default 0,
  buyers_paid integer default 0,
  sales_placed numeric(12, 2) default 0,
  sales_paid numeric(12, 2) default 0,
  raw jsonb,
  created_at timestamptz not null default now()
);

alter table public.sales_traffic enable row level security;

create policy "Authenticated users can do anything with sales_traffic"
  on public.sales_traffic for all to authenticated using (true) with check (true);

create index if not exists sales_traffic_client_idx on public.sales_traffic(client_id);
create index if not exists sales_traffic_report_idx on public.sales_traffic(sales_report_id);
