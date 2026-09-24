-- Contacts left on the public /contato page (linked from the Instagram bio).
--
-- Someone with no login fills the form, so the anonymous role can add a row
-- and nothing else: it cannot read, change or remove leads, not even the one
-- it just sent. Only the team sees and works the list.
--
-- Written so it can be run twice.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  phone text not null check (char_length(phone) between 8 and 30),
  email text check (email is null or char_length(email) <= 160),
  company text check (company is null or char_length(company) <= 120),
  marketplaces text[] not null default '{}' check (cardinality(marketplaces) <= 10),
  message text check (message is null or char_length(message) <= 1000),
  status text not null default 'novo'
    check (status in ('novo', 'contatado', 'convertido', 'descartado')),
  source text not null default 'instagram' check (char_length(source) <= 40),
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

drop policy if exists "anon_insert_leads" on public.leads;
create policy "anon_insert_leads"
  on public.leads for insert to anon
  with check (status = 'novo');

drop policy if exists "team_all_leads" on public.leads;
create policy "team_all_leads"
  on public.leads for all to authenticated
  using (public.is_team())
  with check (public.is_team());
