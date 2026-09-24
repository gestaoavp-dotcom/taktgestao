-- Makes a temporary password work exactly once.
--
-- A login created by hand starts with a password its owner did not choose and
-- someone else knows. Forcing the change on first access closes that: the
-- temporary one opens the door and nothing else.
--
-- Recorded as a date rather than a flag, so "never changed it" and "changed it
-- in March" are different answers, and so a future rule ("every 90 days") has
-- something to read.

alter table public.profiles
  add column if not exists password_changed_at timestamptz;

-- Everyone already using the system chose their own password when they
-- accepted their invitation. Only logins created from here on are asked.
update public.profiles
set password_changed_at = now()
where password_changed_at is null;

/*
 * Marks the caller's own password as chosen.
 *
 * SECURITY DEFINER because a profile is otherwise only writable by a dono, and
 * this is the one field its owner must be able to set. It writes nothing else,
 * and only ever for auth.uid().
 */
create or replace function public.mark_password_changed()
returns void
language sql
security definer
set search_path = public
as $fn$
  update public.profiles
  set password_changed_at = now()
  where id = auth.uid();
$fn$;

revoke all on function public.mark_password_changed() from public;
grant execute on function public.mark_password_changed() to authenticated;
