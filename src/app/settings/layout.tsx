import { auth } from '@clerk/nextjs/server';

/**
 * Server-side auth gate for the /settings route.
 *
 * Replaces the global Clerk middleware that previously sat in
 * `src/middleware.ts` — Next.js 16's "Proxy" file convention pins
 * middleware to the Node.js runtime, which Cloudflare Workers
 * (via `@opennextjs/cloudflare`) cannot host. Moving the auth
 * check here keeps the protected surface narrow and per-route,
 * which is the App-Router-native pattern Clerk recommends for
 * Next.js 15+ and is fully edge-compatible.
 *
 * `auth.protect()` short-circuits with a redirect to the Clerk
 * sign-in flow when no session is present; signed-in users fall
 * through to the existing client-side settings page unchanged.
 *
 * The root layout is intentionally left unprotected — the
 * homepage (`/`) is the public landing surface and must stay
 * reachable to anonymous users.
 */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await auth.protect();
  return <>{children}</>;
}
