import { clerkMiddleware } from '@clerk/nextjs/server';

// All routes are public by default. clerkMiddleware() still needs to run
// on every request so server helpers like `auth()` and `currentUser()`
// (used in /api/checkout, /settings, etc.) can read the session — without
// it, Clerk throws "auth() was called but Clerk can't detect usage of
// clerkMiddleware()". Add `auth.protect()` calls inside this callback if
// specific routes need to be gated.
export default clerkMiddleware();

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
