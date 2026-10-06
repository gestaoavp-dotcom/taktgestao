-- What was left after the marketplace's fees and the seller's own costs, for
-- a date range rather than a report month.
--
-- orders_totals already answers this, but it scopes by report_month, which is
-- the month of the file — the Visão geral asks by the day of the sale, the
-- same column its chart and its revenue use. Same arithmetic, same rule for
-- what a cancelled order is, so the two tabs cannot drift apart.

create or replace function public.orders_profit(
  p_start date,
  p_end date,
  p_client_id uuid default null,
  p_marketplace text default null
)
returns table (
  net numeric,
  cost numeric,
  extra numeric,
  tax numeric,
  profit numeric
)
language sql
stable
security invoker
set search_path = public
as $fn$
  with scoped as (
    select o.*
    from public.sales_orders o
    where o.created_on between p_start and p_end
      and (p_client_id is null or o.client_id = p_client_id)
      and (p_marketplace is null or o.marketplace = p_marketplace)
      -- A cancelled order sold nothing and cost nothing: the product never
      -- left the shelf. Which column says so differs by marketplace. A return
      -- stays in — its fees and its shipping were really paid.
      and case
            when o.marketplace = 'mercado_livre'
              then not (coalesce(o.net_settlement, 0) = 0 and coalesce(o.subtotal, 0) > 0)
            else coalesce(o.total_value, 0) <> 0
          end
  )
  select
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

revoke all on function public.orders_profit(date, date, uuid, text) from public;
grant execute on function public.orders_profit(date, date, uuid, text) to authenticated;
