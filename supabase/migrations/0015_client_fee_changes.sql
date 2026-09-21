-- Every change to what a CNPJ pays, kept so a reajuste can be traced back:
-- when it took effect, the value before and after, and why.

create table if not exists public.client_fee_changes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  cnpj_id uuid not null references public.client_cnpjs(id) on delete cascade,
  effective_on date not null default current_date,
  previous_amount numeric(12, 2),
  amount numeric(12, 2) not null,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.client_fee_changes enable row level security;

create policy "Authenticated users can do anything with client_fee_changes"
  on public.client_fee_changes for all to authenticated using (true) with check (true);
