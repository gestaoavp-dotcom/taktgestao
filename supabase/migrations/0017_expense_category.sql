-- Expenses are split into fixed (taxes, recurring subscriptions) and
-- variable (one-offs, events, investments), so the Finanças summary can
-- show each apart and the cash-reserve suggestion can read how volatile
-- spending has been. Existing rows default to "variable" — nothing about
-- them was ever fixed by definition.

alter table public.finance_entries
  add column if not exists category text check (category in ('fixed', 'variable'));

update public.finance_entries
set category = 'variable'
where type = 'expense' and category is null;
