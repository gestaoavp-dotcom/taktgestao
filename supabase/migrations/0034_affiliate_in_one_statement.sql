-- Changing the affiliate's share used to rewrite one row at a time — two of
-- the three seconds it took to leave that field, and it grows with the number
-- of lines a product has.
--
-- The net only needs recomputing because its parts live in code. Stored, it is
-- arithmetic the database can do for every affected line in one statement:
--
--   net = base − tarifa − base × afiliado%
--
-- base is the price the marketplace charges against (for TikTok, the listing
-- price less the seller's own discount) and fee is what it charges. Both are
-- settled at import and never change; only the affiliate's share does.

alter table public.sales_orders
  add column if not exists gross_base numeric(12, 2),
  add column if not exists fee_amount numeric(12, 2);

/*
 * Sets the affiliate's share across one product and recomputes what is left.
 *
 * Scoped the way a cost is: by SKU when there is one, by exact title when
 * there is not, and from the given month forward — an earlier month keeps the
 * share that applied when it was sold.
 */
create or replace function public.set_affiliate_percent(
  p_client_id uuid,
  p_sku text,
  p_product_name text,
  p_from_month date,
  p_percent numeric
)
returns integer
language plpgsql
security invoker
set search_path = public
as $fn$
declare
  touched integer;
begin
  update public.sales_orders
  set
    affiliate_percent = p_percent,
    net_amount = case
      when gross_base is null then net_amount
      else round(
        gross_base - coalesce(fee_amount, 0)
          - gross_base * coalesce(p_percent, 0) / 100,
        2
      )
    end
  where client_id = p_client_id
    and report_month >= p_from_month
    and (
      (p_sku is not null and sku = p_sku)
      or (p_sku is null and sku is null and product_name = p_product_name)
    );

  get diagnostics touched = row_count;
  return touched;
end;
$fn$;

revoke all on function public.set_affiliate_percent(uuid, text, text, date, numeric) from public;
grant execute on function public.set_affiliate_percent(uuid, text, text, date, numeric) to authenticated;
