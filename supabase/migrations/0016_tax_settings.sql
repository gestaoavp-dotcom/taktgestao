-- A single editable tax rate applied to the agency's own revenue (the fees
-- billed to clients), plus the log of which invoices/notes have already had
-- their tax entered as an expense.

create table if not exists public.tax_settings (
  id uuid primary key default gen_random_uuid(),
  rate_percent numeric(5, 2) not null default 4,
  updated_at timestamptz not null default now()
);

insert into public.tax_settings (rate_percent)
select 4
where not exists (select 1 from public.tax_settings);

alter table public.tax_settings enable row level security;

create policy "Authenticated users can do anything with tax_settings"
  on public.tax_settings for all to authenticated using (true) with check (true);
