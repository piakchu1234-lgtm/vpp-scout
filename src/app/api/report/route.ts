import { NextResponse } from 'next/server';

import type {
  FeasibilityReport,
  ReportRequest,
  ReportResponse,
  ReportSiteMetrics,
} from '@/lib/report';

export const runtime = 'edge';

const ANTHROPIC_DEFAULT_BASE_URL = 'https://api.anthropic.com';
const ANTHROPIC_MODEL = 'claude-opus-4-5-20250929';
const ANTHROPIC_VERSION = '2023-06-01';

function resolveAnthropicUrl(): string {
  const base = process.env.ANTHROPIC_BASE_URL?.trim() || ANTHROPIC_DEFAULT_BASE_URL;
  const trimmed = base.replace(/\/+$/, '');
  return `${trimmed}/v1/messages`;
}

const SECTION_KEYS = [
  'verdict',
  'summary',
  'developmentCapacity',
  'zoningAnalysis',
  'rescodeConsiderations',
  'risks',
  'recommendation',
] as const;

function buildSystemPrompt(): string {
  return [
    'You are a Senior Victorian Architect practising in Victoria, Australia.',
    'You are fluent in the Victoria Planning Provisions (VPP), ResCode (Clauses 54 and 55),',
    'the 2026 Small Second Dwelling (SSD) reforms, and the National Construction Code 2026 (NCC 2026).',
    'You give precise, cautious advice that a client could act on.',
    '',
    'OUTPUT FORMAT — you MUST respond with a single JSON object and nothing else. No prose, no markdown fence.',
    'The JSON object MUST conform to this schema:',
    '{',
    '  "verdict": { "en": string, "zh": string },',
    '  "summary": { "en": string, "zh": string },',
    '  "developmentCapacity": { "en": string, "zh": string },',
    '  "zoningAnalysis": { "en": string, "zh": string },',
    '  "rescodeConsiderations": { "en": string, "zh": string },',
    '  "risks": { "en": string, "zh": string },',
    '  "recommendation": { "en": string, "zh": string }',
    '}',
    '',
    'STATUTORY ENGLISH RULE — even inside Chinese (zh) strings, the following terms MUST remain in English,',
    'unchanged and untranslated, to preserve legal accuracy:',
    '- ResCode (do NOT translate as 住宅设计准则)',
    '- Overlay codes: HO, BMO, FO, LSIO, VPO, SBO, DDO, PO, DCPO',
    '- Zone codes: GRZ, NRZ, RGZ, MUZ, TZ, C1Z, C2Z, and any "Housing Choice and Transport Zone" or similar named zone',
    '- SSD, NCC 2026, VPP, SPI, Clause references (e.g. Clause 54.03-5, Clause 55.04-1, Clause 52.20)',
    '- VC282 and other amendment numbers',
    '',
    'BILINGUAL STYLE — the zh strings use the Victorian Government\'s published Mandarin renderings for plain UI terms,',
    'e.g. "规划覆盖区" for overlay, "退界" for setback, "分区" for zone. Do not invent translations.',
    '',
    'TONE — confident, specific, and clause-cited where you can. Distinguish as-of-right outcomes from',
    'outcomes requiring a planning permit. If data is missing, say so plainly rather than fabricating values.',
    '',
    'LENGTH — each section should be 1-3 sentences. The verdict field is a short phrase (e.g. "Permit Required" / "需申请规划许可").',
  ].join('\n');
}

