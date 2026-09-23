-- Proves the access rules do what they claim, by asking the database as each
-- kind of login in turn. Run it in the SQL editor after 0023.
--
-- Replace the two ids below with real ones:
--   :dono_id      any row of public.profiles with role 'dono'
--   :cliente_id   a profile with role 'cliente' bound to a client
--
-- Every SET is local to the transaction, so nothing here changes the database.

begin;

-- ------------------------------------------------- as an external client --
set local role authenticated;
set local request.jwt.claims = '{"sub":"COLE-AQUI-O-ID-DO-PERFIL-CLIENTE","role":"authenticated"}';

select 'cliente vê clientes'        as pergunta, count(*) as resposta, '1 (só o dele)' as esperado from clients
union all
select 'cliente vê pedidos',          count(*), 'só os do cliente dele'      from sales_orders
union all
select 'cliente vê SENHAS',           count(*), '0 — nunca'                  from client_credentials
union all
select 'cliente vê financeiro TAKT',  count(*), '0 — nunca'                  from finance_entries
union all
select 'cliente vê tarefas',          count(*), '0 — nunca'                  from tasks
union all
select 'cliente vê alterações',       count(*), 'só as do cliente dele'      from client_changes;

-- --------------------------------------------------------- as an operator --
set local request.jwt.claims = '{"sub":"COLE-AQUI-O-ID-DE-UM-OPERADOR","role":"authenticated"}';

select 'operador vê clientes'         as pergunta, count(*) as resposta, 'todos' as esperado from clients
union all
select 'operador vê senhas',          count(*), 'todas'                      from client_credentials
union all
select 'operador vê financeiro TAKT', count(*), '0 — só o dono'              from finance_entries;

-- ------------------------------------------------------------ as an owner --
set local request.jwt.claims = '{"sub":"COLE-AQUI-O-ID-DO-DONO","role":"authenticated"}';

select 'dono vê clientes'             as pergunta, count(*) as resposta, 'todos' as esperado from clients
union all
select 'dono vê senhas',              count(*), 'todas'                      from client_credentials
union all
select 'dono vê financeiro TAKT',     count(*), 'todos'                      from finance_entries;

rollback;
