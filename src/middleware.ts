import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Force edge runtime — required by `@opennextjs/cloudflare`, which
// rejects Node-runtime middleware (Cloudflare Workers has no Node
// runtime to fall back to). The legacy `middleware.ts` filename
// keeps the edge-compatible convention; Next.js 16's newer
// `proxy.ts` filename pins to Node and is incompatible with
// Workers deployment.
//
// Next.js 16 renamed the edge value to `experimental-edge` for this
// code path — the old `'edge'` is rejected at build time with
// "the edge runtime for rendering is currently experimental".
export const runtime = 'experimental-edge';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  // Protect all routes except public ones
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
