-- Marketplace logins for the accounts the team manages.
--
-- The password is never stored in the clear. The app encrypts it with
-- AES-256-GCM before it reaches Postgres, using a key that exists only in the
-- server environment (CREDENTIALS_KEY) and never in the database. A database
-- dump, a leaked service_role key or a mistaken policy therefore yields
-- ciphertext: reading a password also requires the deployment's environment.
--
-- has_password is generated so a listing can say whether a password exists
-- without ever selecting the ciphertext itself.

create table if not exists public.client_credentials (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  marketplace text,
  store_name text not null,
  label text,
  login text,
  url text,
  notes text,
  password_cipher text,
  has_password boolean generated always as (
    password_cipher is not null and password_cipher <> ''
  ) stored,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_credentials enable row level security;

-- The whole team manages every client, so every signed-in user reaches every
-- row. Anonymous requests get nothing: the policy names `authenticated` only,
-- and the encryption above is what limits the damage of a wider leak.
create policy "Authenticated users can do anything with client_credentials"
  on public.client_credentials for all to authenticated using (true) with check (true);

create index if not exists client_credentials_client_idx
  on public.client_credentials(client_id);

-- Who looked at which password, and when. Append-only: there is no update or
-- delete policy, so the trail cannot be rewritten from the app.
create table if not exists public.credential_reveals (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null references public.client_credentials(id) on delete cascade,
  user_id uuid references auth.users(id),
  revealed_at timestamptz not null default now()
);

alter table public.credential_reveals enable row level security;

create policy "Authenticated users can read credential_reveals"
  on public.credential_reveals for select to authenticated using (true);

create policy "Authenticated users can record credential_reveals"
  on public.credential_reveals for insert to authenticated with check (true);

create index if not exists credential_reveals_credential_idx
  on public.credential_reveals(credential_id, revealed_at desc);
