-- Mercado Livre's placement report (one row per campaign, week and ad space)
-- names its sales column "Vendas por publicidade (Diretas + Indiretas)", and
-- the importer only read "Vendas atribuídas": those files went in with zero
-- sales. The figure is still in the raw row.

update public.sales_ads
set conversions = round((raw ->> 'Vendas por publicidade (Diretas + Indiretas)')::numeric)
where marketplace = 'mercado_livre'
  and conversions = 0
  and raw ->> 'Vendas atribuídas (Diretas + Indiretas)' is null
  and raw ->> 'Vendas por publicidade (Diretas + Indiretas)' ~ '^[0-9]+(\.[0-9]+)?$';
