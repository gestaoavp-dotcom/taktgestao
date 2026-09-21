-- Billing is charged per CNPJ, and each CNPJ is one store, so the fee lives
-- on client_accounts and a payment is recorded per account per month.
-- A client with several stores is therefore several charges that add up.

alter table public.client_accounts add column if not exists monthly_fee numeric(12, 2);
alter table public.client_accounts add column if not exists payment_day integer;
alter table public.client_accounts add column if not exists payment_method text;

-- Carry over anything already filled at client level, so nothing is lost.
update public.client_accounts a
set
  monthly_fee = coalesce(a.monthly_fee, c.monthly_fee),
  payment_day = coalesce(a.payment_day, c.payment_day),
  payment_method = coalesce(a.payment_method, c.payment_method)
from public.clients c
where a.client_id = c.id
  and (c.monthly_fee is not null or c.payment_day is not null or c.payment_method is not null);

create table if not exists public.client_payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  account_id uuid not null references public.client_accounts(id) on delete cascade,
  reference_month date not null,
  amount numeric(12, 2) not null,
  due_date date not null,
  paid_on date not null default current_date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (account_id, reference_month)
);

alter table public.client_payments enable row level security;

create policy "Authenticated users can do anything with client_payments"
  on public.client_payments for all to authenticated using (true) with check (true);
