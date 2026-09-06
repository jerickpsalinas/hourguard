// Cross-subdomain SSO: one login on portal.hirejps.com should carry to every
// product app (hourguard.hirejps.com, etc.). The Supabase session cookie must
// therefore be written on the shared parent domain `.hirejps.com` so all
// subdomains can read it. On localhost or *.vercel.app we return undefined so
// the cookie stays host-only and dev/preview still work.
export function cookieDomainForHost(host?: string | null): string | undefined {
  if (!host) return undefined;
  const h = host.split(':')[0].toLowerCase(); // strip any :port
  return h === 'hirejps.com' || h.endsWith('.hirejps.com') ? '.hirejps.com' : undefined;
}

// Cookie options shared by every Supabase client so all apps produce an
// interoperable session cookie. `secure` follows the domain: prod (.hirejps.com)
// is always HTTPS; localhost is not.
export function sharedCookieOptions(domain: string | undefined) {
  return {
    domain,
    path: '/',
    sameSite: 'lax' as const,
    secure: domain !== undefined,
  };
}
