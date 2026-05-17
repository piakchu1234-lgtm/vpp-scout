/**
 * 顾问建议 (Consultant Advice) — rule-based generator.
 *
 * Composes a single-paragraph professional recommendation from the assessed
 * planning context. Output is intentionally deterministic, not LLM-backed:
 * the input space (5 zones × 3 overlays × 2 SSD outcomes × DPU flag × GFA
 * flag) is small enough that templated fragments give consistent, defensible
 * copy without round-trip latency or API costs.
 *
 * If/when an LLM is wired in, the function signature can stay the same —
 * only the body needs to switch from string composition to a fetch call.
 */

import type { OverlayCode, SSDStatus } from './feasibility';

export type AdviceInput = {
  zoneCode: string | null;
  overlays: OverlayCode[];
  /** Raw scheme codes returned by ArcGIS (e.g. "HO123", "PO2-3", "LSIO"). */
  overlayRaw?: string[];
  ssdStatus: SSDStatus;
  dpuIntent: boolean;
  gfaExceeded: boolean;
};

export type AdviceText = { en: string; zh: string };

type Fragment = { en: string; zh: string };

const OPENING: Record<SSDStatus, Fragment> = {
  'Permit Exempt': {
    en: 'Initial review indicates the site is favourable for the 2026 Small Second Dwelling permit-exempt pathway.',
    zh: '初步评估显示该地块符合 2026 小型第二住宅豁免规划许可路径。',
  },
  'Permit Required': {
    en: 'Initial review identifies planning constraints that disqualify the SSD permit-exempt pathway; a standard permit application is likely required.',
    zh: '初步评估识别出影响小型第二住宅豁免规划许可路径的限制因素,可能须按一般规划许可程序申请。',
  },
  'Refinement Required': {
    en: 'Initial review places the site in a commercial zone — the residential SSD pathway does not apply directly. Housing outcomes should be tested under Clause 34.01 (mixed-use / shop-top housing) instead.',
    zh: '初步评估显示该地块位于商业分区,住宅型小型第二住宅路径不直接适用。建议改用 Clause 34.01(混合用途 / 临街店铺上层住宅)路径评估住宅可行性。',
  },
};

const ZONE_HINT: Record<string, Fragment> = {
  GRZ: {
    en: 'The General Residential Zone is broadly compatible with secondary-dwelling outcomes.',
    zh: '一般住宅区与第二住宅类发展目标整体相符。',
  },
  NRZ: {
    en: 'The Neighbourhood Residential Zone applies tighter character controls — second-dwelling forms should respect existing streetscape rhythms.',
    zh: '近邻住宅区对邻里特征要求较严,第二住宅形态应顺应既有街景节奏。',
  },
  RGZ: {
    en: 'The Residential Growth Zone permits denser outcomes; the SSD pathway may be conservative relative to what the zone allows.',
    zh: '住宅成长区允许更高密度发展,SSD 路径相对该分区潜力或显保守。',
  },
  MUZ: {
    en: 'Mixed Use zoning permits residential outcomes but introduces interface considerations with adjoining commercial uses.',
    zh: '混合用途区允许居住用途,但需考虑与相邻商业用途的衔接问题。',
  },
  TZ: {
    en: 'Township Zone outcomes depend heavily on the local planning scheme schedule; verify with council before concept lock-in.',
    zh: '城镇区评估结果高度依赖地方规划方案附则,定案前应与议会核实。',
  },
};

const OVERLAY_HINT: Record<OverlayCode, Fragment> = {
  HO: {
    en: 'Heritage Overlay applies. To remain permit-exempt, the SSD design must not be visible from the street. Engage a heritage advisor if external visibility is unavoidable.',
    zh: '适用遗产覆盖区。若要保持豁免规划许可,小型第二住宅设计不得从街道可见。如无法避免外部可见性,请聘请遗产顾问。',
  },
  BMO: {
    en: 'Bushfire Management Overlay engages AS 3959-2018 construction standards — expect BAL assessment to materially affect cost.',
    zh: '山火管理覆盖区涉及 AS 3959-2018 建筑标准,BAL 评估可能显著影响建造成本。',
  },
  FO: {
    en: 'Inundation overlay applies; expect minimum floor-level controls and possible referral to the catchment management authority.',
    zh: 'LSIO 适用最低楼面标高控制,可能需提交至流域管理局进行咨询。',
  },
  SBO: {
    en: 'Special Building Overlay applies — stormwater flow path detected. A planning permit is required regardless of SSD status; expect floor-level and drainage conditions.',
    zh: '适用特殊建筑覆盖区(雨洪流径)。无论 SSD 状态如何,均需申请规划许可,并预期附带楼面标高与排水条件。',
  },
  PO: {
    en: 'Parking Overlay applies. Existing car parking for the main dwelling must be retained.',
    zh: '适用停车覆盖区。主住宅现有停车位须予保留。',
  },
  DDO: {
    en: 'Design and Development Overlay applies. Built form controls may affect height, setbacks, or materials.',
    zh: '适用设计与开发覆盖区。建筑形态控制可能影响高度、退界或材料选择。',
  },
  DCPO: {
    en: 'Development Contributions Plan Overlay applies. Financial contributions to local infrastructure may be required.',
    zh: '适用开发贡献计划覆盖区。可能需向地方基础设施缴纳开发贡献金。',
  },
};

