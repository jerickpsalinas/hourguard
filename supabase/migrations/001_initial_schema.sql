-- Organizations
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id),
  full_name text not null,
  email text not null,
  role text not null check (role in ('owner', 'manager', 'employee')),
  hourly_rate numeric(10,2),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Time entries
create table time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  organization_id uuid not null references organizations(id),
  project_id uuid references projects(id),
  started_at timestamptz not null,
  stopped_at timestamptz,
  keyboard_events int default 0,
  mouse_events int default 0,
  activity_percent int default 0 check (activity_percent between 0 and 100),
  created_at timestamptz default now()
);

-- Screenshots
create table screenshots (
  id uuid primary key default gen_random_uuid(),
  time_entry_id uuid not null references time_entries(id) on delete cascade,
  user_id uuid not null references profiles(id),
  organization_id uuid not null references organizations(id),
  storage_path text not null,
  captured_at timestamptz not null,
  activity_percent int default 0,
  created_at timestamptz default now()
);

-- Invites
create table invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  email text,
  token text not null unique,
  role text not null default 'employee' check (role in ('owner', 'manager', 'employee')),
  accepted boolean default false,
  created_at timestamptz default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

-- API keys (for external integrations)
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  key_hash text not null,
  key_prefix text not null,
  created_by uuid not null references profiles(id),
  is_active boolean default true,
  last_used_at timestamptz,
  created_at timestamptz default now()
);

-- Invoices
create table invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  project_id uuid references projects(id),
  created_by uuid not null references profiles(id),
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
create index idx_time_entries_user on time_entries(user_id, started_at desc);
create index idx_time_entries_org on time_entries(organization_id, started_at desc);
create index idx_screenshots_entry on screenshots(time_entry_id);
create index idx_screenshots_user on screenshots(user_id, captured_at desc);
create index idx_api_keys_org on api_keys(organization_id);
create index idx_invoices_org on invoices(organization_id, created_at desc);

-- RLS
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table projects enable row level security;
alter table time_entries enable row level security;
alter table screenshots enable row level security;
alter table invites enable row level security;
alter table api_keys enable row level security;
alter table invoices enable row level security;

-- Helper: get current user's org
create or replace function auth_org_id() returns uuid as $$
  select organization_id from profiles where id = auth.uid()
$$ language sql security definer stable;

create or replace function auth_role() returns text as $$
  select role from profiles where id = auth.uid()
$$ language sql security definer stable;

-- Profiles: see own org members
create policy "See own org profiles" on profiles
  for select using (organization_id = auth_org_id());

create policy "Update own profile" on profiles
  for update using (id = auth.uid());

create policy "Insert own profile" on profiles
  for insert with check (id = auth.uid());

-- Organizations: members can see their own org
create policy "See own org" on organizations
  for select using (id = auth_org_id());

create policy "Create org" on organizations
  for insert with check (true);

-- Projects: org members see, managers+ manage
create policy "See org projects" on projects
  for select using (organization_id = auth_org_id());

create policy "Manage org projects" on projects
  for all using (
    organization_id = auth_org_id()
    and auth_role() in ('owner', 'manager')
  );

-- Time entries: employees own, managers+ see all org
create policy "See own time entries" on time_entries
  for select using (user_id = auth.uid());

create policy "Managers see org time entries" on time_entries
  for select using (
    organization_id = auth_org_id()
    and auth_role() in ('owner', 'manager')
  );

create policy "Insert own time entries" on time_entries
  for insert with check (user_id = auth.uid());

create policy "Update own time entries" on time_entries
  for update using (user_id = auth.uid());

-- Screenshots
create policy "See own screenshots" on screenshots
  for select using (user_id = auth.uid());

create policy "Managers see org screenshots" on screenshots
  for select using (
    organization_id = auth_org_id()
    and auth_role() in ('owner', 'manager')
  );

create policy "Insert own screenshots" on screenshots
  for insert with check (user_id = auth.uid());

-- Invites: org managers+ manage
create policy "See org invites" on invites
  for select using (
    organization_id = auth_org_id()
    and auth_role() in ('owner', 'manager')
  );

create policy "Manage org invites" on invites
  for all using (
    organization_id = auth_org_id()
    and auth_role() in ('owner', 'manager')
  );

-- API keys: org owners manage
create policy "See org api keys" on api_keys
  for select using (
    organization_id = auth_org_id()
    and auth_role() in ('owner', 'manager')
  );

create policy "Manage org api keys" on api_keys
  for all using (
    organization_id = auth_org_id()
    and auth_role() = 'owner'
  );

-- Invoices: managers+ see and manage
create policy "See org invoices" on invoices
  for select using (
    organization_id = auth_org_id()
    and auth_role() in ('owner', 'manager')
  );

create policy "Manage org invoices" on invoices
  for all using (
    organization_id = auth_org_id()
    and auth_role() in ('owner', 'manager')
  );
