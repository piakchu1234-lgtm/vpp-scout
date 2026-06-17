import { NextResponse } from 'next/server';
import { interpretOverlayCode } from '@/lib/processors/VppInterpreter';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { code, language } = body;

    if (typeof code !== 'string' || !code.trim()) {
      return NextResponse.json(
        { error: 'Invalid request. Expected: code (string)' },
        { status: 400 }
      );
    }

    if (language && language !== 'en' && language !== 'zh') {
      return NextResponse.json(
        { error: 'Invalid language. Expected: "en" or "zh"' },
        { status: 400 }
      );
    }

    const interpretation = await interpretOverlayCode(
      code.trim(),
      language || 'en'
    );

    return NextResponse.json(interpretation, { status: 200 });
  } catch (error) {
    console.error('[interpret-overlay] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error during overlay interpretation' },
      { status: 500 }
    );
  }
}
