-- Billing is charged per CNPJ. A CNPJ can hold several stores across several
-- marketplaces, and that has no effect on what is charged: two CNPJs of the
-- same client can carry different monthly fees.

create table if not exists public.client_cnpjs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  cnpj text not null,
  label text,
  monthly_fee numeric(12, 2),
  payment_day integer,
  payment_method text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (client_id, cnpj)
);

-- Promote the CNPJs already typed on the stores into their own records.
insert into public.client_cnpjs (client_id, cnpj)
select distinct client_id, cnpj
from public.client_accounts
where cnpj is not null and cnpj <> ''
on conflict (client_id, cnpj) do nothing;

alter table public.client_accounts
  add column if not exists cnpj_id uuid references public.client_cnpjs(id) on delete set null;

update public.client_accounts a
set cnpj_id = c.id
from public.client_cnpjs c
where a.cnpj_id is null and a.client_id = c.client_id and a.cnpj = c.cnpj;

-- Carry the old client-wide fee over, but only when there is a single CNPJ to
-- put it on: with more than one the split is a decision, not a guess.
update public.client_cnpjs c
set
  monthly_fee = coalesce(c.monthly_fee, cl.monthly_fee),
  payment_day = coalesce(c.payment_day, cl.payment_day),
  payment_method = coalesce(c.payment_method, cl.payment_method)
from public.clients cl
where c.client_id = cl.id
  and cl.monthly_fee is not null
  and (select count(*) from public.client_cnpjs x where x.client_id = cl.id) = 1;

create table if not exists public.client_payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  cnpj_id uuid not null references public.client_cnpjs(id) on delete cascade,
  reference_month date not null,
  amount numeric(12, 2) not null,
  due_date date not null,
  paid_on date not null default current_date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (cnpj_id, reference_month)
);

alter table public.client_cnpjs enable row level security;
alter table public.client_payments enable row level security;

create policy "Authenticated users can do anything with client_cnpjs"
  on public.client_cnpjs for all to authenticated using (true) with check (true);

create policy "Authenticated users can do anything with client_payments"
  on public.client_payments for all to authenticated using (true) with check (true);
