/**
 * Bilingual Dictionary for SimplySite PDF Reports
 *
 * Comprehensive EN/ZH translation map for feasibility reports
 * Includes Victorian ResCode (Clause 54) and SSD 2026 compliance terminology
 */

export const dictionaries = {
  en: {
    // Report Headers
    title: "Feasibility & ROI Analysis",
    subtitle: "Victorian Property Development Assessment",

    // Financial Metrics
    metrics: "Financial Metrics",
    constructionCost: "Est. Construction Cost",
    marketValue: "Est. Completed Value",
    endValue: "End Value",
    netProfit: "Net Profit",
    roi: "Return on Investment",
    profitMargin: "Profit Margin",

    // Property Information
    propertyDetails: "Property Details",
    address: "Address",
    lotSize: "Lot Size",
    frontage: "Frontage",
    zoning: "Zoning",
    overlays: "Planning Overlays",
    council: "Council",

    // Statutory Compliance
    resCode: "Statutory Compliance (ResCode / Clause 54)",
    ssdCompliance: "Small Second Dwelling (SSD) Compliance",
    ssdRequirements: [
      "Footprint ≤ 60m² Gross Floor Area",
      "Private Open Space ≥ 8m²",
      "No Reticulated Gas Connection",
      "1m Wide Unobstructed Path to Frontage",
      "Minimum 1m Side Setback",
      "Minimum 4m Rear Setback",
      "Maximum 3.6m Wall Height",
      "Maximum 5m Building Height"
    ],

    // ResCode Standards (Clause 54)
    resCodeStandards: {
      sitePermeability: "Site Permeability (Min. 20%)",
      gardenArea: "Garden Area Requirements",
      privateopenSpace: "Private Open Space",
      solarAccess: "Solar Access to Neighbors",
      overshadowing: "Overshadowing Analysis",
      overlooking: "Overlooking & Privacy",
      northFacingWindows: "North-Facing Windows",
      energy: "Energy Efficiency",
      waterManagement: "Stormwater Management"
    },

    // Overlay Risk Assessment
    overlayRisk: "Planning Overlay Risk Assessment",
    highRiskOverlays: "High-Risk Overlays Detected",
    standardOverlays: "Standard Overlays",
    overlayTypes: {
      BMO: "Bushfire Management Overlay",
      LSIO: "Land Subject to Inundation Overlay",
      HO: "Heritage Overlay",
      SBO: "Significant Building Overlay",
      ESO: "Environmental Significance Overlay",
      VPO: "Vegetation Protection Overlay",
      DDO: "Design and Development Overlay",
      DPO: "Development Plan Overlay"
    },

    // Development Scenarios
    scenarios: "Development Scenarios",
    conservative: "Conservative Approach",
    aggressive: "Maximum Yield",
    dualOccupancy: "Dual Occupancy",
    townhouses: "Townhouse Development",
    ssd: "Small Second Dwelling",

    // Compliance Status
    compliant: "Compliant",
    nonCompliant: "Non-Compliant",
    requiresVariation: "Requires Planning Permit Variation",
    deemedToComply: "Deemed-to-Comply",

    // Report Sections
    executiveSummary: "Executive Summary",
    siteAnalysis: "Site Analysis",
    financialAnalysis: "Financial Analysis",
    regulatoryAnalysis: "Regulatory Analysis",
    recommendations: "Recommendations",
    riskFactors: "Risk Factors",
    nextSteps: "Next Steps",

    // Action Items
    generateReport: "Generate Report",
    downloadPDF: "Download PDF",
    saveProject: "Save Project",
    exportData: "Export Data",

    // Units
    sqm: "m²",
    meters: "m",
    aud: "AUD",
    percent: "%"
  },

  zh: {
    // Report Headers
    title: "可行性与投资回报分析",
    subtitle: "维多利亚州房产开发评估",

    // Financial Metrics
    metrics: "财务指标",
    constructionCost: "预计建筑成本",
    marketValue: "预计竣工价值",
    endValue: "终值",
    netProfit: "净利润",
    roi: "投资回报率",
    profitMargin: "利润率",

    // Property Information
    propertyDetails: "物业详情",
    address: "地址",
    lotSize: "地块面积",
    frontage: "临街面宽度",
    zoning: "分区",
    overlays: "规划覆盖层",
    council: "市政府",

    // Statutory Compliance
    resCode: "法定合规性 (ResCode / 第54条款)",
    ssdCompliance: "小型第二住宅 (SSD) 合规性",
    ssdRequirements: [
      "建筑总面积 ≤ 60平方米",
      "私人开放空间 ≥ 8平方米",
      "无网状天然气连接",
      "通往临街面的1米宽无障碍通道",
      "最小侧面退界1米",
      "最小后方退界4米",
      "最大墙体高度3.6米",
      "最大建筑高度5米"
    ],

    // ResCode Standards (Clause 54)
    resCodeStandards: {
      sitePermeability: "场地渗透性 (最低20%)",
      gardenArea: "花园面积要求",
      privateOpenSpace: "私人开放空间",
      solarAccess: "邻居太阳能采光",
      overshadowing: "遮阴分析",
      overlooking: "俯视与隐私",
      northFacingWindows: "朝北窗户",
      energy: "能源效率",
      waterManagement: "雨水管理"
    },

    // Overlay Risk Assessment
    overlayRisk: "规划覆盖层风险评估",
    highRiskOverlays: "检测到高风险覆盖层",
    standardOverlays: "标准覆盖层",
    overlayTypes: {
      BMO: "丛林火灾管理覆盖层",
      LSIO: "易受淹没土地覆盖层",
      HO: "遗产覆盖层",
      SBO: "重要建筑覆盖层",
      ESO: "环境重要性覆盖层",
      VPO: "植被保护覆盖层",
      DDO: "设计与开发覆盖层",
      DPO: "开发计划覆盖层"
    },

    // Development Scenarios
    scenarios: "开发方案",
    conservative: "保守方案",
    aggressive: "最大收益",
    dualOccupancy: "双重占用",
    townhouses: "联排别墅开发",
    ssd: "小型第二住宅",

    // Compliance Status
    compliant: "合规",
    nonCompliant: "不合规",
    requiresVariation: "需要规划许可变更",
    deemedToComply: "视为合规",

    // Report Sections
    executiveSummary: "执行摘要",
    siteAnalysis: "场地分析",
    financialAnalysis: "财务分析",
    regulatoryAnalysis: "监管分析",
    recommendations: "建议",
    riskFactors: "风险因素",
    nextSteps: "下一步",

    // Action Items
    generateReport: "生成报告",
    downloadPDF: "下载PDF",
    saveProject: "保存项目",
    exportData: "导出数据",

    // Units
    sqm: "平方米",
    meters: "米",
    aud: "澳元",
    percent: "%"
  }
} as const;

// Type-safe dictionary access
export type Language = 'en' | 'zh';
export type Dictionary = typeof dictionaries.en;

export function getDict(lang: Language): Dictionary {
  return dictionaries[lang] as Dictionary || dictionaries.en;
}
