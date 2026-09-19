-- A client can have more than one store on the same marketplace (e.g. two
-- Mercado Livre accounts). Link a change to the specific store when one is
-- registered, so "Controle" can separate them instead of lumping every
-- Mercado Livre action together.

alter table public.client_changes
  add column if not exists account_id uuid references public.client_accounts(id) on delete set null;