const DPU_FRAGMENT: Fragment = {
  en: 'The DPU transitional pathway remains an option until 28 March 2027 and may permit a larger relocatable footprint than the SSD GFA cap.',
  zh: '受养人住宅单元 (DPU) 过渡性安排在 2027 年 3 月 28 日前继续适用,可允许较 SSD 上限更大的可拆迁式住宅。',
};

const GFA_FRAGMENT: Fragment = {
  en: 'Note that the proposed gross floor area exceeds the 60 m² SSD cap; a standard residential design pathway should be considered instead.',
  zh: '拟建总建筑面积已超出 60 m² SSD 上限,建议改用标准住宅设计路径。',
};

const CLOSING: Fragment = {
  en: 'Recommend a pre-application meeting with council to confirm assumptions before committing to design.',
  zh: '建议在确定方案前与议会进行预申请会议,以确认本评估所依据的假设。',
};

function poFragment(precincts: string[]): Fragment | null {
  if (precincts.length === 0) return null;
  const list = precincts.join(', ');
  return {
    en: `Parking Overlay precinct ${list} applies. Existing car parking for the main dwelling must be retained. Confirm car-parking rates and any cash-in-lieu trigger with the responsible authority before locking the site plan.`,
    zh: `适用停车覆盖区精确编码 ${list}。主住宅现有停车位须予保留。定案前应就停车配比及可能的代金支付条款与责任机关确认。`,
  };
}

function dcpoFragment(codes: string[]): Fragment | null {
  if (codes.length === 0) return null;
  const list = codes.join(', ');
  return {
    en: `Notice: Development Contributions Plan Overlay ${list} applies. Development on this site may trigger financial contributions to local infrastructure (open space, drainage, community facilities) — confirm the schedule rate with council before lodgement.`,
    zh: `注意:适用开发贡献计划覆盖区 ${list}。在该地块进行开发可能需向地方基础设施(公共开放空间、排水、社区设施等)缴纳开发贡献金,申请前请与议会确认相应附则费率。`,
  };
}

function heritageDetailFragment(codes: string[]): Fragment | null {
  if (codes.length === 0) return null;
  const list = codes.join(', ');
  return {
    en: `Heritage place identifier ${list} is recorded against the lot — engage a heritage advisor early; permits for demolition or external alteration are typically conditional.`,
    zh: `地块登记有遗产编号 ${list},宜尽早聘请遗产顾问;拆除或外立面改动的规划许可通常附带条件。`,
  };
}

function joinSentences(parts: string[]): string {
  return parts.filter(Boolean).join(' ');
}

export function generateConsultantAdvice(input: AdviceInput): AdviceText {
  const en: string[] = [OPENING[input.ssdStatus].en];
  const zh: string[] = [OPENING[input.ssdStatus].zh];

  if (input.zoneCode && ZONE_HINT[input.zoneCode]) {
    en.push(ZONE_HINT[input.zoneCode].en);
    zh.push(ZONE_HINT[input.zoneCode].zh);
  }

  for (const code of input.overlays) {
    const hint = OVERLAY_HINT[code];
    if (hint) {
      en.push(hint.en);
      zh.push(hint.zh);
    }
  }

  const raw = input.overlayRaw ?? [];
  const upper = raw.map((r) => r.toUpperCase());
  const poPrecincts = upper.filter((c) => c.startsWith('PO'));
  const hoCodes = upper.filter((c) => c.startsWith('HO'));
  const dcpoCodes = upper.filter((c) => c.startsWith('DCPO'));

  const po = poFragment(poPrecincts);
  if (po) {
    en.push(po.en);
    zh.push(po.zh);
  }

  const dcpo = dcpoFragment(dcpoCodes);
  if (dcpo) {
    en.push(dcpo.en);
    zh.push(dcpo.zh);
  }

  // Only surface the precinct-level heritage fragment when HO is in the
  // recognised overlay set — otherwise the generic OVERLAY_HINT.HO has
  // already fired (or the raw code wasn't classifiable).
  if (input.overlays.includes('HO')) {
    const hh = heritageDetailFragment(hoCodes);
    if (hh) {
      en.push(hh.en);
      zh.push(hh.zh);
    }
  }

  if (input.dpuIntent) {
    en.push(DPU_FRAGMENT.en);
    zh.push(DPU_FRAGMENT.zh);
  }

  if (input.gfaExceeded) {
    en.push(GFA_FRAGMENT.en);
    zh.push(GFA_FRAGMENT.zh);
  }

  en.push(CLOSING.en);
  zh.push(CLOSING.zh);

  return { en: joinSentences(en), zh: joinSentences(zh) };
}
