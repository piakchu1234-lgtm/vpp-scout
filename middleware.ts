/**
 * MIDDLEWARE - ROUTE PROTECTION
 *
 * Protects admin routes and API endpoints from unauthorized access.
 * Redirects unauthenticated users to login page.
 */

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');
    const isAdminAPI = req.nextUrl.pathname.startsWith('/api/admin');

    // Check if user has admin role
    if ((isAdminRoute || isAdminAPI) && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to login page without authentication
        if (req.nextUrl.pathname === '/admin/login') {
          return true;
        }

        // Require authentication for all /admin/* routes
        if (req.nextUrl.pathname.startsWith('/admin')) {
          return !!token;
        }

        // Require authentication for admin API routes
        if (req.nextUrl.pathname.startsWith('/api/admin')) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
