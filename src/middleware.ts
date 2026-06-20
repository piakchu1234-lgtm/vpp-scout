import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/app(.*)',
  '/projects(.*)',
  '/settings(.*)',
  '/api/projects(.*)',
  '/api/site-finder(.*)',
  '/api/ai-analyst(.*)',
  '/api/agent-search(.*)',
  '/api/assess-ssd(.*)',
  '/api/development-applications(.*)',
  '/api/insight(.*)',
  '/api/market-data(.*)',
  '/api/vpp-agent(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Protect routes that require authentication
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  const response = NextResponse.next();

  // Permissive CSP headers to allow react-to-print's dynamic iframe
  // instantiation. The print library creates an about:blank iframe at
  // runtime to clone the report DOM — without frame-src 'self' blob: data:,
  // strict browser security policies block contentWindow access.
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://js.stripe.com https://*.clerk.accounts.dev",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://api.mapbox.com https://maps.googleapis.com https://*.basemaps.cartocdn.com https://img.clerk.com",
      "connect-src 'self' https://*.mapbox.com https://*.arcgis.com https://services.land.vic.gov.au https://*.openstreetmap.org https://nominatim.openstreetmap.org https://maps.googleapis.com https://api.stripe.com https://*.clerk.accounts.dev wss://*.clerk.accounts.dev data: blob:",
      "frame-src 'self' blob: data: https://js.stripe.com https://*.clerk.accounts.dev",
      "child-src 'self' blob: data:",
      "worker-src 'self' blob:",
    ].join('; ')
  );

  return response;
});

export const config = {
  matcher: [
    // Run on every page route except Next.js internals and static assets.
    // The negative lookahead skips _next/* and common static extensions
    // while still matching dynamic routes.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API and tRPC routes — this is the line that catches
    // /api/checkout and unblocks currentUser() / auth() inside the handler.
    '/(api|trpc)(.*)',
  ],
};
