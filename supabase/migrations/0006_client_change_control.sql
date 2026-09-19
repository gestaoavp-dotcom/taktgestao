-- Bring client_changes closer to the team's "Controle de Alterações" spreadsheet:
-- track which channel/marketplace an action was for, categorize it, and track its
-- status through to closure (status is required — an open item must never be silent).

alter table public.client_changes
  add column if not exists marketplace text,
  add column if not exists category text,
  add column if not exists status text not null default 'aberta',
  add column if not exists closed_on date,
  add column if not exists evidence text;

alter table public.client_changes
  add constraint client_changes_status_check
    check (status in ('aberta', 'em_andamento', 'concluida', 'monitorando'));

alter table public.client_changes
  add constraint client_changes_category_check
    check (
      category is null or category in (
        'preco', 'oferta', 'campanha', 'estoque',
        'atendimento_amazon', 'conteudo', 'avaliacao', 'outro'
      )
    );