function buildUserPrompt(m: ReportSiteMetrics): string {
  const lines: string[] = [];
  lines.push(`Address: ${m.address}`);
  lines.push(`Coordinates: ${m.lat.toFixed(5)}, ${m.lon.toFixed(5)}`);
  if (m.spi) lines.push(`SPI: ${m.spi}`);
  if (m.council) lines.push(`Council: ${m.council}`);
  lines.push('');
  lines.push('PLANNING CONTEXT');
  lines.push(`- Zone code: ${m.zoneCode ?? 'unknown'}`);
  if (m.zoneDescription) lines.push(`- Zone description: ${m.zoneDescription}`);
  lines.push(
    `- Overlay categories: ${m.overlayCodes.length ? m.overlayCodes.join(', ') : 'none'}`,
  );
  if (m.overlayRaw.length) {
    lines.push(`- Raw scheme codes: ${m.overlayRaw.join(', ')}`);
  }
  lines.push('');
  lines.push('SITE METRICS');
  lines.push(
    `- Lot area: ${m.lotAreaM2 != null ? `${m.lotAreaM2} m²` : 'unknown'}`,
  );
  lines.push(
    `- Frontage (shortest cadastral edge): ${m.frontageM != null ? `${m.frontageM.toFixed(1)} m` : 'unknown'}`,
  );
  lines.push(
    `- Site coverage: ${m.siteCoveragePct != null ? `${m.siteCoveragePct.toFixed(1)}%` : 'unknown'}`,
  );
  lines.push(
    `- Front setback (longest edge → nearest building corner): ${m.setbackFrontM != null ? `${m.setbackFrontM.toFixed(1)} m` : 'vacant or unknown'}`,
  );
  lines.push(
    `- Side setback (minimum): ${m.setbackSideMinM != null ? `${m.setbackSideMinM.toFixed(1)} m` : 'vacant or unknown'}`,
  );
  lines.push(
    `- Rear setback: ${m.setbackRearM != null ? `${m.setbackRearM.toFixed(1)} m` : 'vacant or unknown'}`,
  );
  lines.push('');
  lines.push(
    'Produce a bilingual feasibility brief for this lot. Evaluate development capacity against ResCode Clauses 54/55, the 2026 SSD reforms, and NCC 2026 where relevant. Note any overlay-driven permit triggers. Return the JSON object only.',
  );
  return lines.join('\n');
}

function looksLikeBilingual(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).en === 'string' &&
    typeof (value as Record<string, unknown>).zh === 'string'
  );
}

function parseReport(raw: string): FeasibilityReport | null {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;
  for (const key of SECTION_KEYS) {
    if (!looksLikeBilingual(obj[key])) return null;
  }
  return obj as unknown as FeasibilityReport;
}

function isMetrics(value: unknown): value is ReportSiteMetrics {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.address === 'string' &&
    typeof m.lat === 'number' &&
    typeof m.lon === 'number' &&
    Array.isArray(m.overlayCodes) &&
    Array.isArray(m.overlayRaw)
  );
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json<ReportResponse>(
      {
        ok: false,
        error:
          'ANTHROPIC_API_KEY is not configured on the server. Set it in your environment and redeploy.',
      },
      { status: 503 },
    );
  }

  let body: ReportRequest;
  try {
    body = (await request.json()) as ReportRequest;
  } catch {
    return NextResponse.json<ReportResponse>(
      { ok: false, error: 'Invalid JSON body.' },
      { status: 400 },
    );
  }

  if (!body || !isMetrics(body.metrics)) {
    return NextResponse.json<ReportResponse>(
      { ok: false, error: 'Missing or malformed metrics payload.' },
      { status: 400 },
    );
  }

  const upstream = await fetch(resolveAnthropicUrl(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      system: buildSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(body.metrics),
        },
      ],
    }),
  });

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    return NextResponse.json<ReportResponse>(
      {
        ok: false,
        error: `Upstream LLM error (${upstream.status}): ${detail.slice(0, 400)}`,
      },
      { status: 502 },
    );
  }

  let upstreamJson: unknown;
  try {
    upstreamJson = await upstream.json();
  } catch {
    return NextResponse.json<ReportResponse>(
      { ok: false, error: 'Upstream returned a non-JSON response.' },
      { status: 502 },
    );
  }

  const content = (upstreamJson as { content?: Array<{ type?: string; text?: string }> })
    .content;
  const firstText = Array.isArray(content)
    ? content.find((c) => c?.type === 'text')?.text ?? ''
    : '';

  const report = parseReport(firstText);
  if (!report) {
    return NextResponse.json<ReportResponse>(
      {
        ok: false,
        error:
          'LLM response did not conform to the expected bilingual JSON schema.',
      },
      { status: 502 },
    );
  }

  return NextResponse.json<ReportResponse>({ ok: true, report });
}
