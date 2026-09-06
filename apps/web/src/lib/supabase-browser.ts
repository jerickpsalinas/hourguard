import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@hourguard/shared';
import { cookieDomainForHost, sharedCookieOptions } from './cookie-domain';

export function createClient() {
  const domain = cookieDomainForHost(
    typeof window !== 'undefined' ? window.location.hostname : undefined
  );
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: sharedCookieOptions(domain) }
  );
}
