-- Org-level integrations (Slack, etc.)
create table if not exists hg_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type text not null check (type in ('slack_webhook')),
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, type)
);

alter table hg_integrations enable row level security;

create policy "Members can view their org integrations"
  on hg_integrations for select
  using (organization_id = current_org_id());

create policy "Admins can manage integrations"
  on hg_integrations for all
  using (
    organization_id = current_org_id()
    and hg_current_role() in ('owner', 'manager')
  );
