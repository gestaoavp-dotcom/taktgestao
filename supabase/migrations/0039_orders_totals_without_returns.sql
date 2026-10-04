-- "Vendido" on the Pedidos tab counted a Mercado Livre sale that came back —
-- its settlement turns negative — while every dashboard left it out, so the
-- tab and the dashboards disagreed by the returns. Now both count only billed
-- sales; the returns show beside them, worked out by the app with the same
-- rule (isReturnedOrder).
--
-- What was received and what was left keep the returns in: the fees and the
-- shipping a return cost were really paid. Same columns as before, so
-- save_order_costs, which hands these totals back, needs no change.

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
    select
      o.*,
      case
        when o.marketplace = 'mercado_livre' then coalesce(o.net_settlement, 0) > 0
        when o.marketplace in ('shein', 'tiktok') then coalesce(o.net_amount, 0) > 0
        else coalesce(o.total_value, 0) > 0
      end as billed
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
    count(distinct order_id) filter (where billed),
    count(*),
    coalesce(sum(subtotal) filter (where billed), 0),
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
