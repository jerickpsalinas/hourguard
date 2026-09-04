-- ============================================================================
-- Hubstaff-mimick adapted for hirejps-portal Supabase project
-- ============================================================================
-- This migration prepares the time-tracker product to live inside the shared
-- hirejps-portal multi-tenant database, alongside the Finance Tracker and
-- other Store products.
--
-- Key changes from the original 001_initial_schema.sql:
--   * All tables prefixed with `ht_` to avoid collisions
--   * `organizations` table NOT recreated (already exists in hirejps-portal)
--   * Auth helper uses the existing `current_org_id()` instead of a new one
--   * Role-per-org lives in `ht_members` (owner/manager/employee) rather than
--     mutating a global `profiles` table
--   * `access_type` gate is added at the end
--
-- Run this in the hirejps-portal SQL editor (NOT the standalone hubstaff DB).
-- Review before applying.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Role-per-org membership for time-tracker product
-- ----------------------------------------------------------------------------
-- Note: hirejps-portal already has portal_users to link auth.users to
-- organizations. This table adds the role-per-org concept specific to the
-- time-tracker (owner / manager / employee).
create table if not exists ht_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null check (role in ('owner', 'manager', 'employee')),
  hourly_rate numeric(10,2),
  is_active boolean default true,
  created_at timestamptz default now(),
  unique (organization_id, auth_user_id)
);

create table if not exists ht_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists ht_time_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  member_id uuid not null references ht_members(id) on delete cascade,
  project_id uuid references ht_projects(id) on delete set null,
  started_at timestamptz not null,
  stopped_at timestamptz,
  keyboard_events int default 0,
  mouse_events int default 0,
  activity_percent int default 0 check (activity_percent between 0 and 100),
  created_at timestamptz default now()
);

create table if not exists ht_screenshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  time_entry_id uuid not null references ht_time_entries(id) on delete cascade,
  member_id uuid not null references ht_members(id) on delete cascade,
  storage_path text not null,
  captured_at timestamptz not null,
  activity_percent int default 0,
  created_at timestamptz default now()
);

create table if not exists ht_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text,
  token text not null unique,
  role text not null default 'employee' check (role in ('owner', 'manager', 'employee')),
  accepted boolean default false,
  created_at timestamptz default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create table if not exists ht_api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  key_hash text not null,
  key_prefix text not null,
  created_by uuid not null references ht_members(id),
  is_active boolean default true,
  last_used_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists ht_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid references ht_projects(id) on delete set null,
  created_by uuid not null references ht_members(id),
  title text not null,
  from_date date not null,
  to_date date not null,
  total_hours numeric(10,2) not null,
  hourly_rate numeric(10,2) not null,
  total_amount numeric(12,2) not null,
  currency text not null default 'USD',
  storage_path text,
  status text not null default 'draft' check (status in ('draft', 'finalized')),
  created_at timestamptz default now()
);


-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------
create index if not exists idx_ht_members_org on ht_members(organization_id);
create index if not exists idx_ht_members_user on ht_members(auth_user_id);
create index if not exists idx_ht_projects_org on ht_projects(organization_id);
create index if not exists idx_ht_time_entries_member on ht_time_entries(member_id, started_at desc);
create index if not exists idx_ht_time_entries_org on ht_time_entries(organization_id, started_at desc);
create index if not exists idx_ht_screenshots_entry on ht_screenshots(time_entry_id);
create index if not exists idx_ht_screenshots_member on ht_screenshots(member_id, captured_at desc);
create index if not exists idx_ht_api_keys_org on ht_api_keys(organization_id);
create index if not exists idx_ht_invoices_org on ht_invoices(organization_id, created_at desc);


-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table ht_members enable row level security;
alter table ht_projects enable row level security;
alter table ht_time_entries enable row level security;
alter table ht_screenshots enable row level security;
alter table ht_invites enable row level security;
alter table ht_api_keys enable row level security;
alter table ht_invoices enable row level security;


-- ----------------------------------------------------------------------------
-- Helper: get current user's ht_members row for their current org
-- ----------------------------------------------------------------------------
-- Assumes `current_org_id()` already exists in hirejps-portal.
create or replace function ht_current_member_id() returns uuid as $$
  select id from ht_members
  where auth_user_id = auth.uid()
    and organization_id = current_org_id()
  limit 1
