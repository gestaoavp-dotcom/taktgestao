-- Who each login is, and what they are allowed to see.
--
-- Three levels, in order of reach:
--   dono     — the agency's owner: everything, including other people's access
--   operador — the team: every client's operational data and every task
--   cliente  — an external client: their own client record and nothing else
--
-- The role lives here and not in the JWT's user_metadata, because a user can
-- edit their own metadata: anyone could promote themselves to dono. Only a
-- dono can write this table, and a policy below enforces that.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  role text not null default 'operador' check (role in ('dono', 'operador', 'cliente')),
  -- Which client an external login belongs to. Required for role 'cliente',
  -- meaningless for the others.
  client_id uuid references public.clients(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Reading the role must not itself require reading the role, or every policy
-- that calls it recurses. SECURITY DEFINER steps outside RLS to answer.
create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id from public.profiles where id = auth.uid();
$$;

-- Everyone sees their own profile; the owner sees and writes all of them.
create policy "Read own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.current_role_name() = 'dono');

create policy "Owner manages profiles"
  on public.profiles for all to authenticated
  using (public.current_role_name() = 'dono')
  with check (public.current_role_name() = 'dono');

-- A new login starts as the lowest level that can do nothing until a dono
-- places it. Left to default to 'operador', an unknown signup would arrive
-- with access to every client.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    'cliente'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Everyone who already has a login predates this and is part of the agency.
insert into public.profiles (id, email, name, role)
select id, email, split_part(email, '@', 1), 'dono'
from auth.users
on conflict (id) do nothing;
