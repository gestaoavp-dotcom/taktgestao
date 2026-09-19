-- Controle: a log of every change made to the client's account.
-- Links: shortcuts the team keeps per client (store pages, dashboards, drive).

create table if not exists public.client_changes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  changed_on date not null default current_date,
  description text not null,
  reason text,
  goal text,
  owner text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.client_links (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  label text not null,
  url text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.client_changes enable row level security;
alter table public.client_links enable row level security;

create policy "Authenticated users can do anything with client_changes"
  on public.client_changes for all to authenticated using (true) with check (true);

create policy "Authenticated users can do anything with client_links"
  on public.client_links for all to authenticated using (true) with check (true);
