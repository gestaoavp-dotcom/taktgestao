-- The same rule for the files bucket: the team manages them, a client never
-- reads another client's straight from storage.
--
-- Kept apart from 0023 on purpose. storage.objects belongs to
-- supabase_storage_admin, so this can fail on ownership depending on the
-- project — and the SQL editor wraps a script in a transaction, which would
-- take the whole access migration down with it. Run it on its own; if it is
-- refused, set the same rule from Storage - Policies in the dashboard.

drop policy if exists "Authenticated users can read client files" on storage.objects;
drop policy if exists "Authenticated users can upload client files" on storage.objects;
drop policy if exists "Authenticated users can delete client files" on storage.objects;
drop policy if exists "team_manages_client_files" on storage.objects;

create policy "team_manages_client_files"
  on storage.objects for all to authenticated
  using (bucket_id = 'client-files' and public.is_team())
  with check (bucket_id = 'client-files' and public.is_team());
