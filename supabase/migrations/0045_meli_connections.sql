-- The Mercado Livre connection: a client authorises once, and from then on the
-- dashboard fills itself from the API instead of from a spreadsheet somebody
-- remembered to download.
--
-- Two tables, both holding something that must never reach a browser: a
-- refresh token here is the client's whole account, for as long as they don't
-- revoke it, and a pending invite's code_verifier is half of a live PKCE
-- exchange.
--
-- So the rule here is stricter than anywhere else in this schema. Every other
-- table says "the team can work on it, the client reads its own". These two
-- say nothing at all: RLS is on and there is no policy, which denies everyone
-- who arrives through PostgREST — the team included. The only way in is the
-- service role, from server code, which bypasses RLS by design.
--
-- client_credentials solved the same problem differently, with a generated
-- `has_password` boolean so a listing could say a secret exists without
-- selecting it. That works when the secret is read by a person, one at a time,
-- behind an audit row. These tokens are read by a background job on every
-- sync, never by a person, so there is no reason for the anon key to be able
-- to name the column at all.

create table if not exists public.meli_connections (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid not null references public.clients(id) on delete cascade,
  -- One connection per store. A client with two Mercado Livre shops gets two
  -- rows, which is why this hangs off client_accounts and not off clients.
  account_id            uuid not null unique references public.client_accounts(id) on delete cascade,
  -- Mercado Livre's own id for the seller. Null only between the invite being
  -- created and the client finishing the authorisation.
  seller_id             bigint,
  nickname              text,
  site_id               text,
  access_token_cipher   text,
  refresh_token_cipher  text,
  expires_at            timestamptz,
  status                text not null default 'ativa'
                          check (status in ('ativa', 'reautorizar', 'desativada')),
  -- Why the last renewal failed, shown to the team so "reautorizar" is not a
  -- dead end. Never holds a token: it is the message, not the response.
  last_error            text,
  last_sync_at          timestamptz,
  -- A lease, not a lock. Mercado Livre's refresh token is single-use: whoever
  -- spends it gets a new one and invalidates the old, so two workers renewing
  -- the same connection means one of them is handed invalid_grant and would
  -- mark a perfectly good account as needing reauthorisation.
  --
  -- A row lock cannot help here, because the renewal is an HTTP call to
  -- Mercado Livre and the transaction would have to stay open across it — and
  -- on Vercel the two racers are usually two different lambdas anyway. So the
  -- claim is a timestamp: the worker that wins the conditional update owns the
  -- renewal until it expires, and the others re-read instead of calling.
  renewing_until        timestamptz,
  created_by            uuid references auth.users(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists meli_connections_client_idx
  on public.meli_connections(client_id);

-- Finding the row from a Mercado Livre callback, which knows the seller and
-- nothing else.
create index if not exists meli_connections_seller_idx
  on public.meli_connections(seller_id);

/**
 * A single-use link the team sends the client.
 *
 * The token is what travels; `state` and `code_verifier` are filled in only
 * when the client actually opens it, so a link that is never clicked leaves no
 * half-started exchange behind.
 */
create table if not exists public.meli_invites (
  token          text primary key,
  client_id      uuid not null references public.clients(id) on delete cascade,
  account_id     uuid not null references public.client_accounts(id) on delete cascade,
  state          text unique,
  code_verifier  text,
  expires_at     timestamptz not null,
  used_at        timestamptz,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now()
);

create index if not exists meli_invites_account_idx
  on public.meli_invites(account_id);

-- RLS on, no policies: deny-all for anon and authenticated alike.
alter table public.meli_connections enable row level security;
alter table public.meli_invites enable row level security;

-- Run twice safely, and leave nothing behind from an earlier shape.
do $$
declare p record;
begin
  for p in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('meli_connections', 'meli_invites')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

/**
 * What the team is allowed to see about a connection.
 *
 * Security definer so it can read past the deny-all above, and narrow on
 * purpose: the two cipher columns are not in the return type, so no caller can
 * ask for them even by mistake. `connected` says a token exists without
 * anything about what it is.
 */
create or replace function public.meli_connections_for_client(p_client_id uuid)
returns table (
  account_id    uuid,
  store_name    text,
  seller_id     bigint,
  nickname      text,
  site_id       text,
  status        text,
  connected     boolean,
  expires_at    timestamptz,
  last_error    text,
  last_sync_at  timestamptz
)
language sql
stable
security definer
set search_path = public
as $fn$
  select
    a.id,
    a.store_name,
    c.seller_id,
    c.nickname,
    c.site_id,
    coalesce(c.status, 'sem_conexao'),
    c.refresh_token_cipher is not null,
    c.expires_at,
    c.last_error,
    c.last_sync_at
  from public.client_accounts a
  left join public.meli_connections c on c.account_id = a.id
  where a.client_id = p_client_id
    and a.marketplace = 'mercado_livre'
    and public.is_team()
  order by a.store_name
$fn$;

revoke all on function public.meli_connections_for_client(uuid) from public;
grant execute on function public.meli_connections_for_client(uuid) to authenticated;
