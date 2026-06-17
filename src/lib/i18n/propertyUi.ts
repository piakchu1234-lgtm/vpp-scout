/**
 * BILINGUAL LOCALIZATION DICTIONARY
 *
 * Centralized translation system for Victorian Planning Provisions
 * Maps technical statutory codes to English and Mandarin equivalents
 *
 * Usage:
 *   const zoneName = PROPERTY_UI.zones[zoneCode][language]
 *   const overlayName = PROPERTY_UI.overlays[overlayCode][language]
 *
 * @module propertyUi
 */

export type Language = 'en' | 'zh';

export interface Translation {
  en: string;
  zh: string;
}

// ==================== ZONES ====================

export const ZONES: Record<string, Translation> = {
  // Residential Zones
  GRZ: {
    en: 'General Residential Zone',
    zh: '一般住宅区',
  },
  NRZ: {
    en: 'Neighbourhood Residential Zone',
    zh: '邻里住宅区',
  },
  RGZ: {
    en: 'Residential Growth Zone',
    zh: '住宅增长区',
  },
  LDRZ: {
    en: 'Low Density Residential Zone',
    zh: '低密度住宅区',
  },
  // Commercial Zones
  C1Z: {
    en: 'Commercial 1 Zone',
    zh: '商业一区',
  },
  C2Z: {
    en: 'Commercial 2 Zone',
    zh: '商业二区',
  },
  MUZ: {
    en: 'Mixed Use Zone',
    zh: '混合用途区',
  },
  CCZ: {
    en: 'Capital City Zone',
    zh: '首都城市区',
  },
  // Other Zones
  TZ: {
    en: 'Township Zone',
    zh: '乡镇区',
  },
  PZ: {
    en: 'Priority Zone',
    zh: '优先发展区',
  },
  ACZ: {
    en: 'Activity Centre Zone',
    zh: '活动中心区',
  },
};

// ==================== OVERLAYS ====================

export const OVERLAYS: Record<string, Translation> = {
  // Heritage & Character
  HO: {
    en: 'Heritage Overlay',
    zh: '遗产覆盖区',
  },
  NCO: {
    en: 'Neighbourhood Character Overlay',
    zh: '邻里特色覆盖区',
  },
  // Bushfire & Hazards
  BMO: {
    en: 'Bushfire Management Overlay',
    zh: '山火管理覆盖区',
  },
  LSIO: {
    en: 'Land Subject to Inundation Overlay',
    zh: '水淹风险区',
  },
  FO: {
    en: 'Floodway Overlay',
    zh: '洪泛区覆盖',
  },
  SBO: {
    en: 'Special Building Overlay',
    zh: '特殊建筑覆盖区',
  },
  // Built Form
  BFO: {
    en: 'Built Form Overlay',
    zh: '建筑形式覆盖区',
  },
  DDO: {
    en: 'Design and Development Overlay',
    zh: '设计与开发覆盖区',
  },
  // Environmental
  ESO: {
    en: 'Environmental Significance Overlay',
    zh: '环境保护覆盖区',
  },
  VPO: {
    en: 'Vegetation Protection Overlay',
    zh: '植被保护覆盖区',
  },
};

// ==================== COMPLIANCE STATUS ====================

export const COMPLIANCE: Record<string, Translation> = {
  fastTrackEligible: {
    en: 'Fast-Track Eligible',
    zh: '快速审批资格',
  },
  permitRequired: {
    en: 'Permit Required',
    zh: '需要许可证',
  },
  standardReview: {
    en: 'Standard Review',
    zh: '标准审核',
  },
  complexAssessment: {
    en: 'Complex Assessment',
    zh: '复杂评估',
  },
  deemedToComply: {
    en: 'Deemed to Comply',
    zh: '视为符合',
  },
};

// ==================== PROPERTY ATTRIBUTES ====================

export const ATTRIBUTES: Record<string, Translation> = {
  landSize: {
    en: 'Land Size',
    zh: '地块面积',
  },
  zoning: {
    en: 'Zoning',
    zh: '规划分区',
  },
  council: {
    en: 'Council',
    zh: '地方议会',
  },
  schoolCatchments: {
    en: 'School Catchments',
    zh: '学区范围',
  },
  bedrooms: {
    en: 'Bedrooms',
    zh: '卧室',
  },
  bathrooms: {
    en: 'Bathrooms',
    zh: '浴室',
  },
  carspaces: {
    en: 'Car Spaces',
    zh: '车位',
  },
  lastSold: {
    en: 'Last Sold',
    zh: '最近售价',
  },
  yearBuilt: {
    en: 'Year Built',
    zh: '建造年份',
  },
  frontage: {
    en: 'Frontage',
    zh: '临街面宽',
  },
  orientation: {
    en: 'Orientation',
    zh: '朝向',
  },
};

// ==================== CHART LABELS ====================

export const CHARTS: Record<string, Translation> = {
  marketPerformance: {
    en: 'Market Performance',
    zh: '市场表现',
  },
  siteParameters: {
    en: 'Site Parameters',
    zh: '场地参数',
  },
  developmentAssessment: {
    en: 'Development Assessment',
    zh: '开发评估',
  },
  height: {
    en: 'Height',
    zh: '高度',
  },
  setbacks: {
    en: 'Setbacks',
    zh: '退界距离',
  },
  coverage: {
    en: 'Coverage',
    zh: '覆盖率',
  },
  garden: {
    en: 'Garden',
    zh: '绿化面积',
  },
  parking: {
    en: 'Parking',
    zh: '停车位',
  },
};

// ==================== UI LABELS ====================

export const UI: Record<string, Translation> = {
  exportPdf: {
    en: 'Export PDF Report',
    zh: '导出PDF报告',
  },
  generatingReport: {
    en: 'Generating Report...',
    zh: '正在生成报告...',
  },
  loading: {
    en: 'Loading...',
    zh: '加载中...',
  },
  noData: {
    en: 'No data available',
    zh: '暂无数据',
  },
  dataPending: {
    en: 'Data pending',
    zh: '数据待定',
  },
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get translated zone name with fallback
 */
export function getZoneName(zoneCode: string | null, language: Language): string {
  if (!zoneCode) return language === 'en' ? 'Unknown Zone' : '未知分区';

  const baseZone = zoneCode.toUpperCase().match(/^[A-Z]+/)?.[0];
  if (baseZone && ZONES[baseZone]) {
    return ZONES[baseZone][language];
  }

  return zoneCode; // Fallback to code
}

/**
 * Get translated overlay name with fallback
 */
export function getOverlayName(overlayCode: string, language: Language): string {
  const prefix = overlayCode.toUpperCase().match(/^[A-Z]+/)?.[0];
  if (prefix && OVERLAYS[prefix]) {
    return `${OVERLAYS[prefix][language]} (${overlayCode})`;
  }

  return overlayCode; // Fallback to code
}

/**
 * Get translated attribute label
 */
export function getAttributeLabel(key: string, language: Language): string {
  return ATTRIBUTES[key]?.[language] || key;
}

/**
 * Get translated chart label
 */
export function getChartLabel(key: string, language: Language): string {
  return CHARTS[key]?.[language] || key;
}

/**
 * Complete property UI dictionary
 */
export const PROPERTY_UI = {
  zones: ZONES,
  overlays: OVERLAYS,
  compliance: COMPLIANCE,
  attributes: ATTRIBUTES,
  charts: CHARTS,
  ui: UI,
  getZoneName,
  getOverlayName,
  getAttributeLabel,
  getChartLabel,
};
