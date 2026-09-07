-- Make created_by nullable on hg_invoices and hg_api_keys so API-generated
-- records don't need a fake member attribution.
-- Add created_via to hg_invoices to distinguish dashboard vs API origin.

alter table hg_invoices alter column created_by drop not null;

alter table hg_invoices
  add column if not exists created_via text not null default 'dashboard'
  check (created_via in ('dashboard', 'api'));

alter table hg_api_keys alter column created_by drop not null;
