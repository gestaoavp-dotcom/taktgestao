-- Adds up orders in the database instead of in the browser's server.
--
-- The dashboard used to fetch every order in the window to sum them: 5223 rows
-- over six sequential requests for a 30-day range, each waiting on the last.
-- The answer is one row per day per marketplace — a few dozen — so the sum
-- belongs where the rows already are.
--
-- security invoker, so row-level rules still apply: a client login gets its own
-- client's days and nobody else's.

create index if not exists sales_orders_created_on_idx
  on public.sales_orders(created_on);

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
    -- revenue columns filled and reverses the sale in its own total.
    and case
          when o.marketplace = 'mercado_livre' then coalesce(o.net_settlement, 0) > 0
          else coalesce(o.total_value, 0) > 0
        end
  group by o.created_on, o.marketplace
$fn$;

revoke all on function public.orders_summary(date, date, uuid, text) from public;
grant execute on function public.orders_summary(date, date, uuid, text) to authenticated;
