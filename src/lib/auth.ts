/**
 * API AUTHENTICATION HELPERS
 *
 * Utilities for protecting API routes with NextAuth session validation.
 * Use these to reject unauthorized API requests with 401 Unauthorized.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

/**
 * Get current session (server-side)
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Require authentication for API route
 * Returns session if authenticated, throws 401 if not
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session) {
    return {
      error: true,
      response: NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      ),
    };
  }

  return {
    error: false,
    session,
  };
}

/**
 * Require admin role for API route
 * Returns session if admin, throws 403 if not admin, 401 if not authenticated
 */
export async function requireAdmin() {
  const session = await getSession();

  if (!session) {
    return {
      error: true,
      response: NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      ),
    };
  }

  if ((session.user as any)?.role !== 'admin') {
    return {
      error: true,
      response: NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      ),
    };
  }

  return {
    error: false,
    session,
  };
}

/**
 * Middleware wrapper for protected API routes
 *
 * Usage:
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const auth = await requireAdmin();
 *   if (auth.error) return auth.response;
 *
 *   // Your protected API logic here
 * }
 * ```
 */
