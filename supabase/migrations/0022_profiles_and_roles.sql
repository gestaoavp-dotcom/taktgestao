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
--
-- There is deliberately no trigger on auth.users. That table belongs to
-- supabase_auth_admin, so creating one from the SQL editor fails on ownership
-- and — since the editor wraps the script in a transaction — takes the whole
-- migration down with it. A profile is created by ensure_profile() instead,
-- which the app calls on the first page load of a login that has none.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  role text not null default 'cliente' check (role in ('dono', 'operador', 'cliente')),
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

/*
 * Creates the caller's own profile at the lowest level, once.
 *
 * SECURITY DEFINER so no insert policy has to exist for ordinary users: the
 * role is fixed here rather than taken from the caller, which is what stops a
 * new login from arriving as a dono. Existing rows are left untouched, so
 * calling it on every page load cannot undo a promotion.
 */
create or replace function public.ensure_profile(user_name text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  select
    auth.uid(),
    u.email,
    coalesce(user_name, split_part(u.email, '@', 1)),
    'cliente'
  from auth.users u
  where u.id = auth.uid()
  on conflict (id) do nothing;
end;
$$;

revoke all on function public.ensure_profile(text) from public;
grant execute on function public.ensure_profile(text) to authenticated;

drop policy if exists "Read own profile" on public.profiles;
drop policy if exists "Owner manages profiles" on public.profiles;

-- Everyone sees their own profile; the owner sees and writes all of them.
create policy "Read own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.current_role_name() = 'dono');

create policy "Owner manages profiles"
  on public.profiles for all to authenticated
  using (public.current_role_name() = 'dono')
  with check (public.current_role_name() = 'dono');

-- Everyone who already has a login predates this and is part of the agency.
insert into public.profiles (id, email, name, role)
select id, email, split_part(email, '@', 1), 'dono'
from auth.users
on conflict (id) do nothing;
