-- The catalogue behind the Custos tab: one row per product a client sells,
-- with what it costs today.
--
-- Built in the database because the alternative is reading every order a
-- client has to group them in the browser's server — ten thousand rows for
-- one page that shows a few dozen lines.
--
-- Keyed the way the app files costs: by SKU, or by exact title when the
-- marketplace gave none.

create or replace function public.product_costs(p_client_id uuid)
returns table (
  product_key text,
  sku text,
  product_name text,
  unit_cost numeric,
  cost_month date,
  first_month date,
  last_month date,
  lines bigint,
  units bigint
)
language sql
stable
security invoker
set search_path = public
as $fn$
  with scoped as (
    select
      case
        when o.sku is not null and o.sku <> '' then 'sku:' || o.sku
        else 'nome:' || coalesce(o.product_name, '')
      end as product_key,
      o.sku,
      o.product_name,
      o.report_month,
      o.cost,
      coalesce(o.quantity, 0) as quantity
    from public.sales_orders o
    where o.client_id = p_client_id
  ),
  -- What it costs now: the cost in the most recent month that carries one.
  -- Every reference qualified: a language-sql function's output column names
  -- are visible inside its body, and several of these share a name with the
  -- columns being read.
  latest as (
    select distinct on (sc.product_key) sc.product_key, sc.cost, sc.report_month
    from scoped sc
    where sc.cost is not null
    order by sc.product_key, sc.report_month desc
  )
  select
    s.product_key,
    max(s.sku) as sku,
    (array_agg(s.product_name order by s.report_month desc))[1] as product_name,
    l.cost as unit_cost,
    l.report_month as cost_month,
    min(s.report_month) as first_month,
    max(s.report_month) as last_month,
    count(*)::bigint as lines,
    sum(s.quantity)::bigint as units
  from scoped s
  left join latest l on l.product_key = s.product_key
  group by s.product_key, l.cost, l.report_month
$fn$;

revoke all on function public.product_costs(uuid) from public;
grant execute on function public.product_costs(uuid) to authenticated;

-- A product with no SKU has a cost and a history like any other; the column
-- was written when only SKUs were kept.
alter table public.product_cost_changes alter column sku drop not null;
