-- The whole cost save in one round trip.
--
-- Leaving the field ran four queries in sequence — read the line, write it,
-- spread the cost across the product, spread the tax across the client — each
-- waiting on the last. At 150 ms of network each way that is most of a second
-- before the database has done any work.
--
-- One function does the lot, and the database sees the row it is writing, so
-- the read disappears too.

create or replace function public.save_order_costs(
  p_order_id uuid,
  p_client_id uuid,
  p_cost numeric,
  p_extra numeric,
  p_tax numeric,
  p_affiliate numeric
)
returns void
language plpgsql
security invoker
set search_path = public
as $fn$
declare
  v_sku text;
  v_name text;
  v_month date;
  v_marketplace text;
begin
  select sku, product_name, report_month, marketplace
  into v_sku, v_name, v_month, v_marketplace
  from public.sales_orders
  where id = p_order_id and client_id = p_client_id;

  if not found then
    return;
  end if;

  -- This line's own extra costs belong to it alone.
  update public.sales_orders set extra_costs = p_extra where id = p_order_id;

  -- A cost belongs to the product, from this month forward. Earlier months
  -- keep what it cost at the time.
  update public.sales_orders
  set
    cost = p_cost,
    affiliate_percent = case when marketplace = 'tiktok' then p_affiliate else affiliate_percent end,
    net_amount = case
      when marketplace = 'tiktok' and gross_base is not null
        then round(
          gross_base - coalesce(fee_amount, 0)
            - gross_base * coalesce(p_affiliate, 0) / 100,
          2
        )
      else net_amount
    end
  where client_id = p_client_id
    and report_month >= v_month
    and (
      (v_sku is not null and sku = v_sku)
      or (v_sku is null and sku is null and product_name = v_name)
    );

  -- The tax rate is one number for the client, and moves forward the same way.
  update public.sales_orders
  set tax_percent = p_tax
  where client_id = p_client_id and report_month >= v_month;
end;
$fn$;

revoke all on function public.save_order_costs(uuid, uuid, numeric, numeric, numeric, numeric) from public;
grant execute on function public.save_order_costs(uuid, uuid, numeric, numeric, numeric, numeric) to authenticated;
