import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export function createSupabaseClient(
  url: string,
  key: string
): SupabaseClient<Database> {
  return createClient<Database>(url, key);
}

export function createSupabaseServiceClient(
  url: string,
  serviceRoleKey: string
): SupabaseClient<Database> {
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
