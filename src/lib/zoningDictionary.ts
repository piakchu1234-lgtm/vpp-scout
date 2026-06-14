/**
 * Native Zoning Dictionary — 2026 VPP Zone Definitions
 *
 * Hardcoded zone definitions eliminate expensive API calls for statutory text.
 * Sourced from Victoria Planning Provisions (VPP) 2026.
 *
 * @see https://planning-schemes.delwp.vic.gov.au/
 */

type ZoneDefinition = {
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
 * Baseline residential and commercial zones under the 2026 VPP reforms.
 * Expand this dictionary as additional zones are encountered in production.
 */
export const ZONE_DEFINITIONS: Record<string, ZoneDefinition> = {
  GRZ: {
    code: 'GRZ',
    title: 'General Residential Zone',
    purpose:
      'To encourage a diversity of housing types and moderate housing growth in locations offering good access to services and transport. Typical height limit: 11 metres (3 storeys). Small Second Dwellings (SSD) are permit-exempt subject to lot size ≥ 300 m².',
    bilingual: {
      zh: {
        title: '一般住宅区 (General Residential Zone)',
        purpose:
          '鼓励在交通与服务设施便利的地点建设多样化住宅类型,实现适度住宅增长。典型高度限制:11米(3层)。小型第二住宅(SSD)在地块面积≥300平方米时豁免许可。',
      },
    },
  },
  NRZ: {
    code: 'NRZ',
    title: 'Neighbourhood Residential Zone',
    purpose:
      'To restrict housing growth in areas identified for urban preservation. Maximum building height: 9 metres (2 storeys). Designed to maintain neighbourhood character and scale. Small Second Dwellings (SSD) are permit-exempt subject to lot size ≥ 300 m².',
    bilingual: {
      zh: {
        title: '邻里住宅区 (Neighbourhood Residential Zone)',
        purpose:
          '限制已指定城市保护区的住宅增长。最大建筑高度:9米(2层)。旨在维持邻里特色和规模。小型第二住宅(SSD)在地块面积≥300平方米时豁免许可。',
      },
    },
  },
  RGZ: {
    code: 'RGZ',
    title: 'Residential Growth Zone',
    purpose:
      'To promote higher density housing (up to 4 storeys without a planning permit) near activity centres, major transport routes, and employment hubs. Supports urban consolidation and housing diversity. Maximum height: 13.5 metres (4 storeys) as-of-right; greater heights may be permitted subject to council approval.',
    bilingual: {
      zh: {
        title: '住宅增长区 (Residential Growth Zone)',
        purpose:
          '在活动中心、主要交通线路和就业枢纽附近促进高密度住宅建设(无需规划许可即可建至4层)。支持城市整合和住宅多样性。最大高度:13.5米(4层)为当然权利;更高楼层可经议会批准。',
      },
    },
  },
  C1Z: {
    code: 'C1Z',
    title: 'Commercial 1 Zone',
    purpose:
      'To create vibrant mixed-use commercial centres for retail, office, business, entertainment, and residential uses. No density cap applies — building height and form are controlled by Design and Development Overlays (DDO) or local schedule provisions. Encourages active street frontages and pedestrian-oriented design.',
    bilingual: {
      zh: {
        title: '商业1区 (Commercial 1 Zone)',
        purpose:
          '创建充满活力的混合用途商业中心,涵盖零售、办公、商业、娱乐和住宅用途。无密度上限 — 建筑高度和形态由设计与开发覆盖区(DDO)或地方附表条款控制。鼓励活跃的街道立面和行人导向设计。',
      },
    },
  },
  MUZ: {
    code: 'MUZ',
    title: 'Mixed Use Zone',
    purpose:
      'To provide for a range of residential, commercial, industrial and other uses which complement the mixed-use function of the locality. Supports urban renewal areas and major transport corridors. Building height and site coverage are determined by local schedules.',
    bilingual: {
      zh: {
        title: '混合用途区 (Mixed Use Zone)',
        purpose:
          '提供住宅、商业、工业及其他用途,以补充该地区的混合用途功能。支持城市更新区和主要交通走廊。建筑高度和用地覆盖率由地方附表确定。',
      },
    },
  },
  TRZ: {
    code: 'TRZ',
    title: 'Township Zone',
    purpose:
      'To implement the State Planning Policy Framework and the Local Planning Policy Framework for townships. Provides for residential, commercial, industrial and other uses which complement the township character. Small Second Dwellings (SSD) may be permit-exempt depending on local schedule provisions.',
    bilingual: {
      zh: {
        title: '乡镇区 (Township Zone)',
        purpose:
          '实施州规划政策框架和地方规划政策框架中的乡镇规划。提供住宅、商业、工业及其他用途,以补充乡镇特色。小型第二住宅(SSD)根据地方附表条款可能豁免许可。',
      },
    },
  },
  GRZ1: {
    code: 'GRZ1',
    title: 'General Residential Zone - Schedule 1',
    purpose:
      'To encourage a diversity of housing types and moderate housing growth in locations offering good access to services and transport. Schedule 1 may specify local variations to setbacks, height limits, or lot coverage. Refer to the relevant planning scheme schedule for site-specific requirements. Small Second Dwellings (SSD) are permit-exempt subject to lot size ≥ 300 m².',
    bilingual: {
      zh: {
        title: '一般住宅区 - 附表1 (General Residential Zone - Schedule 1)',
        purpose:
          '鼓励在交通与服务设施便利的地点建设多样化住宅类型,实现适度住宅增长。附表1可能规定退界、高度限制或地块覆盖率的地方变动。请参阅相关规划方案附表了解特定场地要求。小型第二住宅(SSD)在地块面积≥300平方米时豁免许可。',
      },
    },
  },
  NRZ1: {
    code: 'NRZ1',
    title: 'Neighbourhood Residential Zone - Schedule 1',
    purpose:
      'To restrict housing growth in areas identified for urban preservation. Maximum building height: 9 metres (2 storeys). Schedule 1 may specify local variations to setbacks, site coverage, or design requirements. Refer to the relevant planning scheme schedule for site-specific requirements. Small Second Dwellings (SSD) are permit-exempt subject to lot size ≥ 300 m².',
    bilingual: {
      zh: {
        title: '邻里住宅区 - 附表1 (Neighbourhood Residential Zone - Schedule 1)',
        purpose:
          '限制已指定城市保护区的住宅增长。最大建筑高度:9米(2层)。附表1可能规定退界、用地覆盖率或设计要求的地方变动。请参阅相关规划方案附表了解特定场地要求。小型第二住宅(SSD)在地块面积≥300平方米时豁免许可。',
      },
    },
  },
};

/**
 * Extract the base zone code from a scheduled zone code.
 * E.g., "GRZ1" → "GRZ", "NRZ2" → "NRZ"
 */
export function normalizeZoneCode(raw: string): string {
  const upper = raw.trim().toUpperCase();
  // Match base zone codes (2-4 uppercase letters)
  const match = upper.match(/^([A-Z]{2,4})\d*$/);
  return match ? match[1] : upper;
}

/**
 * Lookup zone definition by code. Returns null if not found.
 * Handles both base codes (GRZ) and scheduled codes (GRZ1).
 */
export function getZoneDefinition(zoneCode: string): ZoneDefinition | null {
  if (!zoneCode) return null;

  const upper = zoneCode.trim().toUpperCase();

  // Direct lookup (handles exact matches like GRZ1, NRZ1)
  if (ZONE_DEFINITIONS[upper]) {
    return ZONE_DEFINITIONS[upper];
  }

  // Fallback: normalize to base code and lookup
  const base = normalizeZoneCode(upper);
  return ZONE_DEFINITIONS[base] ?? null;
}

/**
 * Get zone definition with language fallback.
 * Returns the bilingual definition if lang='zh', otherwise English.
 */
export function getZoneDefinitionWithLanguage(
  zoneCode: string,
  lang: 'en' | 'zh' = 'en'
): { title: string; purpose: string } | null {
  const def = getZoneDefinition(zoneCode);
  if (!def) return null;

  if (lang === 'zh' && def.bilingual?.zh) {
    return def.bilingual.zh;
  }

  return { title: def.title, purpose: def.purpose };
}
