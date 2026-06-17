/**
 * Native Overlay Dictionary — 2026 VPP Planning Overlay Definitions
 *
 * Hardcoded overlay definitions eliminate expensive API calls for statutory text.
 * Sourced from Victoria Planning Provisions (VPP) 2026.
 *
 * @see https://planning-schemes.delwp.vic.gov.au/
 */

type OverlayDefinition = {
  code: string;
  title: string;
  purpose: string;
  bilingual?: {
    zh: {
      title: string;
      purpose: string;
    };
  };
};

/**
 * Critical restrictive overlays under the 2026 VPP reforms.
 * These overlays trigger planning permit requirements and may void fast-track exemptions.
 */
export const OVERLAY_DEFINITIONS: Record<string, OverlayDefinition> = {
  HO: {
    code: 'HO',
    title: 'Heritage Overlay',
    purpose:
      'Protects places of heritage significance. Requires planning permit for most external alterations, demolition, or subdivision. Design controls are strict — fast-track exemptions (including Small Second Dwellings) are generally void within Heritage Overlay areas. Refer to local heritage citations for site-specific requirements.',
    bilingual: {
      zh: {
        title: '遗产覆盖区 (Heritage Overlay)',
        purpose:
          '保护具有遗产意义的场所。大多数外部改建、拆除或细分均需规划许可。设计控制严格 — 遗产覆盖区内的快速通道豁免(包括小型第二住宅)通常无效。具体要求请参阅当地遗产引用文件。',
      },
    },
  },
  SBO: {
    code: 'SBO',
    title: 'Special Building Overlay',
    purpose:
      'Identifies flood-prone land where construction is subject to special building controls. Planning permit required for most buildings and works. Melbourne Water referral is mandatory — development must satisfy flood risk mitigation standards under Clause 44.05. Small Second Dwellings are NOT exempt on SBO-affected land.',
    bilingual: {
      zh: {
        title: '特殊建筑覆盖区 (Special Building Overlay)',
        purpose:
          '标识易受洪水影响的土地,建筑须受特殊建筑控制。大多数建筑和工程均需规划许可。墨尔本水务局转介为强制性要求 — 开发必须满足第44.05条款下的洪水风险缓解标准。小型第二住宅在SBO影响区域内不豁免。',
      },
    },
  },
  BMO: {
    code: 'BMO',
    title: 'Bushfire Management Overlay',
    purpose:
      'Applies bushfire protection and construction requirements to land in designated bushfire-prone areas. Buildings must satisfy Bushfire Attack Level (BAL) standards for materials, design, and defendable space. Planning permit may be required depending on BAL rating and dwelling type. Small Second Dwellings on BMO land are subject to additional BAL assessment.',
    bilingual: {
      zh: {
        title: '山火管理覆盖区 (Bushfire Management Overlay)',
        purpose:
          '对指定的山火易发区域土地适用山火防护和建筑要求。建筑物必须满足山火攻击等级(BAL)标准,包括材料、设计和可防御空间。根据BAL等级和住宅类型,可能需要规划许可。BMO土地上的小型第二住宅须接受额外的BAL评估。',
      },
    },
  },
  LSIO: {
    code: 'LSIO',
    title: 'Land Subject to Inundation Overlay',
    purpose:
      'Identifies land in flood-prone or stormwater inundation areas. Planning permit required for most buildings, works, and subdivisions. Development must address flood risk, drainage, and access during flood events. Referral to Melbourne Water or relevant floodplain management authority is mandatory. Small Second Dwellings are NOT exempt on LSIO-affected land.',
    bilingual: {
      zh: {
        title: '淹水覆盖区 (Land Subject to Inundation Overlay)',
        purpose:
          '标识易受洪水或雨水淹没的土地。大多数建筑、工程和细分均需规划许可。开发必须解决洪水风险、排水和洪水期间的通行问题。必须转介墨尔本水务局或相关洪泛平原管理机构。小型第二住宅在LSIO影响区域内不豁免。',
      },
    },
  },
  BFO: {
    code: 'BFO',
    title: 'Built Form Overlay',
    purpose:
      'Enforces specific building height, setback, site coverage, and design requirements to achieve desired neighbourhood character or urban design outcomes. Local schedule provisions specify mandatory maximum heights (e.g., 11m, 13.5m) and setback controls that override ResCode deemed-to-comply standards. Planning permit required for buildings exceeding specified limits. Small Second Dwellings must comply with BFO height and setback controls.',
    bilingual: {
      zh: {
        title: '建筑形态覆盖区 (Built Form Overlay)',
        purpose:
          '执行特定的建筑高度、退界、场地覆盖率和设计要求,以实现预期的邻里特色或城市设计成果。地方附表条款规定强制性最大高度(如11米、13.5米)和退界控制,这些控制优先于ResCode的当然合规标准。超过规定限制的建筑需要规划许可。小型第二住宅必须遵守BFO高度和退界控制。',
      },
    },
  },
  FO: {
    code: 'FO',
    title: 'Flood Overlay',
    purpose:
      'Identifies land subject to riverine or stormwater flooding. Planning permit required for most buildings and works. Development must address flood risk, floor levels, access during floods, and drainage. Referral to Melbourne Water or relevant floodplain management authority is mandatory. Small Second Dwellings are NOT exempt on FO-affected land.',
    bilingual: {
      zh: {
        title: '洪水覆盖区 (Flood Overlay)',
        purpose:
          '标识受河流或雨水洪水影响的土地。大多数建筑和工程均需规划许可。开发必须解决洪水风险、地面标高、洪水期间的通行和排水问题。必须转介墨尔本水务局或相关洪泛平原管理机构。小型第二住宅在FO影响区域内不豁免。',
      },
    },
  },
  DDO26: {
    code: 'DDO26',
    title: 'Design and Development Overlay - Schedule 26 (Swan Street Corridor)',
    purpose:
      'Swan Street Corridor Limitation: Structural elevations are capped to explicitly preserve look-through visibility corridors to the historic Dimmeys Clock Tower landmark from northern public pathways. Building height and setback controls protect heritage sightlines and neighbourhood character.',
    bilingual: {
      zh: {
        title: 'DDO26 - 天鹅街走廊设计限制',
        purpose:
          '天鹅街走廊限制：建筑高度受限,以明确保护从北侧公共通道到历史性Dimmeys钟楼地标的通视走廊。建筑高度和退界控制保护遗产视线和邻里特色。',
      },
    },
  },
  DDO19: {
    code: 'DDO19',
    title: 'Design and Development Overlay - Schedule 19 (Lygon Activity Corridor)',
    purpose:
      'Lygon Activity Corridor Constraint: High-elevation building envelopes must transition via a stepped, visually recessive profile to prevent overshadowing neighboring low-rise residential properties. Mandatory upper-level setbacks and articulation requirements apply.',
    bilingual: {
      zh: {
        title: 'DDO19 - Lygon活动走廊限制',
        purpose:
          'Lygon活动走廊限制：高层建筑外壳必须通过阶梯式、视觉上退缩的轮廓进行过渡,以防止遮挡相邻的低层住宅物业。适用强制性上层退界和立面要求。',
      },
    },
  },
  VPO1: {
    code: 'VPO1',
    title: 'Vegetation Protection Overlay - Schedule 1',
    purpose:
      'Canopy Protection Notice: Monash Garden City Character mandate activated. Total non-permeable hard paving is strictly limited to insulate root zones; removing native trees triggers immediate council enforcement audits. Planning permit required for vegetation removal or significant site works.',
    bilingual: {
      zh: {
        title: 'VPO1 - 植被保护覆盖区',
        purpose:
          '树冠保护通知：莫纳什花园城市特色强制令生效。严格限制非透水性硬质铺装总量以保护根区；移除本地树木将触发市政立即执法审查。移除植被或重大场地工程需规划许可。',
      },
    },
  },
  ESO5: {
    code: 'ESO5',
    title: 'Environmental Significance Overlay - Schedule 5',
    purpose:
      'Canopy Protection Notice: Monash Garden City Character mandate activated. Total non-permeable hard paving is strictly limited to insulate root zones; removing native trees triggers immediate council enforcement audits. Environmental values and significant vegetation must be protected.',
    bilingual: {
      zh: {
        title: 'ESO5 - 环境重要性覆盖区',
        purpose:
          '树冠保护通知：莫纳什花园城市特色强制令生效。严格限制非透水性硬质铺装总量以保护根区；移除本地树木将触发市政立即执法审查。必须保护环境价值和重要植被。',
      },
    },
  },
};

