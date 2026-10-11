-- The same sum as orders_profit, split by marketplace.
--
-- The client's dashboard shows one line per channel with what it left, and
-- asking orders_profit once per channel would be a request each. This is one.
-- Same arithmetic and the same rule for a cancelled order, so a channel's
-- figure and the total cannot disagree.

create or replace function public.orders_profit_by_marketplace(
  p_start date,
  p_end date,
  p_client_id uuid default null
)
returns table (marketplace text, profit numeric)
language sql
stable
security invoker
set search_path = public
as $fn$
  select
    o.marketplace,
    coalesce(sum(
      coalesce(o.net_amount, o.net_settlement)
      - coalesce(o.cost, 0)
      - coalesce(o.extra_costs, 0)
      - coalesce(o.net_amount, o.net_settlement) * coalesce(o.tax_percent, 0) / 100
    ), 0) as profit
  from public.sales_orders o
  where o.created_on between p_start and p_end
    and (p_client_id is null or o.client_id = p_client_id)
    and case
          when o.marketplace = 'mercado_livre'
            then not (coalesce(o.net_settlement, 0) = 0 and coalesce(o.subtotal, 0) > 0)
          else coalesce(o.total_value, 0) <> 0
        end
  group by o.marketplace
$fn$;

revoke all on function public.orders_profit_by_marketplace(date, date, uuid) from public;
grant execute on function public.orders_profit_by_marketplace(date, date, uuid) to authenticated;
