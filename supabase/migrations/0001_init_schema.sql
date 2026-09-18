-- Clients, tasks and finance entries for taktgestao.
-- Shared team data: any authenticated user can read/write everything.

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  marketplace text,
  contact_email text,
  contact_phone text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  client_id uuid references public.clients(id) on delete set null,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  assigned_to uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  description text not null,
  amount numeric(12, 2) not null,
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;
alter table public.tasks enable row level security;
alter table public.finance_entries enable row level security;

create policy "Authenticated users can do anything with clients"
  on public.clients for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can do anything with tasks"
  on public.tasks for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can do anything with finance_entries"
  on public.finance_entries for all
  to authenticated
  using (true)
  with check (true);
