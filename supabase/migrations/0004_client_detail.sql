-- Everything the client detail page shows: billing terms, the managed
-- marketplace accounts (one CNPJ per store), a history timeline of updates
-- and meeting minutes, and uploaded files.

alter table public.clients add column if not exists monthly_fee numeric(12, 2);
alter table public.clients add column if not exists payment_day integer;
alter table public.clients add column if not exists payment_method text;

create table if not exists public.client_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  marketplace text not null check (
    marketplace in ('mercado_livre', 'shopee', 'amazon', 'shein', 'tiktok')
  ),
  store_name text not null,
  cnpj text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.client_updates (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  kind text not null default 'update' check (kind in ('update', 'meeting')),
  title text not null,
  body text,
  happened_on date not null default current_date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.client_files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  path text not null,
  size bigint,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.client_accounts enable row level security;
alter table public.client_updates enable row level security;
alter table public.client_files enable row level security;

create policy "Authenticated users can do anything with client_accounts"
  on public.client_accounts for all to authenticated using (true) with check (true);

create policy "Authenticated users can do anything with client_updates"
  on public.client_updates for all to authenticated using (true) with check (true);

create policy "Authenticated users can do anything with client_files"
  on public.client_files for all to authenticated using (true) with check (true);

-- Private bucket for the uploaded files; access goes through signed URLs.
insert into storage.buckets (id, name, public)
values ('client-files', 'client-files', false)
on conflict (id) do nothing;

create policy "Authenticated users can read client files"
  on storage.objects for select to authenticated
  using (bucket_id = 'client-files');

create policy "Authenticated users can upload client files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'client-files');

create policy "Authenticated users can delete client files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'client-files');
