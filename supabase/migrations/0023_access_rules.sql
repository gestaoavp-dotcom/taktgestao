-- Turns the three levels into rules the database enforces.
--
--   dono     — everything, including the agency's own finances and the
--              marketplace passwords
--   operador — every client's operational data; not the agency's finances,
--              not other people's access
--   cliente  — one client's own record, read-only, and never a password
--
-- Until now every table carried one policy: any signed-in user could do
-- anything. That was defensible while only the agency had logins. It stops
-- being defensible the moment a client has one.
--
-- Two shapes repeat below:
--   * team tables      — the agency works on them, a client never sees them
--   * client-scoped    — the agency works on them, and a client reads its own
--
-- Written so it can be run twice: every policy is dropped before it is made.

-- ---------------------------------------------------------------- helpers --
create or replace function public.is_team()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role_name() in ('dono', 'operador'), false);
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role_name() = 'dono', false);
$$;

/**
 * True when the row belongs to the client this login is bound to.
 *
 * A login with no client — which every team member is — gets false, so this
 * never widens anyone's reach on its own. It only ever adds a client's own
 * rows to what the team policies already allow.
 */
create or replace function public.owns_client(row_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select row_client_id is not null and row_client_id = public.current_client_id();
$$;

-- ------------------------------------------------------------ team tables --
-- Nothing here concerns a client: the agency's money, its work queue, its
-- pricing of the client, and the credentials it holds.
do $$
declare
  t text;
begin
  foreach t in array array[
    'tasks', 'tax_settings', 'client_fee_changes', 'client_payments', 'client_links'
  ]
  loop
    execute format('drop policy if exists "Authenticated users can do anything with %s" on public.%I', t, t);
    execute format('drop policy if exists "team_all_%s" on public.%I', t, t);
    execute format(
      'create policy "team_all_%s" on public.%I for all to authenticated using (public.is_team()) with check (public.is_team())',
      t, t);
  end loop;
end $$;

-- The agency's own finances are the owner's alone.
drop policy if exists "Authenticated users can do anything with finance_entries" on public.finance_entries;
drop policy if exists "owner_all_finance_entries" on public.finance_entries;
create policy "owner_all_finance_entries"
  on public.finance_entries for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- --------------------------------------------------------- client-scoped --
-- The team works on these; a client reads its own and writes nothing.
do $$
declare
  t text;
begin
  foreach t in array array[
    'clients', 'client_accounts', 'client_cnpjs', 'client_changes',
    'client_files', 'client_updates',
    'sales_reports', 'sales_orders', 'sales_products', 'sales_ads',
    'sales_traffic', 'sales_daily'
  ]
  loop
    execute format('drop policy if exists "Authenticated users can do anything with %s" on public.%I', t, t);
    execute format('drop policy if exists "team_all_%s" on public.%I', t, t);
    execute format('drop policy if exists "client_read_%s" on public.%I', t, t);

    execute format(
      'create policy "team_all_%s" on public.%I for all to authenticated using (public.is_team()) with check (public.is_team())',
      t, t);
  end loop;
end $$;

-- The clients table keys on its own id, not on a client_id column.
create policy "client_read_clients"
  on public.clients for select to authenticated
  using (public.owns_client(id));

do $$
declare
  t text;
begin
  foreach t in array array[
    'client_accounts', 'client_cnpjs', 'client_changes',
    'client_files', 'client_updates',
    'sales_reports', 'sales_orders', 'sales_products', 'sales_ads',
    'sales_traffic', 'sales_daily'
  ]
  loop
    execute format(
      'create policy "client_read_%s" on public.%I for select to authenticated using (public.owns_client(client_id))',
      t, t);
  end loop;
end $$;

-- ------------------------------------------------------------ credentials --
-- A marketplace password is the one thing a client must never reach through
-- its own account, and the encryption is not the control here: this is.
drop policy if exists "Authenticated users can do anything with client_credentials"
  on public.client_credentials;
drop policy if exists "team_all_client_credentials" on public.client_credentials;
create policy "team_all_client_credentials"
  on public.client_credentials for all to authenticated
  using (public.is_team()) with check (public.is_team());

drop policy if exists "Authenticated users can read credential_reveals" on public.credential_reveals;
drop policy if exists "Authenticated users can record credential_reveals" on public.credential_reveals;
drop policy if exists "team_read_credential_reveals" on public.credential_reveals;
drop policy if exists "team_write_credential_reveals" on public.credential_reveals;

create policy "team_read_credential_reveals"
  on public.credential_reveals for select to authenticated
  using (public.is_team());

-- Still append-only: no update, no delete, for anyone.
create policy "team_write_credential_reveals"
  on public.credential_reveals for insert to authenticated
  with check (public.is_team());

-- ------------------------------------------------------------------ files --
-- Storage carries the same rule: uploads are the team's, a client reads its own.
drop policy if exists "Authenticated users can read client files" on storage.objects;
drop policy if exists "Authenticated users can upload client files" on storage.objects;
drop policy if exists "Authenticated users can delete client files" on storage.objects;
drop policy if exists "team_manages_client_files" on storage.objects;

create policy "team_manages_client_files"
  on storage.objects for all to authenticated
  using (bucket_id = 'client-files' and public.is_team())
  with check (bucket_id = 'client-files' and public.is_team());
