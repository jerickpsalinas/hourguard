import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import type { Database } from '@hourguard/shared';
import { cookieDomainForHost, sharedCookieOptions } from './cookie-domain';

export function createClient() {
  const cookieStore = cookies();
  const domain = cookieDomainForHost(headers().get('host'));

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: sharedCookieOptions(domain),
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // In a Server Component render, Next forbids setting cookies and
          // throws. Supabase may try to write refreshed tokens here; swallow it
          // — the middleware is what actually refreshes and persists the session.
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            /* called from a Server Component; ignore */
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            /* called from a Server Component; ignore */
          }
        },
      },
    }
  );
}

export function createServiceClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { get: () => undefined, set: () => {}, remove: () => {} },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
