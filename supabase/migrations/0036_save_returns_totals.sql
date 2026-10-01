-- The save hands back the totals it just changed.
--
-- Writing a cost used to be followed by rebuilding the whole page — the
-- totals, the pending-cost count and two hundred rows — because the footer is
-- the only thing on screen the browser cannot work out for itself: it covers
-- the whole filter, not the rows loaded.
--
-- Returning it from the same call means the table never reloads. The typed
-- value is already on screen; only the footer had to catch up.

create or replace function public.save_order_costs(
  p_order_id uuid,
  p_client_id uuid,
  p_cost numeric,
  p_extra numeric,
  p_tax numeric,
  p_affiliate numeric,
  p_month date default null,
  p_marketplace text default null,
  p_account_id uuid default null,
  p_missing_cost boolean default null
)
returns table (
  orders bigint, lines bigint, sold numeric, net numeric,
  cost numeric, extra numeric, tax numeric, margin numeric
)
language plpgsql
security invoker
set search_path = public
as $fn$
declare
  v_sku text;
  v_name text;
  v_month date;
begin
  select sku, product_name, report_month
  into v_sku, v_name, v_month
  from public.sales_orders
  where id = p_order_id and client_id = p_client_id;

  if found then
    -- This line's own extra costs belong to it alone.
    update public.sales_orders set extra_costs = p_extra where id = p_order_id;

    -- A cost belongs to the product, from this month forward.
    update public.sales_orders
    set
      cost = p_cost,
      affiliate_percent =
        case when marketplace = 'tiktok' then p_affiliate else affiliate_percent end,
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

    -- The tax rate is one number for the client, moving forward the same way.
    update public.sales_orders
    set tax_percent = p_tax
    where client_id = p_client_id and report_month >= v_month;
  end if;

  return query
  select * from public.orders_totals(
    p_client_id, p_month, p_marketplace, p_account_id, p_missing_cost
  );
end;
$fn$;

revoke all on function public.save_order_costs(
  uuid, uuid, numeric, numeric, numeric, numeric, date, text, uuid, boolean
) from public;
grant execute on function public.save_order_costs(
  uuid, uuid, numeric, numeric, numeric, numeric, date, text, uuid, boolean
) to authenticated;
