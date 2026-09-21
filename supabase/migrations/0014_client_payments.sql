-- Contas a receber: one row per client per month, written only when the
-- month is paid. Clients themselves come from public.clients, so a newly
-- registered client shows up in Financas with no extra setup.

create table if not exists public.client_payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  reference_month date not null,
  amount numeric(12, 2) not null,
  due_date date not null,
  paid_on date not null default current_date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (client_id, reference_month)
);

alter table public.client_payments enable row level security;

create policy "Authenticated users can do anything with client_payments"
  on public.client_payments for all to authenticated using (true) with check (true);
