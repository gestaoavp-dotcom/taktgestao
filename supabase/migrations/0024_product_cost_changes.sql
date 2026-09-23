-- Every change to what a product costs, kept as an event.
--
-- The cost itself already lives per month on sales_orders and sales_products,
-- which answers "what did it cost in August". It cannot answer "when did this
-- change, from what, and who changed it" — a month that was edited twice looks
-- exactly like one edited once.
--
-- Written on every edit, never updated, never deleted: a history that can be
-- rewritten is not one.

create table if not exists public.product_cost_changes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  sku text not null,
  product_name text,
  -- The month the new cost takes effect from; earlier months keep the old one.
  effective_month date not null,
  previous_cost numeric(12, 2),
  new_cost numeric(12, 2),
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

alter table public.product_cost_changes enable row level security;

drop policy if exists "team_all_product_cost_changes" on public.product_cost_changes;
drop policy if exists "client_read_product_cost_changes" on public.product_cost_changes;

-- Append-only for the team: there is no update or delete policy, so the trail
-- cannot be rewritten from the app.
create policy "team_read_product_cost_changes"
  on public.product_cost_changes for select to authenticated
  using (public.is_team() or public.owns_client(client_id));

create policy "team_write_product_cost_changes"
  on public.product_cost_changes for insert to authenticated
  with check (public.is_team());

create index if not exists product_cost_changes_sku_idx
  on public.product_cost_changes(client_id, sku, effective_month desc);
