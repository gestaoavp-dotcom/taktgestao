-- Product-level results, for marketplaces whose export is per product rather
-- than per order. Amazon's business report is the first: it settles a month's
-- sales, fees, logistics and ads by ASIN, and never mentions an order.
--
-- costs holds one entry per top-level charge Amazon reports, with its own sign
-- kept, so net_revenue = net_sales - sum(costs) reconciles exactly. The buckets
-- differ between accounts and months, which is why they are a map and not
-- columns.

create table if not exists public.sales_products (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  sales_report_id uuid not null references public.sales_reports(id) on delete cascade,
  marketplace text not null,
  report_month date not null,
  -- Amazon identifies a listing by ASIN; other marketplaces may not.
  external_id text,
  sku text,
  product_name text,
  brand text,
  gross_sales numeric(12, 2) default 0,
  net_sales numeric(12, 2) default 0,
  net_revenue numeric(12, 2) default 0,
  units_sold integer default 0,
  units_refunded integer default 0,
  units_net integer default 0,
  average_price numeric(12, 2) default 0,
  costs jsonb not null default '{}'::jsonb,
  -- The report's own "Total" line, which includes account-level charges that
  -- belong to no product. Kept so the page can show what the products miss.
  is_total boolean not null default false,
  raw jsonb,
  created_at timestamptz not null default now()
);

alter table public.sales_products enable row level security;

create policy "Authenticated users can do anything with sales_products"
  on public.sales_products for all to authenticated using (true) with check (true);

create index if not exists sales_products_client_idx on public.sales_products(client_id);
create index if not exists sales_products_report_idx on public.sales_products(sales_report_id);

-- A fourth kind of document: a report settled by product rather than by order.
alter table public.sales_reports
  drop constraint if exists sales_reports_kind_check;

alter table public.sales_reports
  add constraint sales_reports_kind_check
  check (kind in ('pedidos', 'trafego', 'ads', 'produtos'));
