/**
 * PROTECTED CRAWLER API ROUTE (EXAMPLE)
 *
 * Demonstrates how to protect API endpoints with NextAuth.
 * Rejects unauthorized requests with 401 Unauthorized.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // Require admin authentication
  const auth = await requireAdmin();
  if (auth.error) return auth.response;

  // Your protected API logic here
  try {
    const body = await request.json();
    const { suburb, state } = body;

    // TODO: Call your SuburbCrawler here
    // const crawler = new SuburbCrawler();
    // const result = await crawler.crawlSuburb(suburb, state);

    return NextResponse.json({
      success: true,
      message: `Crawler started for ${suburb}, ${state}`,
      user: auth.session?.user?.name || 'admin',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Require admin authentication
  const auth = await requireAdmin();
  if (auth.error) return auth.response;

  // Session guaranteed to exist here (requireAdmin validates it)
  const userName = auth.session?.user?.name || 'admin';

  return NextResponse.json({
    success: true,
    message: 'Crawler API is protected',
    user: userName,
  });
}
