-- Shein and TikTok keep the buyer's price on a line whatever its status: a
-- cancelled or refunded order still has total_value, and only net_amount shows
-- it was undone. The dashboards counted those orders as revenue while the
-- monthly report (isBilledOrder) left them out, so the two disagreed. Same
-- rule here as in the app.

create or replace function public.orders_summary(
  p_start date,
  p_end date,
  p_client_id uuid default null,
  p_marketplace text default null
)
returns table (day date, marketplace text, revenue numeric, orders bigint)
language sql
stable
security invoker
set search_path = public
as $fn$
  select
    o.created_on as day,
    o.marketplace,
    sum(o.subtotal) as revenue,
    count(distinct o.order_id) as orders
  from public.sales_orders o
  where o.created_on between p_start and p_end
    and (p_client_id is null or o.client_id = p_client_id)
    and (p_marketplace is null or o.marketplace = p_marketplace)
    -- What counts as billed, and it differs by marketplace: Shopee zeroes the
    -- buyer's payment when an order is cancelled, Mercado Livre leaves the
    -- revenue columns filled and reverses the sale in its own total, Shein and
    -- TikTok show it only in the net amount.
    and case
          when o.marketplace = 'mercado_livre' then coalesce(o.net_settlement, 0) > 0
          when o.marketplace in ('shein', 'tiktok') then coalesce(o.net_amount, 0) > 0
          else coalesce(o.total_value, 0) > 0
        end
  group by o.created_on, o.marketplace
$fn$;

revoke all on function public.orders_summary(date, date, uuid, text) from public;
grant execute on function public.orders_summary(date, date, uuid, text) to authenticated;
