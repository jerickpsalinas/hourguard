-- ============================================================================
-- Hourguard adapted for hirejps-portal
-- Prefixed `hg_` to avoid collisions with existing tables (organizations, etc)
-- Assumes current_org_id() already exists (used by ft_ tables)
-- ============================================================================

-- hg_members: role-per-org membership (owner / manager / employee)
create table if not exists hg_members (
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

create table if not exists hg_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists hg_time_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  member_id uuid not null references hg_members(id) on delete cascade,
  project_id uuid references hg_projects(id) on delete set null,
  started_at timestamptz not null,
  stopped_at timestamptz,
  keyboard_events int default 0,
  mouse_events int default 0,
  activity_percent int default 0 check (activity_percent between 0 and 100),
  created_at timestamptz default now()
);

create table if not exists hg_screenshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  time_entry_id uuid not null references hg_time_entries(id) on delete cascade,
  member_id uuid not null references hg_members(id) on delete cascade,
  storage_path text not null,
  captured_at timestamptz not null,
  activity_percent int default 0,
  created_at timestamptz default now()
);

create table if not exists hg_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text,
  token text not null unique,
  role text not null default 'employee' check (role in ('owner', 'manager', 'employee')),
  accepted boolean default false,
  created_at timestamptz default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create table if not exists hg_api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  key_hash text not null,
  key_prefix text not null,
  created_by uuid not null references hg_members(id),
  is_active boolean default true,
  last_used_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists hg_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid references hg_projects(id) on delete set null,
  created_by uuid not null references hg_members(id),
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

-- Indexes
create index if not exists idx_hg_members_org on hg_members(organization_id);
create index if not exists idx_hg_members_user on hg_members(auth_user_id);
create index if not exists idx_hg_projects_org on hg_projects(organization_id);
create index if not exists idx_hg_time_entries_member on hg_time_entries(member_id, started_at desc);
create index if not exists idx_hg_time_entries_org on hg_time_entries(organization_id, started_at desc);
create index if not exists idx_hg_screenshots_entry on hg_screenshots(time_entry_id);
create index if not exists idx_hg_screenshots_member on hg_screenshots(member_id, captured_at desc);
create index if not exists idx_hg_api_keys_org on hg_api_keys(organization_id);
create index if not exists idx_hg_invoices_org on hg_invoices(organization_id, created_at desc);

-- RLS
alter table hg_members enable row level security;
alter table hg_projects enable row level security;
alter table hg_time_entries enable row level security;
alter table hg_screenshots enable row level security;
alter table hg_invites enable row level security;
alter table hg_api_keys enable row level security;
alter table hg_invoices enable row level security;

-- Helper: get current user's hg_members id + role in current org
create or replace function hg_current_member_id() returns uuid as $$
  select id from hg_members
  where auth_user_id = auth.uid()
    and organization_id = current_org_id()
  limit 1
$$ language sql security definer stable;

create or replace function hg_current_role() returns text as $$
  select role from hg_members
  where auth_user_id = auth.uid()
    and organization_id = current_org_id()
  limit 1
$$ language sql security definer stable;

-- Members
create policy "hg_members: see own org" on hg_members
  for select using (organization_id = current_org_id());
create policy "hg_members: owner+manager manage" on hg_members
  for all using (
    organization_id = current_org_id()
    and hg_current_role() in ('owner', 'manager')
  );

-- Projects
create policy "hg_projects: see org" on hg_projects
  for select using (organization_id = current_org_id());
create policy "hg_projects: manage" on hg_projects
  for all using (
    organization_id = current_org_id()
    and hg_current_role() in ('owner', 'manager')
  );

-- Time entries
create policy "hg_time_entries: see own" on hg_time_entries
  for select using (member_id = hg_current_member_id());
create policy "hg_time_entries: managers see org" on hg_time_entries
  for select using (
    organization_id = current_org_id()
    and hg_current_role() in ('owner', 'manager')
  );
create policy "hg_time_entries: insert own" on hg_time_entries
  for insert with check (
    member_id = hg_current_member_id()
    and organization_id = current_org_id()
  );
create policy "hg_time_entries: update own" on hg_time_entries
  for update using (member_id = hg_current_member_id());

-- Screenshots
create policy "hg_screenshots: see own" on hg_screenshots
  for select using (member_id = hg_current_member_id());
create policy "hg_screenshots: managers see org" on hg_screenshots
  for select using (
    organization_id = current_org_id()
    and hg_current_role() in ('owner', 'manager')
  );
create policy "hg_screenshots: insert own" on hg_screenshots
  for insert with check (
    member_id = hg_current_member_id()
    and organization_id = current_org_id()
  );

-- Invites
create policy "hg_invites: managers see org" on hg_invites
  for select using (
    organization_id = current_org_id()
    and hg_current_role() in ('owner', 'manager')
  );
create policy "hg_invites: managers manage" on hg_invites
  for all using (
    organization_id = current_org_id()
    and hg_current_role() in ('owner', 'manager')
  );

-- API keys
create policy "hg_api_keys: managers see" on hg_api_keys
  for select using (
    organization_id = current_org_id()
    and hg_current_role() in ('owner', 'manager')
  );
create policy "hg_api_keys: owners manage" on hg_api_keys
  for all using (
    organization_id = current_org_id()
    and hg_current_role() = 'owner'
  );

-- Invoices
create policy "hg_invoices: managers see" on hg_invoices
  for select using (
    organization_id = current_org_id()
    and hg_current_role() in ('owner', 'manager')
  );
create policy "hg_invoices: managers manage" on hg_invoices
  for all using (
    organization_id = current_org_id()
    and hg_current_role() in ('owner', 'manager')
  );
