-- The Pedidos footer, added up in the database.
--
-- The page loaded every order a client had in order to total them. At about
-- 2300 orders a month that is 28000 rows after a year, per client — a number
-- no amount of narrowing the columns survives.
--
-- Totals coming from here is what lets the table load one month at a time, or
-- one page at a time, while the figures stay right for the whole filter.
--
-- Leans on net_amount, stored at import. Before it existed, Shopee's net lived
-- inside a JSON blob and only JavaScript could read it.

create or replace function public.orders_totals(
  p_client_id uuid,
  p_month date default null,
  p_marketplace text default null,
  p_account_id uuid default null
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

revoke all on function public.orders_totals(uuid, date, text, uuid) from public;
grant execute on function public.orders_totals(uuid, date, text, uuid) to authenticated;

-- The months a client has orders for, so the page can open on the newest one
-- instead of loading them all to find out.
create or replace function public.order_months(p_client_id uuid)
returns table (report_month date, orders bigint)
language sql
stable
security invoker
set search_path = public
as $fn$
  select o.report_month, count(*)
  from public.sales_orders o
  where o.client_id = p_client_id
  group by o.report_month
  order by o.report_month desc
$fn$;

revoke all on function public.order_months(uuid) from public;
grant execute on function public.order_months(uuid) to authenticated;
