export type UserRole = 'owner' | 'manager' | 'employee';

export interface Organization {
  id: string;
  name: string;
  access_type: string[];
  created_at: string;
}

export interface Member {
  id: string;
  organization_id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  hourly_rate: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  member_id: string;
  organization_id: string;
  project_id: string | null;
  started_at: string;
  stopped_at: string | null;
  keyboard_events: number;
  mouse_events: number;
  activity_percent: number;
  created_at: string;
}

export interface Screenshot {
  id: string;
  time_entry_id: string;
  member_id: string;
  organization_id: string;
  storage_path: string;
  captured_at: string;
  activity_percent: number;
  created_at: string;
}

export interface Invite {
  id: string;
  organization_id: string;
  email: string | null;
  token: string;
  role: UserRole;
  accepted: boolean;
  created_at: string;
  expires_at: string;
}

export interface ApiKey {
  id: string;
  organization_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  created_by: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  organization_id: string;
  project_id: string | null;
  created_by: string | null;
  created_via: 'dashboard' | 'api';
  title: string;
  from_date: string;
  to_date: string;
  total_hours: number;
  hourly_rate: number;
  total_amount: number;
  currency: string;
  storage_path: string | null;
  status: 'draft' | 'finalized';
  created_at: string;
}

// Minimal Database type — supabase-js uses this for table name inference.
// For full type safety, generate types with `supabase gen types typescript`.
export type Database = Record<string, any>;
