-- The footer has to answer for exactly what the table is showing.
--
-- With the filters moving to the server, a total computed over a wider set
-- than the rows on screen is a total that quietly disagrees with them. So the
-- function takes every filter the page offers.

create or replace function public.orders_totals(
  p_client_id uuid,
  p_month date default null,
  p_marketplace text default null,
  p_account_id uuid default null,
  p_missing_cost boolean default null
)
returns table (
  orders bigint,
  lines bigint,
  sold numeric,
  net numeric,
  cost numeric,
  extra numeric,
  tax numeric,
  margin numeric
)
language sql
stable
security invoker
set search_path = public
as $fn$
  with scoped as (
    select o.*
    from public.sales_orders o
    where o.client_id = p_client_id
      and (p_month is null or o.report_month = p_month)
      and (p_marketplace is null or o.marketplace = p_marketplace)
      and (p_account_id is null or o.account_id = p_account_id)
      and (
        p_missing_cost is null
        or (p_missing_cost and o.cost is null)
        or (not p_missing_cost and o.cost is not null)
      )
      -- A cancelled order sold nothing and cost nothing: the product never
      -- left the shelf. Which column says so differs by marketplace.
      and case
            when o.marketplace = 'mercado_livre'
              then not (coalesce(o.net_settlement, 0) = 0 and coalesce(o.subtotal, 0) > 0)
            else coalesce(o.total_value, 0) <> 0
          end
  )
  select
    count(distinct order_id),
    count(*),
    coalesce(sum(subtotal), 0),
    coalesce(sum(coalesce(net_amount, net_settlement)), 0),
    coalesce(sum(coalesce(cost, 0)), 0),
    coalesce(sum(coalesce(extra_costs, 0)), 0),
    coalesce(sum(coalesce(net_amount, net_settlement) * coalesce(tax_percent, 0) / 100), 0),
    coalesce(sum(
      coalesce(net_amount, net_settlement)
      - coalesce(cost, 0)
      - coalesce(extra_costs, 0)
      - coalesce(net_amount, net_settlement) * coalesce(tax_percent, 0) / 100
    ), 0)
  from scoped
$fn$;

revoke all on function public.orders_totals(uuid, date, text, uuid, boolean) from public;
grant execute on function public.orders_totals(uuid, date, text, uuid, boolean) to authenticated;

-- How many SKUs still have no cost, for the hint that offers the filter.
create or replace function public.orders_missing_cost(p_client_id uuid, p_month date default null)
returns table (skus bigint, loose bigint, lines bigint)
language sql
stable
security invoker
set search_path = public
as $fn$
  with pending as (
    select o.sku, o.id
    from public.sales_orders o
    where o.client_id = p_client_id
      and (p_month is null or o.report_month = p_month)
      and o.cost is null
      and case
            when o.marketplace = 'mercado_livre'
              then not (coalesce(o.net_settlement, 0) = 0 and coalesce(o.subtotal, 0) > 0)
            else coalesce(o.total_value, 0) <> 0
          end
  )
  select
    count(distinct sku) filter (where sku is not null),
    count(*) filter (where sku is null),
    count(*)
  from pending
$fn$;

revoke all on function public.orders_missing_cost(uuid, date) from public;
grant execute on function public.orders_missing_cost(uuid, date) to authenticated;
