/**
 * VPP Interpreter — AI-powered Victorian Planning Provisions explainer
 *
 * Dynamically interprets overlay codes (HO, BFO, DCPO, etc.) using an LLM
 * acting as a Senior Victorian Statutory Planner, returning bilingual
 * explanations of statutory purpose and practical development impact.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.ANTHROPIC_API_KEY || '');

export type VPPInterpretation = {
  code: string;
  statutoryPurpose: string;
  practicalImpact: string;
  language: 'en' | 'zh';
};

const SYSTEM_PROMPT = `You are a Senior Victorian Statutory Planner with deep expertise in the Victoria Planning Provisions (VPP). Your role is to explain planning overlay codes in clear, professional language suitable for architects, developers, and property investors.

When given an overlay code, provide:
1. The statutory purpose under the VPP
2. The practical impact on development applications

Be precise, authoritative, and avoid speculation. If an overlay code is unfamiliar, state that clearly rather than inventing information.`;

const OVERLAY_DEFINITIONS: Record<string, { purpose: string; impact: string }> = {
  HO: {
    purpose: 'Heritage Overlay (HO) protects places of heritage significance under the VPP.',
    impact: 'Development permits required for external alterations, demolition, or new buildings. Mandatory referral to heritage advisor.',
  },
  BFO: {
    purpose: 'Built Form Overlay (BFO) manages building height, setbacks, and design to protect neighborhood character.',
    impact: 'Stricter controls on building envelopes, mandatory street setbacks, and maximum height limits that may reduce yield.',
  },
  BMO: {
    purpose: 'Bushfire Management Overlay (BMO) manages bushfire risk in designated areas.',
    impact: 'Requires bushfire attack level (BAL) assessment, defendable space, and ember protection measures. May restrict building location.',
  },
  LSIO: {
    purpose: 'Land Subject to Inundation Overlay (LSIO) identifies flood-prone land.',
    impact: 'Planning permits required for most buildings. Minimum floor levels and flood-resilient construction mandatory. May affect insurance and financing.',
  },
  FO: {
    purpose: 'Flood Overlay (FO) manages development in flood-prone areas.',
    impact: 'Requires flood assessment reports, elevated floor levels, and stormwater management plans. Development may be restricted in high-risk zones.',
  },
  SBO: {
    purpose: 'Special Building Overlay (SBO) applies to land in designated flood storage or floodway areas.',
    impact: 'Strict development restrictions. Most buildings require planning permits and Melbourne Water approval. High construction costs due to flood-proofing requirements.',
  },
  DDO: {
    purpose: 'Design and Development Overlay (DDO) implements specific design objectives for local areas.',
    impact: 'Site-specific design requirements vary by DDO schedule. Common requirements include building height limits, setback controls, and materials palette.',
  },
  PO: {
    purpose: 'Parking Overlay (PO) modifies standard car parking requirements.',
    impact: 'May increase or decrease required car spaces compared to zone defaults. Affects site layout and development feasibility.',
  },
  DCPO: {
    purpose: 'Development Contributions Plan Overlay (DCPO) requires financial contributions toward local infrastructure.',
    impact: 'Mandatory levy payable at building permit stage. Contribution calculated per dwelling or per square meter of commercial floor area.',
  },
  EAO: {
    purpose: 'Environmental Audit Overlay (EAO) applies to land with potential contamination from industrial or commercial use.',
    impact: 'Environmental audit certificate required before sensitive use (e.g., residential). Remediation costs can be substantial.',
  },
};

export async function interpretOverlayCode(
  code: string,
  language: 'en' | 'zh' = 'en'
): Promise<VPPInterpretation> {
  const upperCode = code.toUpperCase();
  const baseCode = upperCode.replace(/[0-9]+$/, ''); // Strip numeric suffix (e.g., HO123 → HO)

  // Check for known overlay in our dictionary
  const definition = OVERLAY_DEFINITIONS[baseCode];

  if (definition && language === 'en') {
    // Fast path: return cached English definition
    return {
      code,
      statutoryPurpose: definition.purpose,
      practicalImpact: definition.impact,
      language: 'en',
    };
  }

  // AI path: generate interpretation (for Chinese or unknown codes)
  const userPrompt = language === 'zh'
    ? `请用专业的简体中文解释维多利亚州规划覆盖区代码"${code}"。提供：
1. 维多利亚州规划条款（VPP）下的法定目的
2. 对开发申请的实际影响

回答格式为JSON：
{
  "statutoryPurpose": "法定目的的中文说明",
  "practicalImpact": "实际影响的中文说明"
}`
    : definition
    ? `Translate the following Victorian planning overlay explanation to professional Simplified Chinese:\n\nCode: ${code}\nStatutory Purpose: ${definition.purpose}\nPractical Impact: ${definition.impact}\n\nReturn JSON format:\n{\n  "statutoryPurpose": "Chinese translation of statutory purpose",\n  "practicalImpact": "Chinese translation of practical impact"\n}`
    : `Explain the Victorian planning overlay code "${code}" in professional English. Provide:\n1. Statutory purpose under the VPP\n2. Practical impact on development applications\n\nReturn JSON format:\n{\n  "statutoryPurpose": "Statutory purpose explanation",\n  "practicalImpact": "Practical impact explanation"\n}`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response (handles both raw JSON and markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      statutoryPurpose: string;
      practicalImpact: string;
    };

    return {
      code,
      statutoryPurpose: parsed.statutoryPurpose,
      practicalImpact: parsed.practicalImpact,
      language,
    };
  } catch (error) {
    console.error('[vppInterpreter] AI interpretation failed:', error);

    // Fallback to English definition if available
    if (definition) {
      return {
        code,
        statutoryPurpose: definition.purpose,
        practicalImpact: definition.impact,
        language: 'en',
      };
    }

    // Final fallback
    return {
      code,
      statutoryPurpose: language === 'zh'
        ? `${code} 覆盖区的法定解释暂时无法获取。`
        : `Statutory interpretation for ${code} is temporarily unavailable.`,
      practicalImpact: language === 'zh'
        ? '请咨询规划专业人士获取详细影响评估。'
        : 'Please consult a planning professional for detailed impact assessment.',
      language,
    };
  }
}
