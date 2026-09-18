-- Daily revenue/orders per client per marketplace, imported from files
-- downloaded from each platform's seller dashboard.

create table if not exists public.sales_daily (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  platform text not null check (
    platform in ('mercado_livre', 'shopee', 'amazon', 'shein', 'tiktok')
  ),
  date date not null,
  revenue numeric(12, 2) not null default 0,
  orders_count integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (client_id, platform, date)
);

alter table public.sales_daily enable row level security;

create policy "Authenticated users can do anything with sales_daily"
  on public.sales_daily for all
  to authenticated
  using (true)
  with check (true);
