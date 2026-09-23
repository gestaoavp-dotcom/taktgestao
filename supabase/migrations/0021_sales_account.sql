-- A client can have more than one store on the same marketplace — Obada sells
-- on Mercado Livre as both Obachei and Top Style — and each store exports its
-- own reports. Without this the two arrive as one pile and cannot be told
-- apart afterwards.
--
-- Nullable, because reports imported before this existed belong to a store
-- nobody recorded, and guessing would be worse than leaving it open.

alter table public.sales_reports
  add column if not exists account_id uuid references public.client_accounts(id) on delete set null;

alter table public.sales_orders
  add column if not exists account_id uuid references public.client_accounts(id) on delete set null;

alter table public.sales_products
  add column if not exists account_id uuid references public.client_accounts(id) on delete set null;

alter table public.sales_ads
  add column if not exists account_id uuid references public.client_accounts(id) on delete set null;

alter table public.sales_traffic
  add column if not exists account_id uuid references public.client_accounts(id) on delete set null;

create index if not exists sales_orders_account_idx on public.sales_orders(account_id);
create index if not exists sales_products_account_idx on public.sales_products(account_id);
