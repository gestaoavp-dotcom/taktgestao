-- A lead becomes a client through the pré-cadastro, and keeps a pointer to
-- the client it became. Its e-mail is now required: it is the one the client's
-- login is made with.
--
-- Written so it can be run twice.

alter table public.leads
  add column if not exists client_id uuid references public.clients(id) on delete set null;

-- The anonymous insert still sets nothing but a new lead: no status, no
-- client, and now never without an e-mail.
drop policy if exists "anon_insert_leads" on public.leads;
create policy "anon_insert_leads"
  on public.leads for insert to anon
  with check (status = 'novo' and client_id is null and email is not null);