/**
 * Extract the base overlay code from an overlay string that may include a numeric schedule.
 * @example "HO123" → "HO", "bmo" → "BMO", "SBO" → "SBO"
 */
export function normalizeOverlayCode(raw: string): string {
  const upper = raw.trim().toUpperCase();
  // Match uppercase letters only at the start (stops at first digit or end)
  const match = upper.match(/^[A-Z]+/);
  return match ? match[0] : upper;
}

/**
 * Lookup overlay definition by code. Returns null if not found.
 * Handles both base codes (HO) and scheduled codes (HO123).
 */
export function getOverlayDefinition(overlayCode: string): OverlayDefinition | null {
  if (!overlayCode) return null;

  const upper = overlayCode.trim().toUpperCase();

  // Direct lookup (handles exact matches like HO, SBO)
  if (OVERLAY_DEFINITIONS[upper]) {
    return OVERLAY_DEFINITIONS[upper];
  }

  // Fallback: normalize to base code and lookup
  const base = normalizeOverlayCode(upper);
  return OVERLAY_DEFINITIONS[base] ?? null;
}

/**
 * Get overlay definition with language fallback.
 * Returns the bilingual definition if lang='zh', otherwise English.
 */
export function getOverlayDefinitionWithLanguage(
  overlayCode: string,
  lang: 'en' | 'zh' = 'en'
): { title: string; purpose: string } | null {
  const def = getOverlayDefinition(overlayCode);
  if (!def) return null;

  if (lang === 'zh' && def.bilingual?.zh) {
    return def.bilingual.zh;
  }

  return { title: def.title, purpose: def.purpose };
}
