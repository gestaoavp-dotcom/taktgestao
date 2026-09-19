-- Which calendar month a report covers, so uploads can be browsed and
-- corrected month by month.
alter table public.sales_reports
  add column if not exists report_month date;

-- One row per order line item, parsed from an uploaded report. Cost,
-- extra costs and tax % start empty — the team fills them in per order to
-- see what was actually left over after marketplace fees.
create table if not exists public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  sales_report_id uuid not null references public.sales_reports(id) on delete cascade,
  marketplace text not null,
  report_month date not null,
  order_id text not null,
  status text,
  refund_status text,
  created_on date,
  product_name text,
  sku text,
  quantity integer default 0,
  returned_quantity integer default 0,
  unit_price numeric(12, 2) default 0,
  subtotal numeric(12, 2) default 0,
  total_value numeric(12, 2) default 0,
  shipping_fee_buyer numeric(12, 2) default 0,
  transaction_fee numeric(12, 2) default 0,
  commission_fee numeric(12, 2) default 0,
  service_fee numeric(12, 2) default 0,
  net_settlement numeric(12, 2) default 0,
  cost numeric(12, 2),
  extra_costs numeric(12, 2),
  tax_percent numeric(5, 2),
  created_at timestamptz not null default now()
);

alter table public.sales_orders enable row level security;

create policy "Authenticated users can do anything with sales_orders"
  on public.sales_orders for all to authenticated using (true) with check (true);

create index if not exists sales_orders_client_idx on public.sales_orders(client_id);
create index if not exists sales_orders_report_idx on public.sales_orders(sales_report_id);
