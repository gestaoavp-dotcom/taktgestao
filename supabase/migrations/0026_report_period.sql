-- The window a report covers, for marketplaces that date each sale.
--
-- report_month was enough while a document meant a closed month. It cannot
-- describe "the 1st to yesterday", which is what a weekly upload is, and it
-- gives no way to tell a second upload of the same month from a duplicate.
--
-- With a window recorded, an import can replace exactly what it covers:
-- uploading the 1st to the 24th after the 1st to the 17th leaves one set of
-- orders, not one and a half. report_month stays, derived from the start, so
-- everything that groups by month keeps working.

alter table public.sales_reports
  add column if not exists period_start date,
  add column if not exists period_end date;

-- Reports imported before this covered whole months.
update public.sales_reports
set period_start = report_month,
    period_end = (report_month + interval '1 month - 1 day')::date
where period_start is null;
