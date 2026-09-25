-- The PIN an admin types to delete a client.
--
-- Stored only as a salted scrypt hash, in a table no login can read: RLS is
-- on and there is deliberately no policy, so only the server (service role)
-- reaches it. Four digits are ten thousand guesses, so the table also counts
-- wrong attempts and locks the PIN for a while after too many.
--
-- Written so it can be run twice.

create table if not exists public.admin_pins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pin_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.admin_pins enable row level security;