$$ language sql security definer stable;

create or replace function ht_current_role() returns text as $$
  select role from ht_members
  where auth_user_id = auth.uid()
    and organization_id = current_org_id()
  limit 1
$$ language sql security definer stable;


-- ----------------------------------------------------------------------------
-- Members: see own org members
-- ----------------------------------------------------------------------------
create policy "ht_members: see own org" on ht_members
  for select using (organization_id = current_org_id());

create policy "ht_members: owner+manager manage" on ht_members
  for all using (
    organization_id = current_org_id()
    and ht_current_role() in ('owner', 'manager')
  );


-- ----------------------------------------------------------------------------
-- Projects
-- ----------------------------------------------------------------------------
create policy "ht_projects: see org" on ht_projects
  for select using (organization_id = current_org_id());

create policy "ht_projects: manage" on ht_projects
  for all using (
    organization_id = current_org_id()
    and ht_current_role() in ('owner', 'manager')
  );


-- ----------------------------------------------------------------------------
-- Time entries
-- ----------------------------------------------------------------------------
create policy "ht_time_entries: see own" on ht_time_entries
  for select using (member_id = ht_current_member_id());

create policy "ht_time_entries: managers see org" on ht_time_entries
  for select using (
    organization_id = current_org_id()
    and ht_current_role() in ('owner', 'manager')
  );

create policy "ht_time_entries: insert own" on ht_time_entries
  for insert with check (
    member_id = ht_current_member_id()
    and organization_id = current_org_id()
  );

create policy "ht_time_entries: update own" on ht_time_entries
  for update using (member_id = ht_current_member_id());


-- ----------------------------------------------------------------------------
-- Screenshots
-- ----------------------------------------------------------------------------
create policy "ht_screenshots: see own" on ht_screenshots
  for select using (member_id = ht_current_member_id());

create policy "ht_screenshots: managers see org" on ht_screenshots
  for select using (
    organization_id = current_org_id()
    and ht_current_role() in ('owner', 'manager')
  );

create policy "ht_screenshots: insert own" on ht_screenshots
  for insert with check (
    member_id = ht_current_member_id()
    and organization_id = current_org_id()
  );


-- ----------------------------------------------------------------------------
-- Invites
-- ----------------------------------------------------------------------------
create policy "ht_invites: managers see org" on ht_invites
  for select using (
    organization_id = current_org_id()
    and ht_current_role() in ('owner', 'manager')
  );

create policy "ht_invites: managers manage" on ht_invites
  for all using (
    organization_id = current_org_id()
    and ht_current_role() in ('owner', 'manager')
  );


-- ----------------------------------------------------------------------------
-- API keys
-- ----------------------------------------------------------------------------
create policy "ht_api_keys: managers see" on ht_api_keys
  for select using (
    organization_id = current_org_id()
    and ht_current_role() in ('owner', 'manager')
  );

create policy "ht_api_keys: owners manage" on ht_api_keys
  for all using (
    organization_id = current_org_id()
    and ht_current_role() = 'owner'
  );


-- ----------------------------------------------------------------------------
-- Invoices
-- ----------------------------------------------------------------------------
create policy "ht_invoices: managers see" on ht_invoices
  for select using (
    organization_id = current_org_id()
    and ht_current_role() in ('owner', 'manager')
  );

create policy "ht_invoices: managers manage" on ht_invoices
  for all using (
    organization_id = current_org_id()
    and ht_current_role() in ('owner', 'manager')
  );


-- ============================================================================
-- After running this migration, grant time-tracker access to a test org:
--
--   update organizations
--     set access_type = array_append(access_type, 'time-tracker')
--     where name = 'Test Buyer Co';
--
-- Then insert an ht_members row for the first user (as owner) to bootstrap:
--
--   insert into ht_members (organization_id, auth_user_id, full_name, email, role)
--     values ('<org-uuid>', '<auth-user-uuid>', 'Jerick', 'jerick@...', 'owner');
-- ============================================================================
