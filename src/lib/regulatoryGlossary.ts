/**
 * Regulatory Glossary — Victorian Planning Provisions (VPP) definitions.
 *
 * Provides user-friendly explanations of planning zones and overlays with
 * links to official Planning Scheme documentation.
 */

export type GlossaryEntry = {
  code: string;
  name: { en: string; zh: string };
  definition: { en: string; zh: string };
  pdfUrl?: string;
  /** VPP clause number for the dynamic ordinance link (e.g. "34.01"). */
  clause?: string;
};

/**
 * Build the link to the live planning-scheme ordinance for a given LGA.
 * Format mirrors planning-schemes.app.planning.vic.gov.au's path scheme.
 */
export function getOrdinanceUrl(lga: string, clause: string): string {
  const lgaSlug = lga.trim().toLowerCase().replace(/\s+/g, '-');
  return `https://planning-schemes.app.planning.vic.gov.au/${lgaSlug}/ordinance/${clause}`;
}

export const REGULATORY_GLOSSARY: Record<string, GlossaryEntry> = {
  GRZ: {
    code: 'GRZ',
    name: {
      en: 'General Residential Zone',
      zh: '一般住宅区'
    },
    definition: {
      en: 'Primary residential area allowing a range of housing types including single dwellings, dual occupancies, and small-scale multi-unit developments. The 2026 Small Second Dwelling pathway applies in this zone.',
      zh: '主要住宅区域，允许多种住宅类型，包括独立住宅、双拼住宅和小规模多单元开发。2026 小型第二住宅路径适用于该分区。',
    },
    pdfUrl: 'https://planning-schemes.delwp.vic.gov.au/schemes/vpps/32_08.pdf',
  },
  GRZ1: {
    code: 'GRZ1',
    name: {
      en: 'General Residential Zone - Schedule 1',
      zh: '一般住宅区 - 附则 1'
    },
    definition: {
      en: 'General Residential Zone with local schedule variations. Schedule 1 may specify different lot size minimums, building heights, or design requirements. Check your council\'s planning scheme for schedule-specific provisions.',
      zh: '带有地方附则变化的一般住宅区。附则 1 可能规定不同的地块面积最低要求、建筑高度或设计要求。请查看您所在议会的规划方案以了解附则具体条款。',
    },
    pdfUrl: 'https://planning-schemes.delwp.vic.gov.au/schemes/vpps/32_08s01.pdf',
  },
  NRZ: {
    code: 'NRZ',
    name: {
      en: 'Neighbourhood Residential Zone',
      zh: '近邻住宅区'
    },
    definition: {
      en: 'Residential zone emphasizing neighbourhood character and limiting development scale. Stricter controls on building height, site coverage, and design to preserve existing streetscape rhythms.',
      zh: '强调邻里特征并限制开发规模的住宅区。对建筑高度、场地覆盖率和设计有更严格的控制，以保护现有街景节奏。',
    },
    pdfUrl: 'https://planning-schemes.delwp.vic.gov.au/schemes/vpps/32_09.pdf',
  },
  RGZ: {
    code: 'RGZ',
    name: {
      en: 'Residential Growth Zone',
      zh: '住宅成长区'
    },
    definition: {
      en: 'Zone encouraging higher-density residential development near activity centres a.',
      zh: '鼓励在活动中心和公共交通附近进行高密度住宅开发的分区。允许多单元开发和公寓楼，但须符合设计标准。',
    },
    pdfUrl: 'https://planning-schemes.delwp.vic.gov.au/schemes/vpps/32_07.pdf',
  },
  HO: {
    code: 'HO',
    name: {
      en: 'Heritage Overlay',
      zh: '遗产覆盖区'
    },
    definition: {
      en: 'Protects places of heritage significance. External alterations, demolition, and new buildings require a planning permit. The SSD must not be visible from the street to remain permit-exempt.',
      zh: '保护具有遗产意义的场所。外部改建、拆除和新建筑需要规划许可。小型第二住宅不得从街道可见才能保持豁免规划许可。',
    },
    pdfUrl: 'https://planning-schemes.delwp.vic.gov.au/schemes/vpps/43_01.pdf',
  },
  BMO: {
    code: 'BMO',
    name: {
      en: 'Bushfire Management Overlay',
      zh: '山火管理覆盖区'
    },
    definition: {
      en: 'High bushfire risk area requiring compliance with AS 3959-2018 construction standards. Expect Bushfire Attack Level (BAL) assessment and defendable space requirements, materially affecting construction cost.',
      zh: '高山火风险区域，需符合 AS 标准。预计需要山火攻击等级 (BAL) 评估和可防御空间要求，将显著影响建造成本。',
    },
    pdfUrl: 'https://planning-schemes.delwp.vic.gov.au/schemes/vpps/44_06.pdf',
  },
  FO: {
    code: 'FO',
    name: {
      en: 'Floodway Overlay',
      zh: '洪道覆盖区'
    },
    definition: {
      en: 'Land subject to inundation or floodway. Minimum floor level controls apply and referral to the catchment management authority may be required. Development restrictions protect flood conveyance.',
      zh: '受淹没或洪道影响的土地。适用最低楼面标高控制，可能需要提交至流域管理局。开发限制旨在保护洪水通道。',
    },
    pdfUrl: 'https://planning-schemes.delwp.vic.gov.au/schemes/vpps/44_03.pdf',
  },
  LSIO: {
    code: 'LSIO',
    name: {
      en: 'Land Subject to Inundation Overlay',
      zh: '淹水覆盖区'
    },
    definition: {
      en: 'Land prone to flooding outside the main floodway. Floor level and construction requirements apply to minimize flood damage. May require referral to floodplain management authority.',
      zh: '主洪道外易受洪水影响的土地。适用楼面标高和建筑要求以减少洪水损害。可能需要提交至洪泛区管理局。',
    },
    pdfUrl: 'https://planning-schemes.delwp.vic.gov.au/schemes/vpps/44_04.pdf',
  },
  PO: {
    code: 'PO',
    name: {
      en: 'Parking Overlay',
      zh: '停车覆盖区'
    },
    definition: {
      en: 'Special parking requirements apply. Existing car parking for the main dwelling must be retained. Confirm car parking rates and any cash-in-lieu provisions with the responsible authority before finalizing site plans.',
      zh: '适用特殊停车要求。主住宅现有停车位须予保留。定案前请就停车配比及可能的代金支付条款与责任机关确认。',
    },
    pdfUrl: 'https://planning-schemes.delwp.vic.gov.au/schemes/vpps/45_09.pdf',
  },
  DCPO: {
    code: 'DCPO',
    name: {
      en: 'Development Contributions Plan Overlay',
      zh: '开发贡献计划覆盖区'
    },
    definition: {
      en: 'Development may trigger financial contributions to local infrastructure including open space, drainage, and community facilities. Confirm the schedule rate with council before lodgement.',
      zh: '开发可能需向地方基础设施缴纳开发贡献金，包括公共开放空间、排水和社区设施。申请前请与议会确认附则费率。',
    },
    pdfUrl: 'https://planning-schemes.delwp.vic.gov.au/schemes/vpps/45_06.pdf',
  },
  C1Z: {
    code: 'C1Z',
    name: {
      en: 'Commercial 1 Zone',
      zh: '商业 1 区',
    },
    definition: {
      en: 'To implement the Municipal Planning Strategy and the Planning Policy Framework. To create vibrant mixed use commercial centres for retail, office, business, entertainment and community uses.',
      zh: 'To implement the Municipal Planning Strategy and the Planning Policy Framework. To create vibrant mixed use commercial centres for retail, office, business, entertainment and community uses.',
    },
    clause: '34.01',
    pdfUrl: 'https://planning-schemes.delwp.vic.gov.au/schemes/vpps/34_01.pdf',
  },
  HCTZ: {
    code: 'HCTZ',
    name: {
      en: 'Housing Choice and Transport Zone',
      zh: 'Housing Choice and Transport Zone',
    },
    definition: {
      en: 'To facilitate higher density development that provides for high amenity living close to core transit networks.',
      zh: 'To facilitate higher density development that provides for high amenity living close to core transit networks.',
    },
  },
};

export function getGlossaryEntry(code: string): GlossaryEntry | null {
  // Handle codes with numeric suffixes (e.g., GRZ1, PO2-3)
  const baseCode = code.replace(/\d+.*$/, '');

  if (REGULATORY_GLOSSARY[code]) {
    return REGULATORY_GLOSSARY[code];
  }

  if (REGULATORY_GLOSSARY[baseCode]) {
    return {
      ...REGULATORY_GLOSSARY[baseCode],
      code, // Return original code with suffix
    };
  }

  return null;
}
