import { NextResponse } from 'next/server';
import { calculateYield, type YieldData } from '@/lib/yieldEngine';
import type { SpatialMetrics } from '@/lib/spatialAnalysis';

import type {
  FeasibilityReport,
  ReportRequest,
  ReportResponse,
  ReportSiteMetrics,
} from '@/lib/report';

export const runtime = 'edge';

const ANTHROPIC_DEFAULT_BASE_URL = 'https://api.anthropic.com';
// AGENT 3 MODEL: Locked to Sonnet for cost efficiency.
// Opus is overkill when Agent 1 & 2 provide deterministic math.
const ANTHROPIC_MODEL = 'claude-sonnet-4.6';
const ANTHROPIC_VERSION = '2023-06-01';

function resolveAnthropicUrl(): string {
  const base = process.env.ANTHROPIC_BASE_URL?.trim() || ANTHROPIC_DEFAULT_BASE_URL;
  const trimmed = base.replace(/\/+$/, '');
  return `${trimmed}/v1/messages`;
}

// AGENT 3: The Commercial Synthesizer (Bilingual Director)
// Mission: Take cold deterministic math from Agent 1 (yieldEngine) and
// Agent 2 (spatialAnalysis), then synthesize premium bilingual executive
// summaries for the PDF report.

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
    'You are the Lead Architect and Client Director for SimplySite, a Victorian property feasibility platform.',
    'You are fluent in the Victoria Planning Provisions (VPP), ResCode, and the 2026 SSD reforms.',
    '',
    'CRITICAL CONSTRAINT: You have been provided with PRE-CALCULATED, mathematically verified',
    'statutory yields from our deterministic engineering backend (Agent 1: Yield Engine, Agent 2: Spatial Analysis).',
    'DO NOT recalculate site coverage, permeability, SSD eligibility, or frontage measurements.',
    'DO NOT second-guess the math. Your role is synthesis and translation, not calculation.',
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
    '- Zone codes: GRZ, NRZ, RGZ, MUZ, TZ, C1Z, C2Z',
    '- SSD, NCC 2026, VPP, SPI',
    '- Clause references (e.g. Clause 54.03-5, Clause 55.04-1)',
    '',
    'BILINGUAL STYLE — the zh strings use the Victorian Government\'s published Mandarin renderings:',
    '规划覆盖区 (overlay), 退界 (setback), 分区 (zone), 地块面积 (lot size).',
    'Do not invent translations. Refer to CLAUDE.md canonical glossary.',
    '',
    'TONE — confident, specific, clause-cited. Distinguish as-of-right outcomes from permit-required pathways.',
    'If the backend math flags missing data, acknowledge it plainly rather than fabricating values.',
    '',
    'LENGTH — each section 1-3 sentences. Verdict is a short phrase (e.g. "Permit Required" / "需申请规划许可").',
  ].join('\n');
}

function buildUserPrompt(
  m: ReportSiteMetrics,
  yieldData: YieldData,
  spatialMetrics: SpatialMetrics | null
): string {
  const lines: string[] = [];
  lines.push(`Address: ${m.address}`);
  if (m.spi) lines.push(`SPI: ${m.spi}`);
  if (m.council) lines.push(`Council: ${m.council}`);
  lines.push('');

  lines.push('=== PLANNING CONTEXT ===');
  lines.push(`Zone: ${m.zoneCode ?? 'unknown'}${m.zoneDescription ? ` - ${m.zoneDescription}` : ''}`);
  lines.push(`Overlays: ${m.overlayCodes.length ? m.overlayCodes.join(', ') : 'none'}`);
  if (m.overlayRaw.length) {
    lines.push(`Raw scheme codes: ${m.overlayRaw.join(', ')}`);
  }
  lines.push('');

  lines.push('=== AGENT 1 OUTPUT: VERIFIED STATUTORY YIELD (DO NOT RECALCULATE) ===');
  lines.push(JSON.stringify(yieldData, null, 2));
  lines.push('');

  if (spatialMetrics) {
    lines.push('=== AGENT 2 OUTPUT: SPATIAL ANALYSIS (DO NOT RECALCULATE) ===');
    lines.push(JSON.stringify(spatialMetrics, null, 2));
    lines.push('');
  }

  lines.push('=== ADDITIONAL SITE CONTEXT (FOR NARRATIVE ONLY) ===');
  if (m.siteCoveragePct != null) {
    lines.push(`Existing site coverage: ${m.siteCoveragePct.toFixed(1)}%`);
  }
  if (m.setbackFrontM != null) {
    lines.push(`Front setback: ${m.setbackFrontM.toFixed(1)} m`);
  }
  if (m.setbackSideMinM != null) {
    lines.push(`Side setback (min): ${m.setbackSideMinM.toFixed(1)} m`);
  }
  if (m.setbackRearM != null) {
    lines.push(`Rear setback: ${m.setbackRearM.toFixed(1)} m`);
  }
  lines.push('');

  lines.push('=== YOUR TASK ===');
  lines.push('Synthesize the verified mathematical outputs above into a premium bilingual feasibility brief.');
  lines.push('Use the Agent 1 yield data and Agent 2 spatial metrics as ground truth.');
  lines.push('Cite relevant ResCode clauses (54/55), SSD reforms, and overlay triggers.');
  lines.push('Return ONLY the JSON object. No markdown fences.');

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
        error: 'ANTHROPIC_API_KEY is not configured. Set it in .env.local and redeploy.',
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

  // === HYBRID ARCHITECTURE: STEP 1 - AGENT 1 (Deterministic Yield Engine) ===
  // Run statutory calculations entirely outside the LLM to eliminate hallucination risk.
  const yieldData = calculateYield(
    body.metrics.lotAreaM2 ?? 0,
    body.metrics.zoneCode ?? ''
  );

  // === HYBRID ARCHITECTURE: STEP 2 - AGENT 2 (Spatial Analysis) ===
  // If parcel polygon is available, calculate exact spatial metrics.
  const spatialMetrics: SpatialMetrics | null = null;
  // Note: In production, you would pass the polygon from the frontend via body.metrics.polygon
  // For now, this is a placeholder for when polygon data is integrated into ReportRequest.

  // === HYBRID ARCHITECTURE: STEP 3 - AGENT 3 (Commercial Synthesizer) ===
  // Call Sonnet (not Opus - cost optimization) to synthesize bilingual narrative
  // from the verified mathematical outputs above.
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
          content: buildUserPrompt(body.metrics, yieldData, spatialMetrics),
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
