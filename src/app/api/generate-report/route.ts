import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

type ReportRequest = {
  address: string;
  zoneCode: string | null;
  lotSize: number;
  frontage: number | null;
  overlays: string[];
  auditResult: {
    isFastTrackEligible: boolean;
    tier: string;
    noThirdPartyAppeals: boolean;
    developerSummary: string;
    maxDeemedDwellings: number;
  };
  financialProforma: {
    tdc: number;
    grv: number;
    profit: number;
    profitMarginPercent: number;
  };
  highestBestUse?: string;
  language?: 'en' | 'zh' | 'dual';
};

/**
 * Bilingual Property Report Generator
 *
 * Generates production-grade investment reports in English and/or Mandarin.
 * Combines:
 * - Fast-Track Audit Results (Clause 55/57 compliance)
 * - Financial Proforma (TDC, GRV, ROI)
 * - AI Highest & Best Use recommendation
 * - 3D Massing visualization description
 *
 * Target Audience: Developers, offshore investors, capital partners
 */
export async function POST(req: Request) {
  try {
    const body: ReportRequest = await req.json();

    const {
      address,
      zoneCode,
      lotSize,
      frontage,
      overlays = [],
      auditResult,
      financialProforma,
      highestBestUse,
      language = 'dual',
    } = body;

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Build the report generation prompt
    const reportPrompt = buildReportPrompt(body);

    console.log('[generate-report] Generating bilingual report for:', address);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: reportPrompt,
        },
      ],
    });

    const reportContent = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    console.log('[generate-report] Report generated successfully');

    return NextResponse.json({
      reportMarkdown: reportContent,
      address,
      generatedAt: new Date().toISOString(),
      language,
    });

  } catch (error: unknown) {
    console.error('[generate-report] Fatal error:', error);

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Report generation failed',
      reportMarkdown: null,
    }, { status: 500 });
  }
}

/**
 * Build comprehensive report generation prompt for Claude.
 */
function buildReportPrompt(data: ReportRequest): string {
  const {
    address,
    zoneCode,
    lotSize,
    frontage,
    overlays,
    auditResult,
    financialProforma,
    highestBestUse,
    language,
  } = data;

  const languageInstruction =
    language === 'en' ? 'Generate the report in ENGLISH ONLY.' :
    language === 'zh' ? 'Generate the report in MANDARIN CHINESE (简体中文) ONLY.' :
    'Generate the report in BOTH ENGLISH AND MANDARIN CHINESE (dual-language format).';

  return `You are a Senior Victorian Town Planner and Property Investment Analyst generating a production-grade development feasibility report.

PROPERTY DETAILS:
- Address: ${address}
- Zone: ${zoneCode || 'Unknown'}
- Lot Size: ${lotSize.toFixed(0)} m²
- Street Frontage: ${frontage ? frontage.toFixed(1) + 'm' : 'Unknown'}
- Overlays: ${overlays.length > 0 ? overlays.join(', ') : 'None'}

FAST-TRACK AUDIT RESULTS (2026 VPP Reforms):
- Fast-Track Eligible: ${auditResult.isFastTrackEligible ? 'YES ✅' : 'NO'}
- Approval Tier: ${auditResult.tier}
- No Third-Party Appeals: ${auditResult.noThirdPartyAppeals ? 'YES (Deemed-to-Comply)' : 'NO'}
- Maximum Dwellings: ${auditResult.maxDeemedDwellings}
- Summary: ${auditResult.developerSummary}

FINANCIAL PROFORMA (Developer Returns):
- Total Development Cost (TDC): $${(financialProforma.tdc / 1000000).toFixed(2)}M
- Gross Realization Value (GRV): $${(financialProforma.grv / 1000000).toFixed(2)}M
- Developer Profit: $${(financialProforma.profit / 1000000).toFixed(2)}M
- Profit Margin: ${financialProforma.profitMarginPercent.toFixed(1)}%

${highestBestUse ? `AI RECOMMENDATION:\n- Highest & Best Use: ${highestBestUse}\n` : ''}

REPORT REQUIREMENTS:
${languageInstruction}

FORMAT THE REPORT AS FOLLOWS:

${language === 'dual' ? `
# ${address}
# ${address}

## EXECUTIVE SUMMARY (English)
[1-2 paragraphs highlighting the fast-track opportunity, financial returns, and key reform benefits]

## 执行摘要 (中文)
[Same content translated to Mandarin Chinese]

---

## FAST-TRACK APPROVAL STATUS (English)
[Explain the 2026 VPP reforms, which tier this site qualifies for, and the "No Third-Party Appeals" benefit]

## 快速审批状态 (中文)
[Same content in Mandarin]

---

## FINANCIAL FEASIBILITY (English)
[Present TDC, GRV, Profit, and ROI with professional developer language]

## 财务可行性 (中文)
[Same content in Mandarin]

---

## PLANNING CONTEXT (English)
[Describe the zone, overlays, and how the 2026 reforms (Clause 55/57) apply to this site]

## 规划背景 (中文)
[Same content in Mandarin]

---

## INVESTMENT THESIS (English)
[Synthesize the fast-track approval, financial returns, and reform benefits into a compelling pitch for investors]

## 投资论点 (中文)
[Same content in Mandarin]

---

` : language === 'en' ? `
# ${address}

## EXECUTIVE SUMMARY
[1-2 paragraphs highlighting the fast-track opportunity, financial returns, and key reform benefits]

---

## FAST-TRACK APPROVAL STATUS
[Explain the 2026 VPP reforms, which tier this site qualifies for, and the "No Third-Party Appeals" benefit]

---

## FINANCIAL FEASIBILITY
[Present TDC, GRV, Profit, and ROI with professional developer language]

---

## PLANNING CONTEXT
[Describe the zone, overlays, and how the 2026 reforms (Clause 55/57) apply to this site]

---

## INVESTMENT THESIS
[Synthesize the fast-track approval, financial returns, and reform benefits into a compelling pitch for investors]

` : `
# ${address}

## 执行摘要
[1-2段落强调快速审批机会、财务回报和关键改革优势]

---

## 快速审批状态
[解释2026年VPP改革、该地块符合的审批级别以及"无第三方上诉"优势]

---

## 财务可行性
[以专业开发语言呈现TDC、GRV、利润和投资回报率]

---

## 规划背景
[描述区划、叠加层以及2026年改革（第55/57条款）如何适用于该地块]

---

## 投资论点
[将快速审批、财务回报和改革优势综合成针对投资者的有说服力的推介]

`}

TONE:
- Professional, confident, data-driven
- Emphasize the 2026 reform benefits (fast-track, no appeals)
- Use developer language: TDC, GRV, ROI, deemed-to-comply
- For Chinese sections: Use simplified Chinese (简体中文) with professional real estate terminology

Generate the complete report now.`;
}
