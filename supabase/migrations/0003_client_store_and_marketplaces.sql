-- A client now has a store name and can sell on several marketplaces,
-- replacing the single free-text marketplace field.

alter table public.clients add column if not exists store_name text;
alter table public.clients
  add column if not exists marketplaces text[] not null default '{}';

update public.clients
set marketplaces = array[marketplace]
where marketplace is not null and marketplaces = '{}';

alter table public.clients drop column if exists marketplace;
