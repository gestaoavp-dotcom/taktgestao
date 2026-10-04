-- Mercado Livre renamed "Data da venda" to "Data de venda" in some exports, and
-- the importer only knew the first: a whole file of sales was stored without a
-- date, so no chart, filter or month counted it. The date is still in the raw
-- row, written out in Portuguese ("3 de outubro de 2026 17:35 hs.").
--
-- Each sale also goes under its own month, as the importer now files them: one
-- upload can cover June to October.

with parsed as (
  select
    o.id,
    regexp_match(
      replace(lower(trim(coalesce(o.raw ->> 'Data da venda', o.raw ->> 'Data de venda'))), 'março', 'marco'),
      '^(\d{1,2}) de ([a-z]+) de (\d{4})'
    ) as m
  from public.sales_orders o
  where o.created_on is null
    and o.marketplace = 'mercado_livre'
),
dated as (
  select
    id,
    make_date(
      m[3]::int,
      array_position(
        array['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho',
              'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
        m[2]
      ),
      m[1]::int
    ) as day
  from parsed
  where m is not null
)
update public.sales_orders o
set created_on = d.day,
    report_month = date_trunc('month', d.day)::date
from dated d
where o.id = d.id
  and d.day is not null;
