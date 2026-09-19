-- Raw sales reports downloaded from each marketplace (orders, payments,
-- cancellations, returns). Stored per client + marketplace so future
-- parsing logic can turn them into structured data in sales_daily.

create table if not exists public.sales_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  marketplace text not null check (
    marketplace in ('mercado_livre', 'shopee', 'amazon', 'shein', 'tiktok')
  ),
  name text not null,
  path text not null,
  size bigint,
  status text not null default 'recebido' check (status in ('recebido', 'processado', 'erro')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.sales_reports enable row level security;

create policy "Authenticated users can do anything with sales_reports"
  on public.sales_reports for all to authenticated using (true) with check (true);
