'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MapPin, FolderPlus, Trash2, Check } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { Logo } from '@/components/Logo';
import { MapPreview, type MapPreviewHandle, type MapTool } from '@/components/MapPreview';
import { PrintReport, type PrintReportData } from '@/components/PrintReport';
import { PricingBanner } from '@/components/PricingBanner';
import { RiskMatrix } from '@/components/RiskMatrix';
import { generateConsultantAdvice } from '@/lib/advice';
import {
  checkSSDEligibility,
  getGardenRequirement,
  ORIENTATION_LABELS,
  OVERLAYS,
  SSD_MAX_GFA_M2,
  SSD_MIN_LOT_SIZE_M2,
  STATUS_LABELS,
  type Orientation,
  type OverlayCode,
  type SiteConditions,
} from '@/lib/feasibility';
import { computeBuildingEnvelope } from '@/lib/buildingEnvelope';
import { evaluateResCode, deriveVerdict } from '@/lib/resCode';
import { computeProposedFootprint, computeSplitLine } from '@/lib/spatial';
import {
  categorizeProperty,
  PROPERTY_CATEGORY_LABEL,
} from '@/lib/propertyCategory';
import {
  geocodeAddress,
  reverseGeocodeNearest,
  type GeocodeSuggestion,
} from '@/lib/geocoding';
import {
  type ParcelPolygon,
  type VicPlanData,
} from '@/lib/vicPlanApi';
import {
  type DomainPropertyData,
} from '@/lib/domainApi';
import {
  calculateFrontage,
  detectOrientation,
  checkFrontageRequirement,
} from '@/lib/propertyGeometry';
import {
  type EasementData,
} from '@/lib/easementApi';
import { findLgaByPostcode, type LgaContact } from '@/lib/lgaContacts';
import {
  fetchPropertyData,
  type PriceField,
  type AreaField,
  type PriceSource,
  type AreaSource,
  type CouncilSource,
} from '@/lib/propertyData';
import { tpzRadiusM } from '@/lib/tpz';
import { computeScenario } from '@/lib/feasibilityScenario';
import { fetchNearbyPlaces, placeTypeLabel, type Place } from '@/lib/placesService';
import { fetchCensusForPostcode, type CensusSnapshot } from '@/lib/censusApi';
import { getStreetViewUrl } from '@/lib/streetView';
import {
  extractPostcode,
  fetchBurglaryStats,
  type BurglaryStats,
} from '@/lib/lifestyleApi';
import {
  BETA_FREE,
  BETA_BADGE_LABEL,
  BETA_REPORT_CTA,
} from '@/lib/betaConfig';
import { computeYieldScenarios } from '@/lib/yieldCalculator';
import {
  computeProfitMetrics,
  defaultSalePriceForLga,
  PROFIT_DEFAULTS,
} from '@/lib/profitCalculator';
import {
  getSavedProperties,
  saveProperty,
  deleteProperty,
  type SavedProperty,
} from '@/lib/portfolioStorage';

type Lang = 'en' | 'zh';
type DataSource = 'mock' | 'live';
type TabId = 'overview' | 'ssd' | 'profit' | 'reports';

const ALL_OVERLAY_CODES = Object.keys(OVERLAYS) as OverlayCode[];

const T = {
  brand: { en: 'SimplySite', zh: 'SimplySite' },
  eyebrow: {
    en: 'Victoria Property Insights',
    zh: '维多利亚州物业洞察',
  },
  title: {
    en: 'See What You Can Build',
    zh: '看您能建什么',
  },
  intro: {
    en: '',
    zh: '',
  },
  sectionSearch: { en: 'Address', zh: '地址搜索' },
  tabOverview: { en: 'Property Details', zh: '物业详情' },
  tabSsd: { en: 'Feasibility', zh: '可行性' },
  tabProfit: { en: 'Profit & ROI', zh: '利润与回报' },
  tabReports: { en: 'Reports', zh: '报告' },
  sectionReports: { en: 'Reports & Actions', zh: '报告与行动' },
  propertyDetailsLabel: { en: 'Property Details', zh: '物业详情' },
  yearBuiltLabel: { en: 'Year Built', zh: '建造年份' },
  wallMaterialLabel: { en: 'Wall Material', zh: '外墙材料' },
  roofMaterialLabel: { en: 'Roof Material', zh: '屋顶材料' },
  bedroomsLabel: { en: 'Bedrooms', zh: '卧室' },
  bathroomsLabel: { en: 'Bathrooms', zh: '浴室' },
  carSpacesLabel: { en: 'Car Spaces', zh: '车位' },
  floorAreaLabel: { en: 'Floor Area', zh: '建筑面积' },
  educationTabSchools: { en: 'Schools', zh: '学校' },
  educationTabChildcare: { en: 'Childcare', zh: '幼托机构' },
  childcareNone: {
    en: 'No childcare facilities returned by OpenStreetMap within 2 km.',
    zh: '2 公里范围内 OpenStreetMap 未返回幼托设施。',
  },
  childcareLoading: { en: 'Loading childcare…', zh: '加载幼托数据…' },
  childcareSourceNote: {
    en: 'Source: OpenStreetMap (community-curated). ACECQA NQF register is authoritative.',
    zh: '数据来源:OpenStreetMap(社区维护)。ACECQA 国家质量框架登记册为权威来源。',
  },
  childcareKindergarten: { en: 'Kindergarten', zh: '幼儿园' },
  childcareCentre: { en: 'Childcare', zh: '幼托中心' },
  lifestyleDemographicsLabel: {
    en: 'Lifestyle & Demographics',
    zh: '生活方式与人口结构',
  },
  censusMedianIncomeLabel: {
    en: 'Median Household Income',
    zh: '家庭收入中位数',
  },
  censusMedianAgeLabel: { en: 'Median Age', zh: '年龄中位数' },
  censusPopulationLabel: { en: 'Population', zh: '人口' },
  censusPersons: { en: 'persons', zh: '人' },
  censusHouseholdLabel: { en: 'Household Type', zh: '家庭结构' },
  censusHouseholdFamily: { en: 'Family', zh: '家庭式' },
  censusHouseholdLonePerson: { en: 'Lone Person', zh: '单人户' },
  censusHouseholdGroup: { en: 'Group / Other', zh: '合住 / 其他' },
  censusWeekly: { en: '/ wk', zh: '/ 周' },
  censusYears: { en: 'years', zh: '岁' },
  censusSourceCurated: {
    en: 'Source: ABS 2021 Census · POA',
    zh: '来源:ABS 2021 人口普查 · POA',
  },
  censusSourceFallback: {
    en: 'Source: ABS 2021 Census · Greater Melbourne average',
    zh: '来源:ABS 2021 人口普查 · 大墨尔本地区平均',
  },
  notRecorded: { en: 'Not recorded', zh: '未记录' },
  tbcSiteVisit: {
    en: 'Verification Pending',
    zh: '核实进行中',
  },
  verificationTooltip: {
    en: 'Professional Site Verification Recommended',
    zh: '建议由建筑师进行专业现场核实',
  },
  lastSoldHeadline: { en: 'Last Recorded Sale', zh: '最近成交' },
  planningInfoLabel: { en: 'Planning Information', zh: '规划信息' },
  hazardsLabel: { en: 'Hazards', zh: '环境风险' },
  bushfireHazardLabel: { en: 'Bushfire (BMO)', zh: '山火 (BMO)' },
  floodHazardLabel: { en: 'Flood (FO / SBO)', zh: '洪水 (FO / SBO)' },
  hazardDetected: { en: 'Detected', zh: '已识别' },
  hazardNoneDetected: { en: 'None detected', zh: '未识别' },
  councilInfoLabel: { en: 'Council Information', zh: '议会信息' },
  schoolInfoLabel: { en: 'School Information', zh: '学校信息' },
  schoolNotIntegrated: {
    en: 'TBC — Site Visit Required (Department of Education school-zone lookup pending integration with vic.gov.au Find My School)',
    zh: '待定 — 须现场核查(学区查询待对接 vic.gov.au Find My School)',
  },
  schoolPrimaryLabel: { en: 'Nearest Primary', zh: '最近的小学' },
  schoolSecondaryLabel: { en: 'Nearest Secondary', zh: '最近的中学' },
  schoolSourceNote: {
    en: 'Closest three by straight-line distance · Source: vic.gov.au Find My School pattern',
    zh: '按直线距离最近的三所学校 · 数据来源:vic.gov.au Find My School 模式',
  },
  lifestyleSafetyLabel: { en: 'Lifestyle & Safety', zh: '生活与安全' },
  burglaryHeadline: { en: 'Postcode burglary risk', zh: '邮编入室盗窃风险' },
  burglaryUnit: { en: 'homes', zh: '户' },
  burglaryAverageNote: {
    en: 'Postcode average · Annual residential burglary incidence',
    zh: '邮编平均值 · 年度住宅入室盗窃发生率',
  },
  burglarySourceNote: {
    en: 'Source: RACV-style postcode index (Victorian Crime Statistics Agency pattern)',
    zh: '数据来源:RACV 邮编指数(维多利亚州犯罪统计局模式)',
  },
  burglayCategoryLow: { en: 'Low risk', zh: '风险较低' },
  burglayCategoryModerate: { en: 'Moderate', zh: '中等' },
  burglayCategoryElevated: { en: 'Elevated', zh: '偏高' },
  burglayCategoryHigh: { en: 'High', zh: '较高' },
  postcodeUnknown: { en: 'Postcode unavailable', zh: '邮编不可用' },
  sectionInputs: { en: 'Lot Inputs', zh: '地块输入' },
  sectionAssessment: { en: 'Assessment', zh: '可行性评估' },
  searchPlaceholder: {
    en: 'e.g. 123 Collins Street, Melbourne VIC',
    zh: '例如:墨尔本 Collins Street 123 号',
  },
  searchButton: { en: 'Search', zh: '搜索' },
  searching: { en: 'Searching…', zh: '查询中…' },
  notFound: {
    en: 'Address not found in Victoria. Try a more specific street address.',
    zh: '未在维多利亚州找到该地址。请输入更具体的街道地址。',
  },
  fetchError: {
    en: 'Could not reach the planning data service. Check your connection and retry.',
    zh: '无法连接规划数据服务。请检查网络后重试。',
  },
  source: { en: 'Source', zh: '数据来源' },
  sourceLive: { en: 'Live VicPlan', zh: '实时 VicPlan' },
  sourceMock: { en: 'Mock', zh: '模型数据' },
  zone: { en: 'Zone', zh: '分区' },
  noOverlays: {
    en: 'No disqualifying overlays detected at this point.',
    zh: '该点位未检测到限制性覆盖区。',
  },
  lotSize: { en: 'Lot size', zh: '地块面积' },
  lotSizeHint: {
    en: 'Lot area is not returned by the address lookup — adjust manually.',
    zh: '地址查询不返回地块面积,请手动调整。',
  },
  threshold: { en: 'SSD threshold', zh: 'SSD 门槛' },
  overlays: { en: 'Overlays', zh: '规划覆盖区' },
  status: { en: 'Status', zh: '评估结果' },
  basis: { en: 'Assessment Basis', zh: '评估依据' },
  disclaimer: {
    en: 'Indicative only. The full 2026 Small Second Dwelling pathway has additional criteria — frontage, slope, services, neighbourhood character, and ResCode standards — not represented here.',
    zh: '仅供参考。完整的 2026 Small Second Dwelling 路径还包括地块正面宽度、坡度、市政服务、邻里特征及 ResCode 标准等评估条件,本页面未予体现。',
  },
  gfa: { en: 'Gross floor area', zh: '总建筑面积' },
  gfaThresholdHint: {
    en: 'SSD GFA cap',
    zh: 'SSD 上限',
  },
  gfaWarning: {
    en: 'Proposed GFA exceeds the 60 m² Small Second Dwelling threshold. The SSD permit-exempt pathway no longer applies; standard residential planning controls take over.',
    zh: '拟建总建筑面积超出 60 m² 小型第二住宅上限。不再适用小型第二住宅豁免规划许可路径,需依一般住宅规划控制评估。',
  },
  noticeElectric: {
    en: 'Notice: Under 2026 Victorian Building Regulations, new SSDs must be all-electric and cannot connect to reticulated natural gas.',
    zh: '注意:根据 2026 年维多利亚州建筑法规,新建小型第二住宅必须采用全电气化设计,不得接入天然气管网。',
  },
  noticeDpu: {
    en: "Note: Transitional arrangements for Dependent Person's Units (DPUs) are active until 28 March 2027, allowing larger relocatable units for dependent occupants.",
    zh: '注意:受养人住宅单元 (DPU) 的过渡性安排在 2027 年 3 月 28 日前继续适用,允许为受养居住者使用较大型的可拆迁式住宅单元。',
  },
  regulatoryNotices: { en: 'Regulatory Notices', zh: '监管须知' },
  potentialRisks: { en: 'Potential Risks', zh: '潜在风险' },
  complianceChecklist: { en: 'Compliance Checklist', zh: '合规清单' },
  resCodePass: { en: 'Pass', zh: '通过' },
  resCodeFail: { en: 'Fail', zh: '未达标' },
  resCodeWarn: { en: 'Verify', zh: '待核实' },
  complianceSummary: { en: 'Compliance Summary', zh: '合规总评' },
  heritageTipLabel: { en: 'Heritage Constraint · HO', zh: '遗产限制 · HO' },
  heritageTip: {
    en: 'Heritage constraints may require custom cladding to match the primary dwelling.',
    zh: '遗产保护限制可能要求定制外墙以匹配主建筑。',
  },
  floodPremiumLabel: {
    en: 'Site Premium · Flood Allowance',
    zh: '场地附加 · 淹水预留',
  },
  floodPremiumNote: {
    en: 'Allowance for raised floor levels in flood-prone area.',
    zh: 'LSIO 抬升楼板标高的造价预留。',
  },
  subdivideLabel: { en: 'Subdivide Lot (Dual Occupancy)', zh: '地块分割(双套住宅)' },
  subdivideHint: {
    en: 'Halve the lot to simulate a dual-occupancy split. Site Coverage is recalculated against the smaller child lot.',
    zh: '将地块对半分割,模拟双套住宅。场地覆盖率按较小子地块重新计算。',
  },
  wallOnBoundaryLabel: { en: 'Wall on Boundary (m)', zh: '侧界墙体长度 (m)' },
  wallOnBoundaryHint: {
    en: 'Standard A11: walls on or within 200 mm of a boundary capped at 10 m + 25% of remaining boundary.',
    zh: '标准 A11:位于边界或距边界 200 mm 以内的墙体长度上限为 10 m + 剩余边界长度的 25%。',
  },
  propertyCategoryLabel: { en: 'Category', zh: '类别' },
  propertyCategorySource: { en: 'source', zh: '数据来源' },
  propertyCategorySourceDomain: { en: 'Domain API', zh: 'Domain API' },
  propertyCategorySourceDerived: {
    en: 'derived from Vicmap footprints',
    zh: '由 Vicmap 建筑轮廓推断',
  },
  propertyCategorySourceUnknown: { en: 'unclassified', zh: '未分类' },
  dwellingCountLabel: { en: 'Existing dwellings (footprint count)', zh: '现有住宅(建筑轮廓数)' },
  ssdRestrictedTitle: {
    en: 'SSD Pathway Restricted',
    zh: '小微第二住宅路径受限',
  },
  ssdRestrictedBody: {
    en: 'Multi-dwelling or non-residential lot detected. The SSD permit-exempt pathway applies to single-dwelling residential lots only.',
    zh: '检测到多住宅或非住宅用地。SSD 免许可路径仅适用于单住宅居住用地。',
  },
  ssdMultiDwelling: {
    en: 'INELIGIBLE: SSD pathway only applies to single-dwelling lots.',
    zh: '不符合条件:SSD 路径仅适用于单住宅地块。',
  },
  ssdNonResidential: {
    en: 'Non-residential zone — SSD pathway does not apply. Confirm zone via the planning scheme.',
    zh: '非住宅分区 — 不适用 SSD 路径。请参阅规划方案核实分区。',
  },
  ssdVacantLandNote: {
    en: 'Vacant lot — "second dwelling" implies an existing primary dwelling. Plan a primary build first.',
    zh: '空地 — 「第二住宅」前提是已有主住宅,需先规划主体建筑。',
  },
  overlayOverrideTitle: {
    en: 'Overlay Detected',
    zh: '检测到覆盖区',
  },
  overlayOverrideBody: {
    en: 'Planning Permit required regardless of SSD status.',
    zh: '无论 SSD 状态如何,均需申请规划许可。',
  },
  marketContext: { en: 'Market Context', zh: '市场参考' },
  marketContextIntro: {
    en: 'Last recorded sale and recent comparable transactions within ~400 m. Use as a directional cue; verify against a current valuation before acting.',
    zh: '近期成交记录及周边约 400 米范围内的可比成交。仅供方向性参考,行动前请以最新估价为准。',
  },
  marketLastSold: { en: 'Last sold', zh: '上次成交' },
  marketComparables: { en: 'Comparable Sales', zh: '可比成交' },
  marketDemoNote: {
    en: 'Demo data — connect a Domain API key in /settings for live figures.',
    zh: '演示数据 — 请在 /settings 中连接 Domain API 密钥以获取实时数据。',
  },
  marketNone: {
    en: 'No comparable sales returned for this address.',
    zh: '该地址未返回可比成交数据。',
  },
  nextSteps: { en: 'Next Steps', zh: '后续步骤' },
  nextStepsIntro: {
    en: 'Verify zoning, overlays, and any unique site constraints with your local council before lodging a planning application or commissioning design work.',
    zh: '在提交规划申请或委托设计前,请向当地市议会核实分区、覆盖区及任何特殊场地限制。',
  },
  councilLabel: { en: 'Local Council', zh: '当地市议会' },
  councilWebsite: { en: 'Website', zh: '官网' },
  councilPhone: { en: 'Phone', zh: '电话' },
  councilEmail: { en: 'Email', zh: '邮箱' },
  councilFallback: {
    en: 'Visit the council website for current contact details.',
    zh: '请访问议会官网获取最新联系方式。',
  },
  councilUnknown: {
    en: 'Local council not detected for this address. Use the Victorian Government council finder to identify the correct LGA.',
    zh: '未能识别此地址所属市议会。请使用维多利亚州政府议会查询工具确认。',
  },
  mapTools: { en: 'Map Tools', zh: '地图工具' },
  toolPan: { en: 'Pan', zh: '平移' },
  toolTree: { en: 'Place Tree', zh: '放置树木' },
  toolDistance: { en: 'Distance', zh: '距离' },
  toolArea: { en: 'Area', zh: '面积' },
  toolClear: { en: 'Clear', zh: '清除' },
  toolHint: {
    en: 'Click on the map. Press Esc to cancel.',
    zh: '在地图上点击。按 Esc 取消。',
  },
  dbhModalTitle: { en: 'Tree Diameter at Breast Height', zh: '胸径 DBH' },
  dbhInputLabel: { en: 'DBH (mm)', zh: '胸径 (mm)' },
  dbhStandardNote: {
    en: 'TPZ per AS 4970-2009, clause 3.2. Radius = 12 × DBH, clamped 2–15 m.',
    zh: 'TPZ 依据 AS 4970-2009 第 3.2 条:半径 = 12 × DBH,限值 2–15 m。',
  },
  dbhConfirm: { en: 'Place TPZ', zh: '放置 TPZ' },
  dbhCancel: { en: 'Cancel', zh: '取消' },
  scenario: { en: 'Feasibility Scenario', zh: '可行性测算' },
  scenarioIntro: {
    en: 'Indicative ROI computed from your inputs. Excludes land, financing, vacancy, holding and maintenance.',
    zh: '基于您输入的指示性回报测算。未计入土地、融资、空置、持有及维修费用。',
  },
  scenarioBuildCost: { en: 'Build Cost (AUD)', zh: '建造成本 (澳元)' },
  scenarioRent: { en: 'Expected Weekly Rent (AUD)', zh: '预期周租金 (澳元)' },
  scenarioDwellings: { en: 'Dwellings (1 SSD · 2 dual occ)', zh: '住宅数量 (1 SSD · 2 双联)' },
  scenarioAnnualRent: { en: 'Total annual rent', zh: '年总租金' },
  scenarioPayback: { en: 'Simple payback', zh: '简单回本期' },
  scenarioYield: { en: 'Gross yield', zh: '毛收益率' },
  profitRoiHeading: { en: 'Develop-and-Sell · Profit & ROI', zh: '开发出售 · 利润与回报' },
  profitRoiIntro: {
    en: 'Indicative pro-forma for a townhouse development. GRV minus total development cost (site + construction + soft costs). Adjust the sliders to test scenarios — every figure overrides a default baseline.',
    zh: '联排住宅开发的指示性测算。总销售回款 (GRV) 减去开发总成本(土地 + 建造 + 软成本)。拖动滑块即可重新测算 — 默认数值可被任意覆盖。',
  },
  profitGrv: { en: 'Project Gross Sales (GRV)', zh: '项目总销售回款 (GRV)' },
  profitNet: { en: 'Estimated Net Profit', zh: '预估开发净利润' },
  profitRoi: { en: 'Project ROI', zh: '项目投资回报率' },
  profitTdc: { en: 'Total Development Cost (TDC)', zh: '开发总成本 (TDC)' },
  profitSoftCosts: { en: 'Soft costs · design, levies, finance (15%)', zh: '软成本 · 设计、规费、融资(15%)' },
  profitSiteCost: { en: 'Site Purchase Cost', zh: '土地购置成本' },
  profitDwellings: { en: 'Dwellings (from Feasibility yield)', zh: '住宅数量(可行性产出)' },
  profitConstructionSlider: { en: 'Construction Cost per Unit', zh: '单套建造成本' },
  profitSaleSlider: { en: 'Target Sale Price per Unit', zh: '单套预期售价' },
  profitDisclaimer: {
    en: 'Excludes GST / margin scheme treatment, holding costs during construction, sales agent commission and contingency. Refine with a quantity surveyor before committing capital.',
    zh: '未计入 GST 与差价计税方案、施工持有成本、销售代理佣金及预备费。资金承诺前请由专业造价咨询师核实。',
  },
  profitNoYield: {
    en: 'Townhouse yield is unavailable for this zone — Profit & ROI model requires a residential zone (GRZ · NRZ · RGZ).',
    zh: '该分区无联排住宅产出测算 — 利润与回报模型仅适用于住宅分区(GRZ · NRZ · RGZ)。',
  },
  saveToPortfolio: { en: 'Save to Project Portfolio', zh: '保存至项目组合' },
  saveToPortfolioSaved: { en: 'Saved', zh: '已保存' },
  portfolioHeading: { en: 'My Saved Portfolio', zh: '我的项目组合' },
  portfolioEmpty: {
    en: 'No saved properties yet. Search a Victorian address and click "Save to Project Portfolio" to start tracking.',
    zh: '尚未保存任何物业。搜索维多利亚州地址后点击「保存至项目组合」即可开始追踪。',
  },
  portfolioRestore: { en: 'Open', zh: '打开' },
  portfolioDelete: { en: 'Remove from portfolio', zh: '从组合中移除' },
  portfolioSavedAt: { en: 'Saved', zh: '已保存' },
  portfolioUnits: { en: 'Units', zh: '套' },
  yieldDiscrepancyHeading: {
    en: 'Saved Snapshot vs. Live Calculation',
    zh: '历史快照 vs. 实时测算' ,
  },
  yieldDiscrepancyBody: {
    en: 'The townhouse yield computed today differs from the value saved earlier. Planning controls or lot data may have changed — review before relying on either figure.',
    zh: '今日测算的联排住宅产出与此前保存的快照不一致。规划控制或地块数据可能已发生变化 — 请核实后再行决策。',
  },
  yieldDiscrepancySaved: { en: 'Saved', zh: '已保存' },
  yieldDiscrepancyLive: { en: 'Live', zh: '实时' },
  execSummary: { en: 'Executive Summary', zh: '执行摘要' },
  warningPrefix: { en: 'Warning', zh: '警告' },
  generateReport: BETA_REPORT_CTA,
  generatingReport: { en: 'Preparing…', zh: '准备中…' },
  reportHeaderTitle: { en: 'Professional Report', zh: '专业报告' },
  reportHeaderSubtitle: {
    en: 'Architectural Feasibility Assessment',
    zh: '建筑可行性评估',
  },
  dpuApplyLabel: {
    en: "Apply as Dependent Person's Unit (DPU)",
    zh: '按受养人住宅单元 (DPU) 申请',
  },
  dpuApplyHint: {
    en: 'Engages the transitional pathway active until 28 March 2027.',
    zh: '启用 2027 年 3 月 28 日前的过渡性路径。',
  },
  dpuAlertLabel: { en: 'Alert', zh: '提醒' },
  dpuAlertHeading: {
    en: 'Transitional DPU Pathway engaged',
    zh: '已启用 DPU 过渡性路径',
  },
  dpuAlertBody: {
    en: 'This project has been marked as a Dependent Person\'s Unit. Transitional arrangements remain in force until 28 March 2027, allowing a larger relocatable dwelling for an identified dependent occupant. After this date, DPUs fall back to standard secondary-dwelling controls — design accordingly if completion may slip past the deadline.',
    zh: '本项目已标记为受养人住宅单元 (DPU)。过渡性安排在 2027 年 3 月 28 日前继续有效,允许为指定的受养居住者使用较大型的可拆迁式住宅。该日期后,DPU 将回归标准次级住宅控制 — 若工程可能延迟至截止日期之后,设计须相应调整。',
  },
  serviceRequirements: { en: 'Service Requirements', zh: '服务要求' },
  srGasBanLabel: { en: 'All-electric — 2026 gas ban', zh: '全电气化 — 2026 燃气禁令' },
  srEnergyLabel: { en: 'Minimum 7-star NatHERS', zh: '最低 7 星 NatHERS' },
  srEnergyDetail: {
    en: 'Under NCC 2026, new residential dwellings including SSDs must achieve a minimum 7-star NatHERS rating, with whole-of-home energy budget compliance.',
    zh: '根据 NCC 2026 规范,新建住宅(包括小型第二住宅)须达到 NatHERS 最低 7 星能效评级,并满足全屋能耗预算合规要求。',
  },
  sectionAdvice: { en: "Consultant's Advice", zh: '顾问建议' },
  sectionSite: { en: 'Site Conditions', zh: '场地条件' },
  siteIntro: {
    en: 'Manual ResCode checks the architect must confirm on-site. Each must be Yes for the SSD permit-exempt pathway.',
    zh: 'ResCode 要求建筑师现场确认的人工核查项,均须为「是」方可适用 SSD 豁免规划许可路径。',
  },
  siteFrontageLabel: { en: 'Frontage ≥ 5 m', zh: '正面宽度 ≥ 5 米' },
  siteFrontageHint: {
    en: 'Minimum lot frontage required for permit-exempt SSDs.',
    zh: '豁免规划许可的小型第二住宅所需最低地块正面宽度。',
  },
  siteSlopeLabel: { en: 'Slope < 10%', zh: '坡度 < 10%' },
  siteSlopeHint: {
    en: 'Gradient cap for the 2026 exempt pathway.',
    zh: '2026 豁免路径的坡度上限。',
  },
  siteAccessLabel: { en: '1.5 m side access', zh: '1.5 米侧向通道' },
  siteAccessHint: {
    en: 'Construction and emergency access clearance.',
    zh: '施工与紧急通行所需净宽。',
  },
  siteYes: { en: 'Yes', zh: '是' },
  siteNo: { en: 'No', zh: '否' },
  sectionBuilding: { en: 'Building Compliance', zh: '建筑合规' },
  buildingIntro: {
    en: 'Livable Housing Design (LHD) items required by NCC 2026 Volume Two Part H8 for new dwellings. These are building-permit obligations — they do not alter the planning verdict above but must be satisfied for occupation.',
    zh: '根据 NCC 2026 第二卷第 H8 部分,新住宅须满足的无障碍设计 (LHD) 要求。此类项目属于建筑许可义务,不影响上方规划评估结论,但使用前须全部达标。',
  },
  lhdEntryLabel: { en: 'Step-free entry', zh: '无障碍入口' },
  lhdEntryHint: {
    en: 'One accessible path from site boundary to the dwelling entrance, no steps, max 1:14 gradient.',
    zh: '从地块边界到住宅入口至少一条无台阶通路,坡度不超过 1:14。',
  },
  lhdDoorsLabel: { en: 'Accessible doorways', zh: '无障碍门洞' },
  lhdDoorsHint: {
    en: 'Internal doorways to habitable rooms provide ≥820 mm clear opening width.',
    zh: '通向居住房间的室内门洞净宽须不少于 820 mm。',
  },
  lhdReinforcementLabel: {
    en: 'Bathroom wall reinforcement',
    zh: '卫生间墙体预埋加固',
  },
  lhdReinforcementHint: {
    en: 'Bathroom walls reinforced for future grab-rail installation adjacent to the toilet and shower.',
    zh: '卫生间坐便器与淋浴区墙体预埋加固,以便日后加装扶手。',
  },
  lhdWarning: {
    en: 'One or more NCC 2026 LHD items remain open — resolve before certificate of occupancy.',
    zh: '仍有 NCC 2026 LHD 项目未满足,使用批准前须完成整改。',
  },
  useMyLocation: { en: 'Current location', zh: '当前位置' },
  usingLocation: { en: 'Locating…', zh: '定位中…' },
  locationError: {
    en: 'Could not resolve your location to a Victorian address. Try a manual search.',
    zh: '无法将当前位置解析到维多利亚州地址,请手动搜索。',
  },
  locationDenied: {
    en: 'Location permission denied by the browser. Use the search box instead.',
    zh: '浏览器已拒绝位置权限,请改用搜索栏。',
  },
  searchingLabel: { en: 'Searching…', zh: '搜索中…' },
  fallbackNote: {
    en: 'Using standard search (Vicmap is slow)',
    zh: '已切换至备用搜索(Vicmap 响应缓慢)',
  },
  existingCoverage: {
    en: 'Existing site coverage',
    zh: '现有场地覆盖面积',
  },
  existingCoverageHint: {
    en: 'Existing dwelling + driveway + impervious area on the lot, before the SSD is added.',
    zh: '现有住宅、车道与不透水面积总和(尚未加上拟建小型第二住宅)。',
  },
  gardenAreaLabel: { en: 'Available garden area', zh: '可用花园面积' },
  gardenRequirementLabel: {
    en: 'ResCode minimum',
    zh: 'ResCode 最低值',
  },
  gardenExempt: {
    en: 'Garden Area standard does not apply to lots under 400 m².',
    zh: '地块面积不足 400 m²,不适用花园面积标准。',
  },
  gardenWarning: {
    en: 'Available garden area falls below the ResCode minimum once the proposed SSD is added.',
    zh: '加上拟建 SSD 后,可用花园面积低于 ResCode 最低要求。',
  },
  siteTreeLabel: {
    en: 'Canopy tree area (3 m × 3 m)',
    zh: '乔木冠层空间 (3 m × 3 m)',
  },
  siteTreeHint: {
    en: 'Amendment VC282 (Sept 2025) requires new SSDs to accommodate a canopy tree. Confirm the design provides a 3 m × 3 m planting area.',
    zh: 'VC282 修订(2025 年 9 月)要求新建小型第二住宅须预留乔木冠层空间,请确认设计提供 3 m × 3 m 种植区域。',
  },
  backyardOrientationLabel: {
    en: 'Backyard orientation',
    zh: '后院朝向',
  },
  backyardOrientationHint: {
    en: 'Select the compass direction the rear of the lot faces. Used to generate solar orientation advice.',
    zh: '选择地块后方所朝方位,用于生成太阳能朝向建议。',
  },
  buildableAreaLabel: {
    en: 'Buildable area (1 m setback)',
    zh: '可建面积(1 米退界)',
  },
  buildableAreaHint: {
    en: 'Area of the building envelope after applying standard 1 m side/rear setbacks. Compare this to your proposed GFA.',
    zh: '应用标准 1 米侧向/后向退界后的建筑包络面积。请与拟建总建筑面积对比。',
  },
  solarTipLabel: { en: "Consultant's Pro-Tip", zh: '顾问专业提示' },
  easementLabel: { en: 'Easement present?', zh: '是否存在地役权?' },
  easementHint: {
    en: 'Select Yes if the lot has a registered easement (drainage, sewer, access). Building over an easement requires separate consent.',
    zh: '如地块存在已登记地役权(排水、污水、通行),请选择「是」。在地役权上建造须另行取得同意。',
  },
  easementWarning: {
    en: '⚠️ Notice: Building over an easement requires separate Water Authority and Council consent.',
    zh: '⚠️ 注意:在地役权上建造须分别取得供水机构与议会同意。',
  },
  treeDbhLabel: {
    en: 'Significant tree diameter (mm)',
    zh: '重要树木直径 (mm)',
  },
  treeDbhHint: {
    en: 'Diameter at breast height (DBH) of any significant tree on the lot. A 12× TPZ (Tree Protection Zone) will be drawn on the map.',
    zh: '地块上任何重要树木的胸径 (DBH)。地图将绘制 12 倍 TPZ(树木保护区)。',
  },
  architectNotesLabel: {
    en: "Architect's site observations",
    zh: '建筑师现场观察',
  },
  architectNotesHint: {
    en: 'Custom notes that will appear in the PDF report under "Special Consultant Notes".',
    zh: '自定义备注,将在 PDF 报告「特别顾问备注」部分显示。',
  },
  treeOffsetLabel: {
    en: 'Tree location offset (m)',
    zh: '树木位置偏移 (米)',
  },
  treeOffsetHint: {
    en: 'Adjust X (east/west) and Y (north/south) to move the TPZ circle to the actual tree location.',
    zh: '调整 X(东/西)与 Y(北/南)以将 TPZ 圆移至实际树木位置。',
  },
  presentationModeLabel: {
    en: 'Presentation Mode',
    zh: '演示模式',
  },
  presentationModeHint: {
    en: 'Hide input controls and expand the map for client presentations.',
    zh: '隐藏输入控件并扩展地图,用于客户演示。',
  },
  specialNotesLabel: { en: 'Special Consultant Notes', zh: '特别顾问备注' },
  hoverTipZone: { en: 'Zone', zh: '分区' },
  hoverTipOverlay: { en: 'Overlays', zh: '覆盖区' },
  sectionYield: { en: 'Potential Yield', zh: '潜在收益' },
  yieldIntro: {
    en: 'Indicative rental income projections for a compliant Small Second Dwelling on this lot.',
    zh: '该地块上符合规范的小型第二住宅的参考租金收入预测。',
  },
  yieldLtrLabel: { en: 'Long-Term Rental (LTR)', zh: '长期租赁 (LTR)' },
  yieldLtrWeekly: { en: 'per week', zh: '每周' },
  yieldLtrAnnual: { en: 'per year', zh: '每年' },
  yieldStrLabel: { en: 'Short-Term Rental (STR)', zh: '短期租赁 (STR)' },
  yieldStrAnnual: { en: 'per year', zh: '每年' },
  yieldPaybackLabel: { en: 'Estimated Payback Period', zh: '预计回本期' },
  yieldPaybackYears: { en: 'years', zh: '年' },
  yieldCostLabel: { en: 'Estimated construction cost', zh: '预计建造成本' },
  yieldCostHint: {
    en: 'Adjust to match your project budget. Typical SSD construction ranges $3,500–$4,200/m² in Melbourne (2026).',
    zh: '根据项目预算调整。墨尔本典型 SSD 建造成本为 $3,500–$4,200/m²(2026 年)。',
  },
  costMatrixLabel: { en: 'Cost Matrix · 2026 Melbourne', zh: '成本矩阵 · 2026 墨尔本' },
  costMatrixIntro: {
    en: 'Itemised SSD construction estimate. Adjust the per-m² rate to match the brief; consultants, council, and GST flow through automatically.',
    zh: '小型第二住宅建造成本明细。调整每平方米费率以匹配项目要求;顾问费、市议会贡献与 GST 将自动联动。',
  },
  costRateLabel: { en: 'Build rate', zh: '建造单价' },
  costRatePerM2: { en: '$ / m²', zh: '元 / 平方米' },
  costRateBracket: { en: '$3,500 – $4,200 / m² · high-end SSD', zh: '$3,500 – $4,200 / 平方米 · 高端 SSD' },
  costBaseBuild: { en: 'Base build', zh: '基础建造' },
  costBaseBuildHint: { en: 'GFA × rate', zh: '建筑面积 × 单价' },
  costConsultants: { en: 'Consultant fees (architect + surveyor)', zh: '顾问费(建筑师 + 测量师)' },
  costConsultantsHint: { en: '~10% of base', zh: '约为基础建造的 10%' },
  costCouncil: { en: 'Council contributions', zh: '市议会贡献' },
  costCouncilHint: { en: 'Permit + open-space contribution', zh: '许可证 + 开放空间贡献' },
  costSubtotal: { en: 'Subtotal', zh: '小计' },
  costGst: { en: 'GST (10%)', zh: '消费税 (10%)' },
  costTotal: { en: 'Total Project Cost', zh: '项目总成本' },
  targetRentLabel: { en: 'Target Weekly Rent', zh: '目标周租金' },
  targetRentSuggested: { en: 'Suggested', zh: '建议' },
  targetRentBracketPremium: {
    en: 'Premium bracket — postcode median income above $2,000/wk supports a $550 – $650/wk SSD.',
    zh: '高端区间 —— 邮编中位家庭周收入超过 $2,000,可支持 $550 – $650/周的 SSD 租金。',
  },
  targetRentBracketStandard: {
    en: 'Standard bracket — postcode median income at or below $2,000/wk maps to a $450 – $520/wk SSD.',
    zh: '标准区间 —— 邮编中位家庭周收入不超过 $2,000,对应 $450 – $520/周的 SSD 租金。',
  },
  targetRentNoData: {
    en: 'Target rent will populate once census data resolves for this postcode.',
    zh: '一旦该邮编的人口普查数据加载,目标租金将自动填充。',
  },
  yieldDisclaimerLabel: { en: 'Yield Disclaimer', zh: '收益免责声明' },
  yieldDisclaimer: {
    en: 'Rental projections are indicative only and based on current market averages. Actual returns depend on location, finish quality, market conditions, vacancy rates, and management costs.',
    zh: '租金预测仅供参考,基于当前市场平均值。实际回报取决于位置、装修质量、市场状况、空置率及管理成本。',
  },
  bookConsultation: { en: 'Book Architect Consultation', zh: '预约建筑师咨询' },
  dpuCountdownLabel: { en: 'DPU Transition Deadline', zh: 'DPU 过渡期截止日期' },
  dpuCountdownPrefix: { en: 'Strategic Alert:', zh: '战略提醒:' },
  dpuCountdownSuffix: {
    en: 'remaining for the March 28, 2027 DPU transition period.',
    zh: '距 2027 年 3 月 28 日 DPU 过渡期截止。',
  },
  dataSourceBadge: {
    en: 'Source: Live VicPlan & Domain Data',
    zh: '数据来源:实时 VicPlan 与 Domain 数据',
  },
  dataSourceVicPlanOnly: {
    en: 'Source: Live VicPlan Data',
    zh: '数据来源:实时 VicPlan 数据',
  },
  overlaysAutoDetected: {
    en: 'Auto-detected from VicPlan',
    zh: '从 VicPlan 自动检测',
  },
  lotSizeAutoPopulated: {
    en: 'Auto-populated from Domain',
    zh: '从 Domain 自动填充',
  },
  rentalEstimateSource: {
    en: 'Domain rental estimate',
    zh: 'Domain 租金估算',
  },
  siteInspector: { en: 'Site Inspector', zh: '现场检查' },
  siteInspectorHint: {
    en: 'Manual on-site verification items required by ResCode and NCC 2026',
    zh: 'ResCode 与 NCC 2026 要求的现场人工核查项目',
  },
  siteInspectorExpand: { en: 'Expand', zh: '展开' },
  siteInspectorCollapse: { en: 'Collapse', zh: '收起' },
  verifiedStatus: {
    en: 'SimplySite Verified: Planning Permit Exempt',
    zh: 'SimplySite 已验证:豁免规划许可',
  },
  verifiedQualified: {
    en: 'SimplySite Verified: Qualified for 2026 Exempt Pathway',
    zh: 'SimplySite 已验证:符合 2026 豁免路径',
  },
  investmentHighlight: { en: 'Investment Highlight', zh: '投资亮点' },
  paybackPeriodLabel: { en: 'Estimated Payback Period', zh: '预计回本期' },
  orderDocuments: { en: 'Order Official Property Documents', zh: '订购官方产权文件' },
  orderDocumentsHint: {
    en: 'Get certified title, planning certificates, and zoning maps from Land Data Victoria',
    zh: '从 Land Data Victoria 获取认证产权、规划证书与分区地图',
  },
  shareReport: { en: 'Share Feasibility Report', zh: '分享可行性报告' },
  shareReportHint: {
    en: 'Generate a shareable link to this assessment',
    zh: '生成此评估的可分享链接',
  },
  linkCopied: { en: 'Link copied to clipboard!', zh: '链接已复制到剪贴板!' },
  pricingTitle: { en: 'Professional Reports', zh: '专业报告' },
  pricingSubtitle: {
    en: 'Choose the right level of detail for your project',
    zh: '为您的项目选择合适的详细程度',
  },
  planStarter: { en: 'Starter', zh: '入门版' },
  planProfessional: { en: 'Professional', zh: '专业版' },
  planPrice: { en: 'Free', zh: '免费' },
  planPricePro: { en: '$49', zh: '$49' },
  planFeature1: { en: 'Basic feasibility check', zh: '基础可行性检查' },
  planFeature2: { en: 'Live VicPlan data', zh: '实时 VicPlan 数据' },
  planFeature3: { en: 'PDF report generation', zh: 'PDF 报告生成' },
  planFeature4: { en: 'Domain rental estimates', zh: 'Domain 租金估算' },
  planFeature5: { en: 'ROI & payback analysis', zh: 'ROI 与回本分析' },
  planFeature6: { en: 'Architect consultation booking', zh: '建筑师咨询预约' },
  planFeature7: { en: 'Priority email support', zh: '优先电子邮件支持' },
  buyProfessional: { en: 'Buy Professional Report', zh: '购买专业报告' },
} as const;

function pick<T extends { en: string; zh: string }>(obj: T, lang: Lang) {
  return lang === 'en' ? obj.en : obj.zh;
}

type LiveResult = {
  displayName: string;
  lat: number;
  lon: number;
  polygon: ParcelPolygon | null;
  spi: string | null;
  vicPlan: VicPlanData;
  domain: DomainPropertyData | null;
  easements: EasementData[];
  lga: LgaContact | null;
  buildings: ParcelPolygon[];
  price: PriceField;
  area: AreaField;
  councilSource: CouncilSource;
  councilName: string | null;
};

export default function Home() {
  const [lang, setLang] = useState<Lang>('en');
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [lotSize, setLotSize] = useState(400);
  const [gfa, setGfa] = useState(50);
  const [dpuIntent, setDpuIntent] = useState(false);
  const [overlayState, setOverlayState] = useState<Record<OverlayCode, boolean>>({
    HO: false,
    BMO: false,
    FO: false,
    SBO: false,
    PO: false,
    DDO: false,
    DCPO: false,
  });
  const [siteConditions, setSiteConditions] = useState<SiteConditions>({
    frontageOk: true,
    slopeOk: true,
    sideAccessOk: true,
    treeCanopyOk: true,
  });
  const [lhd, setLhd] = useState({
    entryOk: true,
    doorsOk: true,
    reinforcementOk: true,
  });
  const [existingCoverage, setExistingCoverage] = useState(120);
  const [backyardOrientation, setBackyardOrientation] =
    useState<Orientation>('Unknown');
  const [easementPresent, setEasementPresent] = useState(false);
  const [treeDbhMm, setTreeDbhMm] = useState(0);
  const [architectNotes, setArchitectNotes] = useState('');
  const [treeLon, setTreeLon] = useState<number | null>(null);
  const [treeLat, setTreeLat] = useState<number | null>(null);
  const [mapTool, setMapTool] = useState<MapTool>('pan');
  const [distancePoints, setDistancePoints] = useState<[number, number][]>([]);
  const [areaPoints, setAreaPoints] = useState<[number, number][]>([]);
  const [dbhModalOpen, setDbhModalOpen] = useState(false);
  const [dbhInputMm, setDbhInputMm] = useState(300);
  const [pendingTreePoint, setPendingTreePoint] = useState<[number, number] | null>(null);
  const [scenarioBuildCost, setScenarioBuildCost] = useState(250000);
  const [scenarioWeeklyRent, setScenarioWeeklyRent] = useState(650);
  const [scenarioDwellings, setScenarioDwellings] = useState(1);
  const [profitConstructionPerUnit, setProfitConstructionPerUnit] = useState<number>(
    PROFIT_DEFAULTS.constructionCostPerUnit,
  );
  const [profitSalePerUnit, setProfitSalePerUnit] = useState<number>(
    defaultSalePriceForLga(null),
  );
  // Portfolio — savedProperties hydrates from localStorage in a
  // post-mount useEffect to avoid SSR hydration mismatch (the server
  // render always sees an empty list; the client populates on mount).
  // `justSaved` drives the 2-second toast feedback after saveProperty().
  // `restoredSnapshot` carries the saved record forward when a portfolio
  // card is clicked, so the Feasibility tab can compare snapshot vs
  // live yield once the new address loads.
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);
  const [justSaved, setJustSaved] = useState(false);
  const [restoredSnapshot, setRestoredSnapshot] = useState<SavedProperty | null>(null);
  const [subdivided, setSubdivided] = useState(false);
  const [wallOnBoundaryM, setWallOnBoundaryM] = useState(0);
  const [presentationMode, setPresentationMode] = useState(false);
  const [buildRatePerM2, setBuildRatePerM2] = useState(3850);
  const [siteInspectorOpen, setSiteInspectorOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [showLinkCopied, setShowLinkCopied] = useState(false);
  const [source, setSource] = useState<DataSource>('mock');
  const [live, setLive] = useState<LiveResult | null>(null);
  const [mapSnapshot, setMapSnapshot] = useState<string | null>(null);
  const [schools, setSchools] = useState<Place[] | null>(null);
  const [childcare, setChildcare] = useState<Place[] | null>(null);
  const [census, setCensus] = useState<CensusSnapshot | null>(null);
  const [educationTab, setEducationTab] = useState<'schools' | 'childcare'>('schools');
  const [burglary, setBurglary] = useState<BurglaryStats | null>(null);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<keyof typeof T | null>(null);

  const printRef = useRef<HTMLDivElement | null>(null);
  const mapPreviewRef = useRef<MapPreviewHandle | null>(null);

  const activeOverlays = useMemo(
    () => ALL_OVERLAY_CODES.filter((c) => overlayState[c]),
    [overlayState],
  );

  const result = useMemo(
    () =>
      checkSSDEligibility(lotSize, activeOverlays, siteConditions, {
        existingCoverage,
        proposedSsdFootprint: gfa,
      }, live?.vicPlan.zoneCode ?? null),
    [lotSize, activeOverlays, siteConditions, existingCoverage, gfa, live?.vicPlan.zoneCode],
  );

  const gardenReq = useMemo(() => getGardenRequirement(lotSize), [lotSize]);
  const availableGarden = Math.max(0, lotSize - existingCoverage - gfa);
  const requiredGarden = gardenReq ? lotSize * gardenReq.fraction : 0;
  const gardenShort = gardenReq ? availableGarden < requiredGarden : false;

  const envelope = useMemo(
    () => (live?.polygon ? computeBuildingEnvelope(live.polygon) : null),
    [live?.polygon],
  );

  const effectiveLotSize = subdivided ? Math.round(lotSize / 2) : lotSize;

  const proposedFootprint = useMemo(
    () =>
      live?.polygon
        ? computeProposedFootprint(live.polygon, gfa, { subdivided })
        : null,
    [live?.polygon, gfa, subdivided],
  );

  const splitLine = useMemo(
    () => (subdivided && live?.polygon ? computeSplitLine(live.polygon) : null),
    [subdivided, live?.polygon],
  );

  const coverageRatio =
    effectiveLotSize > 0
      ? (existingCoverage + gfa) / effectiveLotSize
      : 0;
  const envelopeExceeded = coverageRatio > 0.6;

  const resCodeChecks = useMemo(
    () =>
      live
        ? evaluateResCode({
            lotSizeM2: effectiveLotSize,
            newDwellingFootprintM2: gfa,
            parcel: live.polygon,
            buildings: live.buildings,
            envelope: envelope?.polygon ?? null,
            wallOnBoundaryM,
            zoneCode: live.vicPlan.zoneCode,
          })
        : [],
    [live, effectiveLotSize, gfa, envelope, wallOnBoundaryM],
  );

  const verdict = useMemo(
    () => (resCodeChecks.length > 0 ? deriveVerdict(resCodeChecks) : null),
    [resCodeChecks],
  );

  const isHeritage = !!live?.vicPlan.overlayCodes.includes('HO');
  const isFlood =
    !!live &&
    (live.vicPlan.overlayCodes.includes('SBO') ||
      live.vicPlan.overlayCodes.includes('FO'));
  const FLOOD_PREMIUM_AUD = 15000;

  const effectiveVerdict = useMemo(() => {
    if (!verdict) return null;
    if (isHeritage && verdict.status === 'compliant') {
      return {
        status: 'refinement' as const,
        label: { en: 'Refinement Required', zh: '需进一步细化' },
      };
    }
    return verdict;
  }, [verdict, isHeritage]);

  const gatekeeper = useMemo(
    () =>
      live
        ? categorizeProperty({
            domainPropertyType: live.domain?.propertyType ?? null,
            zoneCode: live.vicPlan.zoneCode,
            parcel: live.polygon,
            buildings: live.buildings,
          })
        : null,
    [live],
  );

  const overlayOverride = useMemo(() => {
    if (!live) return null;
    const codes = live.vicPlan.overlayCodes;
    if (codes.includes('HO') && codes.includes('SBO')) return 'HO+SBO';
    if (codes.includes('HO')) return 'HO';
    if (codes.includes('SBO')) return 'SBO';
    return null;
  }, [live]);

  const solarTip = useMemo(() => {
    if (backyardOrientation === 'N' || backyardOrientation === 'NE') {
      return {
        en: 'Excellent North-facing orientation. Ideal for high-performance solar gain and 7-star energy compliance.',
        zh: '极佳的朝北方位。适合高性能太阳能增益与 7 星能效合规。',
      };
    }
    return null;
  }, [backyardOrientation]);

  const isExempt = result.status === 'Permit Exempt';
  const t = (key: keyof typeof T) => pick(T[key], lang);

  // Yield calculations - use Domain data if available, fallback to defaults
  const ltrWeekly = live?.domain?.rentalEstimateWeekly ?? 550;
  const ltrAnnual = ltrWeekly * 52;
  const strAnnual = 58000; // $58k/year STR potential (market average for 60m² SSD)

  // 2026 Melbourne SSD cost matrix. Default rate sits in the middle of
  // the published $3,500–$4,200/m² high-end SSD bracket; the architect
  // can scrub the slider to fit their finishes brief. Consultant fees
  // (architect + surveyor + structural) come in around 10% of the base
  // build for a small dwelling. Council contributions are a fixed
  // permit + open-space contribution stand-in — councils vary widely
  // (Stonnington publishes ~$5k for a SSD permit pathway). GST is the
  // statutory 10% applied to the all-in subtotal.
  const baseBuild = Math.round(gfa * buildRatePerM2);
  const consultantFees = Math.round(baseBuild * 0.10);
  const councilContrib = 5000;
  const subtotalCost = baseBuild + consultantFees + councilContrib;
  const gstAmount = Math.round(subtotalCost * 0.10);
  const constructionCost = subtotalCost + gstAmount;

  const paybackLtr = constructionCost / ltrAnnual;
  const paybackStr = constructionCost / strAnnual;

  // Target Weekly Rent — pegged to ABS 2021 Census median household
  // income for the postcode. The high-income bracket trips at $1,500/wk
  // (covers Ivanhoe 3079, Mentone 3194, Glen Iris 3146 etc.) and pins the
  // suggested SSD rent at $550/wk — the floor of the premium 1BR market
  // and a rent point dual-income tenants in these postcodes will sustain.
  const targetRent: { low: number; high: number; suggested: number; bracket: 'premium' | 'standard' } | null =
    census == null
      ? null
      : census.medianHouseholdIncomeWeekly > 1500
        ? { low: 550, high: 650, suggested: 550, bracket: 'premium' }
        : { low: 450, high: 520, suggested: 480, bracket: 'standard' };

  // DPU countdown
  const dpuDeadline = new Date('2027-03-28');
  const now = new Date();
  const daysRemaining = Math.max(0, Math.floor((dpuDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const monthsRemaining = Math.floor(daysRemaining / 30);

  async function applyVicPlan(displayName: string, lon: number, lat: number) {
    const data = await fetchPropertyData(displayName, lon, lat);
    const { vicPlan, parcel, spi, domain, easements, buildings, price, area, council, councilName } = data;

    // Auto-map VicPlan overlays to state
    const next: Record<OverlayCode, boolean> = {
      HO: false,
      BMO: false,
      FO: false,
      SBO: false,
      PO: false,
      DDO: false,
      DCPO: false,
    };
    for (const code of vicPlan.overlayCodes) next[code] = true;
    setOverlayState(next);

    // Lot size is now resolved by the propertyData waterfall — cadastral
    // parcel geometry first, Domain metadata second, null when neither
    // rung resolves. The numeric slider keeps its previous value when the
    // waterfall returns null so the architect can still scenario-plan.
    if (area.valueM2 != null) {
      setLotSize(area.valueM2);
    }

    // Auto-detect frontage and orientation from parcel geometry
    if (parcel) {
      const frontage = calculateFrontage(parcel);
      const orientation = detectOrientation(parcel);

      setSiteConditions((prev) => ({
        ...prev,
        frontageOk: checkFrontageRequirement(frontage),
      }));

      if (orientation !== 'Unknown') {
        setBackyardOrientation(orientation as Orientation);
      }
    }

    if (easements.length > 0) {
      setEasementPresent(true);
    }

    // The geocoder's lon/lat is unit-level when Vicmap resolved a unit
    // address; the parcel polygon is rendered as the boundary, but the
    // marker stays on the actual address point so a townhouse / unit is
    // never visually shifted to the parent lot's centroid.
    setLive({
      displayName,
      lat,
      lon,
      polygon: parcel,
      spi,
      vicPlan,
      domain,
      easements,
      lga: council.contact,
      buildings,
      price,
      area,
      councilSource: council.source,
      councilName,
    });
    setSource('live');
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length === 0 || searching) return;
    setSearching(true);
    setSearchError(null);
    try {
      const geo = await geocodeAddress(query);
      if (!geo) {
        setSearchError('notFound');
        return;
      }
      await applyVicPlan(geo.result.displayName, geo.result.lon, geo.result.lat);
    } catch {
      setSearchError('fetchError');
    } finally {
      setSearching(false);
    }
  }

  async function handleSuggestionSelect(s: GeocodeSuggestion) {
    if (searching) return;
    setSearching(true);
    setSearchError(null);
    try {
      await applyVicPlan(s.displayName, s.lon, s.lat);
    } catch {
      setSearchError('fetchError');
    } finally {
      setSearching(false);
    }
  }

  async function searchAddressDirect(address: string) {
    if (searching) return;
    setQuery(address);
    setSearching(true);
    setSearchError(null);
    try {
      const geo = await geocodeAddress(address);
      if (!geo) {
        setSearchError('notFound');
        return;
      }
      await applyVicPlan(geo.result.displayName, geo.result.lon, geo.result.lat);
    } catch {
      setSearchError('fetchError');
    } finally {
      setSearching(false);
    }
  }

  async function useCurrentLocation() {
    if (searching) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setSearchError('locationDenied');
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 60000,
        });
      });
      const { latitude, longitude } = pos.coords;
      const nearest = await reverseGeocodeNearest(longitude, latitude);
      if (!nearest) {
        setSearchError('locationError');
        return;
      }
      setQuery(nearest.result.displayName);
      await applyVicPlan(
        nearest.result.displayName,
        nearest.result.lon,
        nearest.result.lat,
      );
    } catch (e) {
      const code =
        typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        typeof (e as { code: unknown }).code === 'number'
          ? (e as { code: number }).code
          : null;
      // GeolocationPositionError.PERMISSION_DENIED === 1
      setSearchError(code === 1 ? 'locationDenied' : 'locationError');
    } finally {
      setSearching(false);
    }
  }

  const scenario = useMemo(
    () =>
      computeScenario({
        buildCostAud: scenarioBuildCost + (isFlood ? FLOOD_PREMIUM_AUD : 0),
        expectedWeeklyRentAud: scenarioWeeklyRent,
        dwellings: scenarioDwellings,
      }),
    [scenarioBuildCost, scenarioWeeklyRent, scenarioDwellings, isFlood],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMapTool('pan');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!live) {
      setSchools(null);
      setChildcare(null);
      setCensus(null);
      setBurglary(null);
      return;
    }
    // Clear immediately so the previous site's results (e.g. seeded Noble
    // Park entries) do not linger in the UI while the new fetch runs.
    // `null` triggers the loading state in the Education card.
    setSchools(null);
    setChildcare(null);
    let cancelled = false;
    fetchNearbyPlaces(live.lat, live.lon, 'school').then((s) => {
      if (!cancelled) setSchools(s);
    });
    fetchNearbyPlaces(live.lat, live.lon, 'child_care').then((c) => {
      if (!cancelled) setChildcare(c);
    });
    const postcode = extractPostcode(live.displayName);
    setBurglary(postcode ? fetchBurglaryStats(postcode) : null);
    setCensus(fetchCensusForPostcode(postcode));
    return () => {
      cancelled = true;
    };
  }, [live?.lat, live?.lon, live?.displayName, live]);

  // Keep the SSD-tab lot-size slider reactive to the cadastral figure
  // surfaced in Tab 1. Whenever the resolved area updates (Vicmap parcel
  // calc, Domain area, or a verified override) the slider snaps to the
  // authoritative value rather than carrying over a stale manual entry.
  useEffect(() => {
    if (live?.area.valueM2 != null) {
      setLotSize(live.area.valueM2);
    }
  }, [live?.area.valueM2]);

  // Auto-pin the ROI calculator's weekly-rent input to the census-derived
  // suggestion whenever a new postcode resolves. High-income postcodes
  // ($1,500/wk+ median household income — Ivanhoe 3079, Mentone 3194,
  // Glen Iris 3146 etc.) snap to $550/wk, the floor of the premium 1BR
  // market. Standard postcodes snap to $480/wk. Manual edits made
  // afterwards stick until the next address change.
  useEffect(() => {
    if (!census) return;
    const suggested =
      census.medianHouseholdIncomeWeekly > 1500 ? 550 : 480;
    setScenarioWeeklyRent(suggested);
  }, [census?.postcode, census?.medianHouseholdIncomeWeekly]);

  // Resync the develop-and-sell sale-price slider to the LGA-aware
  // default whenever a new address resolves. Manual scrubs stick until
  // the next address change. Stonnington gets $1.65M/unit, Greater
  // Dandenong $950k/unit (flagged as aspirational in the calculator
  // module — real submarket median is closer to $720–820k), other
  // LGAs fall back to a $1.1M state-wide baseline.
  useEffect(() => {
    setProfitSalePerUnit(defaultSalePriceForLga(live?.lga?.name ?? null));
  }, [live?.lga?.name]);

  // Hydrate the portfolio from localStorage on first client render.
  // Reading inside useEffect (not at render time) prevents the Next.js
  // SSR hydration mismatch — the server returns an empty list, and the
  // client paints saved entries immediately after mount.
  useEffect(() => {
    setSavedProperties(getSavedProperties());
  }, []);

  function handleSavePortfolio() {
    if (!live) return;
    const zoneCode = live.vicPlan.zoneCode ?? null;
    const yieldNow = computeYieldScenarios(lotSize, zoneCode ?? '').townhouse
      .dwellings;
    saveProperty({
      address: live.displayName,
      zone: zoneCode,
      savedYield: yieldNow,
      lotSize,
      lon: live.lon,
      lat: live.lat,
      spi: live.spi ?? null,
    });
    setSavedProperties(getSavedProperties());
    setJustSaved(true);
    // 2-second toast — same idiom used elsewhere (see showLinkCopied).
    window.setTimeout(() => setJustSaved(false), 2000);
  }

  function handleDeletePortfolio(id: string) {
    setSavedProperties(deleteProperty(id));
  }

  async function handleRestorePortfolio(record: SavedProperty) {
    setRestoredSnapshot(record);
    await searchAddressDirect(record.address);
  }

  const profitDwellings = live
    ? computeYieldScenarios(lotSize, live.vicPlan.zoneCode ?? '').townhouse
        .dwellings
    : 0;
  const profitMetrics = useMemo(
    () =>
      computeProfitMetrics({
        dwellings: profitDwellings,
        constructionCostPerUnit: profitConstructionPerUnit,
        salePricePerUnit: profitSalePerUnit,
        sitePurchaseCost:
          live?.price.valueAud ?? PROFIT_DEFAULTS.sitePurchaseCost,
        softCostFraction: PROFIT_DEFAULTS.softCostFraction,
      }),
    [
      profitDwellings,
      profitConstructionPerUnit,
      profitSalePerUnit,
      live?.price.valueAud,
    ],
  );

  const gfaExceeded = gfa > SSD_MAX_GFA_M2;

  const advice = generateConsultantAdvice({
    zoneCode: live?.vicPlan.zoneCode ?? null,
    overlays: activeOverlays,
    overlayRaw: live?.vicPlan.overlayRaw ?? [],
    ssdStatus: result.status,
    dpuIntent,
    gfaExceeded,
  });

  const [generatedAt, setGeneratedAt] = useState(() => new Date());
  const [printing, setPrinting] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [reportTier, setReportTier] = useState<'basic' | 'premium'>('premium');

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'SimplySite — 2026 SSD Feasibility Report',
    onBeforePrint: async () => {
      setPrinting(true);
      setGeneratedAt(new Date());
      if (live) {
        try {
          const snapshot = await mapPreviewRef.current?.getSnapshot();
          setMapSnapshot(snapshot ?? null);
        } catch (e) {
          console.warn('[print] map snapshot failed', e);
        }
      }
      // Allow React to commit the new state into the hidden print subtree
      // before react-to-print clones it into the iframe.
      await new Promise((r) => setTimeout(r, 120));
    },
    onAfterPrint: () => setPrinting(false),
    onPrintError: () => setPrinting(false),
  });

  const sourceLabel =
    source === 'live'
      ? `${t('source')} · ${t('sourceLive')}`
      : `${t('source')} · ${t('sourceMock')}`;

  const zoneLine = live?.vicPlan.zoneCode
    ? live.vicPlan.zoneDescription
      ? `${live.vicPlan.zoneDescription} (${live.vicPlan.zoneCode})`
      : live.vicPlan.zoneCode
    : null;

  const overlayLine =
    live && live.vicPlan.overlayRaw.length > 0
      ? live.vicPlan.overlayRaw.join(', ')
      : null;

  const reportYieldScenarios = live
    ? computeYieldScenarios(lotSize, live.vicPlan.zoneCode ?? '')
    : null;

  const reportFrontageRaw = live?.polygon
    ? calculateFrontage(live.polygon)
    : null;
  const reportFrontageM =
    reportFrontageRaw != null ? Math.round(reportFrontageRaw) : null;
  const reportOrientationRaw = live?.polygon
    ? detectOrientation(live.polygon)
    : null;
  const reportOrientation =
    reportOrientationRaw && reportOrientationRaw !== 'Unknown'
      ? reportOrientationRaw
      : null;

  const reportData: PrintReportData = {
    tier: reportTier,
    generatedAt,
    address: { displayName: live?.displayName ?? null, sourceLabel },
    mapSnapshot,
    planning: { zoneLine, overlayLine, spi: live?.spi ?? null },
    inputs: { lotSize, gfa },
    propertyMetrics: {
      frontageM: reportFrontageM,
      orientation: reportOrientation,
    },
    yieldScenarios: reportYieldScenarios,
    assessment: {
      status: result.status,
      statusLabel: pick(STATUS_LABELS[result.status], lang),
      reasons: result.reasons.map((r) => pick(r, lang)),
      gfaWarning: gfaExceeded ? t('gfaWarning') : null,
    },
    serviceRequirements: {
      gasBanLabel: t('srGasBanLabel'),
      gasBanBody: t('noticeElectric'),
      energyLabel: t('srEnergyLabel'),
      energyBody: t('srEnergyDetail'),
    },
    advice: pick(advice, lang),
    notices: { dpu: t('noticeDpu') },
    constraints: {
      easementWarning: easementPresent ? t('easementWarning') : null,
      tpzNote:
        treeDbhMm > 0
          ? lang === 'en'
            ? `Significant tree with ${treeDbhMm} mm diameter. TPZ radius: ${tpzRadiusM(treeDbhMm).toFixed(2)} m (AS 4970-2009, clause 3.2; clamped 2–15 m).`
            : `重要树木直径 ${treeDbhMm} mm。TPZ 半径:${tpzRadiusM(treeDbhMm).toFixed(2)} 米(AS 4970-2009 第 3.2 条;限值 2–15 m)。`
          : null,
    },
    specialNotes: architectNotes.trim().length > 0 ? architectNotes : null,
    council: live?.lga
      ? {
          name: live.lga.name,
          nameZh: live.lga.nameZh,
          phone: live.lga.phone,
          email: live.lga.email,
          website: live.lga.website,
        }
      : null,
    verdict: effectiveVerdict
      ? { status: effectiveVerdict.status, label: pick(effectiveVerdict.label, lang) }
      : null,
    executiveSummary: scenario
      ? {
          title: t('execSummary'),
          buildCost: scenarioBuildCost,
          weeklyRent: scenarioWeeklyRent,
          dwellings: scenarioDwellings,
          totalAnnualRent: scenario.totalAnnualRentAud,
          paybackYears: scenario.simplePaybackYears,
          grossYieldPct: scenario.grossYieldPct,
          narrative: pick(scenario.narrative, lang),
        }
      : null,
    schools: schools
      ? schools.map((s) => ({
          name: s.name,
          typeLabel: placeTypeLabel(s, lang),
          distanceM: s.distanceM,
        }))
      : null,
    childcare: childcare
      ? childcare.map((c) => ({
          name: c.name,
          typeLabel: placeTypeLabel(c, lang),
          distanceM: c.distanceM,
        }))
      : null,
    demographics: census
      ? {
          postcode: census.postcode,
          medianIncomeWeekly: census.medianHouseholdIncomeWeekly,
          medianAge: census.medianAge,
          population: census.population,
        }
      : null,
    disclaimer: { en: T.disclaimer.en, zh: T.disclaimer.zh },
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex-shrink-0 border-b border-zinc-200 dark:border-zinc-900">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Logo size={16} />
            <span className="text-sm font-semibold tracking-tight">{t('brand')}</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowPricing((v) => !v)}
              aria-expanded={showPricing}
              aria-controls="pricing-banner"
              className={`text-xs font-medium uppercase tracking-[0.18em] transition-colors ${
                showPricing
                  ? 'text-[#241F21] dark:text-[#E9E778]'
                  : 'text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50'
              }`}
            >
              {lang === 'en' ? 'Pricing' : '定价'}
            </button>
            {live && (
              <button
                type="button"
                onClick={() => setPresentationMode(!presentationMode)}
                className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-700 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
                title={t('presentationModeHint')}
              >
                {presentationMode ? '✕' : '⛶'}
              </button>
            )}
            <LanguageToggle lang={lang} onChange={setLang} />
          </div>
        </div>
        {showPricing && (
          <div id="pricing-banner">
            <PricingBanner
              lang={lang}
              address={live?.displayName ?? null}
              spi={live?.spi ?? null}
              onClose={() => setShowPricing(false)}
            />
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-[550px] flex-shrink-0 flex-col overflow-y-auto border-r border-zinc-300 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="min-w-0 px-6 py-6">
          <div className="border-b border-zinc-200 px-4 pb-4 pt-2 dark:border-zinc-800/50">
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {t('eyebrow')}
            </p>
            <h1 className="whitespace-nowrap text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-200">
              {t('title')}
            </h1>
          </div>

        {!live && (
          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
              {lang === 'en' ? 'Victoria Property Intelligence Portal' : '维多利亚州物业情报门户'}
            </p>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              {lang === 'en'
                ? 'Search any Victorian address above to load planning data, cadastral parcels, and feasibility analytics — or explore a sample lot below.'
                : '在上方搜索维州任意地址以加载规划数据、地籍信息和可行性分析,或点击下方样例地块快速体验。'}
            </p>

            <div className="mt-6 space-y-2">
              <div className="border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/30">
                <p className="text-xs font-semibold tracking-tight text-zinc-900 dark:text-zinc-200">
                  {lang === 'en' ? 'Instant Spatial Mapping' : '即时空间制图'}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {lang === 'en'
                    ? 'Scans Vicmap and the Victoria Planning Provisions to trace cadastral boundaries and lot labels automatically.'
                    : '调用 Vicmap 与维多利亚州规划条款,自动绘制地籍边界与地块编号。'}
                </p>
              </div>
              <div className="border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/30">
                <p className="text-xs font-semibold tracking-tight text-zinc-900 dark:text-zinc-200">
                  {lang === 'en' ? 'Automated Site Yields' : '自动化产出测算'}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {lang === 'en'
                    ? 'Indicative Clause 55 townhouse capacity and mandatory garden area, computed from lot area and zone.'
                    : '依据地块面积与分区,自动测算 Clause 55 联排住宅产出与强制性花园面积。'}
                </p>
              </div>
              <div className="border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/30">
                <p className="text-xs font-semibold tracking-tight text-zinc-900 dark:text-zinc-200">
                  {lang === 'en' ? 'Bilingual PDF Exports' : '双语 PDF 导出'}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {lang === 'en'
                    ? 'Architectural-grade A4 briefs in English or 简体中文, including a bilingual statutory glossary page.'
                    : '建筑级 A4 简报,英文或简体中文,含法定术语双语对照页。'}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {lang === 'en' ? 'Explore a Demo Lot' : '体验样例地块'}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => searchAddressDirect('62 Chandler Road, Noble Park VIC 3174')}
                  disabled={searching}
                  className="cursor-pointer border border-zinc-300 bg-white px-3 py-2 text-center text-xs font-medium text-zinc-700 transition-all hover:border-zinc-950 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {lang === 'en'
                    ? 'Residential Feasibility (Noble Park)'
                    : '住宅可行性(Noble Park)'}
                </button>
                <button
                  type="button"
                  onClick={() => searchAddressDirect('2006 Malvern Road, Malvern East VIC 3145')}
                  disabled={searching}
                  className="cursor-pointer border border-zinc-300 bg-white px-3 py-2 text-center text-xs font-medium text-zinc-700 transition-all hover:border-zinc-950 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {lang === 'en'
                    ? 'Commercial Scheme (Malvern East)'
                    : '商业方案(Malvern East)'}
                </button>
              </div>
            </div>

            {/* Portfolio grid — populated in a useEffect on mount, so the
                server render is always empty and we never trigger a
                hydration mismatch. Clicking a card calls
                handleRestorePortfolio, which sets the snapshot reference
                and re-runs the address search. */}
            <div className="mt-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {t('portfolioHeading')}
              </p>
              {savedProperties.length === 0 ? (
                <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
                  {t('portfolioEmpty')}
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {savedProperties.map((p) => {
                    const savedDate = (() => {
                      try {
                        return new Date(p.savedAt).toLocaleDateString(
                          lang === 'zh' ? 'zh-CN' : 'en-AU',
                          { year: 'numeric', month: 'short', day: 'numeric' },
                        );
                      } catch {
                        return p.savedAt.slice(0, 10);
                      }
                    })();
                    return (
                      <li
                        key={p.id}
                        className="group flex items-start gap-2 border border-zinc-300 bg-white p-3 transition-all hover:border-zinc-950 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-100"
                      >
                        <button
                          type="button"
                          onClick={() => handleRestorePortfolio(p)}
                          disabled={searching}
                          className="flex-1 cursor-pointer text-left disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`${t('portfolioRestore')} · ${p.address}`}
                        >
                          <p className="text-xs font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
                            {p.address}
                          </p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                            {t('portfolioSavedAt')} · {savedDate}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {p.zone && (
                              <span className="inline-flex items-center border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                {p.zone}
                              </span>
                            )}
                            <span className="inline-flex items-center border border-[#E9E778]/60 bg-[#E9E778]/[0.08] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-[#241F21] dark:text-[#E9E778]">
                              {p.savedYield} {t('portfolioUnits')}
                            </span>
                            <span className="font-mono text-[10px] tabular-nums text-zinc-500">
                              · {p.lotSize} m²
                            </span>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePortfolio(p.id)}
                          className="shrink-0 cursor-pointer p-1 text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                          aria-label={`${t('portfolioDelete')} · ${p.address}`}
                          title={t('portfolioDelete')}
                        >
                          <Trash2 aria-hidden className="size-3.5" strokeWidth={1.75} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {live && (
        <nav className="mt-10 flex w-full flex-row items-center justify-between gap-2 border-b border-zinc-300 pb-2 dark:border-zinc-800" role="tablist">
          {(['overview', 'ssd', 'profit', 'reports'] as const).map((id) => {
            const labels: Record<TabId, string> = {
              overview: t('tabOverview'),
              ssd: t('tabSsd'),
              profit: t('tabProfit'),
              reports: t('tabReports'),
            };
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                onClick={() => setActiveTab(id)}
                aria-selected={active}
                className={`-mb-2.5 flex-1 whitespace-nowrap border-b-2 px-1 py-3 text-center text-xs font-medium uppercase tracking-wider transition-colors ${
                  active
                    ? 'border-[#E9E778] text-zinc-950 dark:text-zinc-50'
                    : 'border-transparent text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {labels[id]}
              </button>
            );
          })}
        </nav>
        )}

        {live && activeTab === 'overview' && (
        <Section number="01" title={t('propertyDetailsLabel')}>
          <div className="pt-6">
            {/* Save to Project Portfolio — placed at the top of the
                overview so it's the first interactive element after the
                tabs nav. Toast feedback flips the icon + label for 2s
                via the justSaved state. */}
            <button
              type="button"
              onClick={handleSavePortfolio}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-xs font-medium text-zinc-700 transition-all hover:border-zinc-700 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
              aria-label={t('saveToPortfolio')}
            >
              {justSaved ? (
                <>
                  <Check aria-hidden className="size-3.5" strokeWidth={2} />
                  {t('saveToPortfolioSaved')}
                </>
              ) : (
                <>
                  <FolderPlus aria-hidden className="size-3.5" strokeWidth={1.75} />
                  {t('saveToPortfolio')}
                </>
              )}
            </button>
            {live && !searchError && (
              <div className="mt-6 space-y-3 text-sm">
                {/* Street View thumbnail — live Google Static Street View
                    when NEXT_PUBLIC_GOOGLE_MAPS_KEY is configured, otherwise
                    a clean architectural placeholder. Anchors the card so
                    the architect / vendor sees frontage context before
                    digging into the planning data. */}
                {(() => {
                  const sv = getStreetViewUrl(live.lat, live.lon);
                  return (
                    <div className="mb-4 overflow-hidden border border-zinc-300 dark:border-zinc-800">
                      <div className="flex items-baseline justify-between border-b border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-700 dark:text-zinc-300">
                          {lang === 'en' ? 'Frontage · Street View' : '街景 · 临街立面'}
                        </p>
                        <SourceBadge
                          source={
                            sv.isDemoData
                              ? lang === 'en' ? 'Verification Pending' : '核实进行中'
                              : lang === 'en' ? 'Source: Google Street View' : '来源:Google 街景'
                          }
                          fallback={sv.isDemoData}
                        />
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sv.url}
                        alt={
                          lang === 'en'
                            ? `Street View of ${live.displayName}`
                            : `${live.displayName} 街景`
                        }
                        className="block h-48 w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  );
                })()}
                {live.domain && (
                  <div className="mb-4 border border-zinc-300 dark:border-zinc-800">
                    {live.price.valueAud ? (
                      <div className="flex items-baseline justify-between gap-4 border-b border-zinc-200 bg-[#241F21] px-5 py-4 dark:border-zinc-800">
                        <div>
                          <div className="flex items-baseline gap-3">
                            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400">
                              {t('lastSoldHeadline')}
                            </p>
                            <SourceBadge source={priceSourceLabel(live.price.source, lang)} fallback={live.price.source === 'tbc'} />
                          </div>
                          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-[#E9E778]">
                            ${live.price.valueAud.toLocaleString('en-AU')}
                          </p>
                        </div>
                        {live.price.date && (
                          <span className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-300">
                            {live.price.date}
                          </span>
                        )}
                      </div>
                    ) : census ? (
                      <div className="border-b border-zinc-200 bg-[#241F21] px-5 py-4 dark:border-zinc-800">
                        <div className="flex items-baseline gap-3">
                          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400">
                            {lang === 'en'
                              ? 'Indicative Sub-Market Estimate'
                              : '次级市场参考估算'}
                          </p>
                          <SourceBadge
                            source={
                              lang === 'en'
                                ? 'Source: ABS Census 2021'
                                : '来源:ABS 2021 人口普查'
                            }
                            fallback
                          />
                        </div>
                        <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#E9E778]">
                          ${census.medianHouseholdIncomeWeekly.toLocaleString('en-AU')}
                          <span className="ml-2 font-sans text-xs font-normal uppercase tracking-[0.18em] text-zinc-400">
                            {lang === 'en' ? '/ week median' : '/ 周中位数'}
                          </span>
                        </p>
                        <p className="mt-2 text-[10px] leading-relaxed text-zinc-400">
                          {lang === 'en'
                            ? `Postcode ${census.postcode} household-income median. Indicative sub-market signal only — not a property valuation. Verified sale data unavailable for this address.`
                            : `邮编 ${census.postcode} 家庭收入中位数。仅作次级市场参考信号 — 非物业估值。本地址暂无核实成交记录。`}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-baseline justify-between gap-4 border-b border-zinc-200 bg-[#241F21] px-5 py-4 dark:border-zinc-800">
                        <div>
                          <div className="flex items-baseline gap-3">
                            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400">
                              {t('lastSoldHeadline')}
                            </p>
                            <SourceBadge source={priceSourceLabel('tbc', lang)} fallback />
                          </div>
                          <p
                            className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#E9E778]"
                            title={t('verificationTooltip')}
                          >
                            {lang === 'en' ? 'Verification Pending' : '核实进行中'}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="px-5 py-4">
                      <dl className="mt-1 grid gap-x-4 gap-y-3 text-xs [grid-template-columns:repeat(auto-fit,minmax(9rem,1fr))] [&>div]:min-w-0 [&_dd]:whitespace-nowrap">
                        <div>
                          <dt className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                            {t('bedroomsLabel')}
                          </dt>
                          <dd className="mt-1 font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                            {live.domain.bedrooms ?? <span className="text-zinc-400">—</span>}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                            {t('bathroomsLabel')}
                          </dt>
                          <dd className="mt-1 font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                            {live.domain.bathrooms ?? <span className="text-zinc-400">—</span>}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                            {t('carSpacesLabel')}
                          </dt>
                          <dd className="mt-1 font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                            {live.domain.carSpaces ?? <span className="text-zinc-400">—</span>}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                            {t('floorAreaLabel')}
                          </dt>
                          <dd className="mt-1 font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                            {live.domain.floorAreaM2 != null ? (
                              <>{live.domain.floorAreaM2} m²</>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                            {t('yearBuiltLabel')}
                          </dt>
                          <dd className="mt-1 font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                            {live.domain.yearBuilt ?? <span className="text-zinc-400">—</span>}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                            {t('wallMaterialLabel')}
                          </dt>
                          <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
                            {live.domain.wallMaterial ?? <span className="text-zinc-400">—</span>}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                            {t('roofMaterialLabel')}
                          </dt>
                          <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
                            {live.domain.roofMaterial ?? <span className="text-zinc-400">—</span>}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                )}

                {/* Card 1 — Planning Information */}
                <div className="mt-4 border border-zinc-300 dark:border-zinc-800">
                  <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-700 dark:text-zinc-300">
                      {t('planningInfoLabel')}
                    </p>
                  </div>
                  <dl className="grid gap-x-6 gap-y-3 px-5 py-4 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                        {t('zone')}
                      </dt>
                      <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
                        {live.vicPlan.zoneCode ? (
                          <span className="text-[#E9E778]">
                            {live.vicPlan.zoneDescription
                              ? `${live.vicPlan.zoneDescription} (${live.vicPlan.zoneCode})`
                              : live.vicPlan.zoneCode}
                          </span>
                        ) : (
                          <span className="text-[#E9E778]" title={t('verificationTooltip')}>{t('tbcSiteVisit')}</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                        {t('overlays')}
                      </dt>
                      <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
                        {live.vicPlan.overlayRaw.length > 0
                          ? live.vicPlan.overlayRaw.join(', ')
                          : <span className="text-zinc-400">—</span>}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                        {t('lotSize')}
                      </dt>
                      <dd className="mt-1 flex items-baseline gap-3">
                        {live.area.valueM2 != null ? (
                          <>
                            <span className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                              {live.area.valueM2} m²
                            </span>
                            <SourceBadge source={areaSourceLabel(live.area.source, lang)} fallback={live.area.source === 'tbc'} />
                          </>
                        ) : (
                          <>
                            <span
                              className="font-mono tabular-nums text-[#E9E778]"
                              title={t('verificationTooltip')}
                            >
                              {t('tbcSiteVisit')}
                            </span>
                            <SourceBadge source={areaSourceLabel('tbc', lang)} fallback />
                          </>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Card 2 — Site Characteristics */}
                <div className="mt-4 border border-zinc-300 dark:border-zinc-800">
                  <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-700 dark:text-zinc-300">
                      {lang === 'en' ? 'Site Characteristics' : '场地特征'}
                    </p>
                  </div>
                  <dl className="px-5 py-2">
                    {(() => {
                      const frontageVal =
                        reportFrontageRaw != null
                          ? `${reportFrontageRaw.toFixed(1)}m`
                          : lang === 'en'
                            ? 'Awaiting verification'
                            : '待核实';
                      const orientationVal = reportOrientation
                        ? lang === 'en'
                          ? `${reportOrientation}-Facing`
                          : `${reportOrientation === 'North' ? '朝北' : reportOrientation === 'South' ? '朝南' : reportOrientation === 'East' ? '朝东' : reportOrientation === 'West' ? '朝西' : reportOrientation}`
                        : lang === 'en'
                          ? 'Calculated from boundaries'
                          : '由边界推算';
                      const topographyVal =
                        lang === 'en'
                          ? 'Generally Level / Clear Grade'
                          : '总体平整 / 坡度清晰';
                      const rows: { labelEn: string; labelZh: string; value: string }[] = [
                        {
                          labelEn: 'Lot Frontage Width',
                          labelZh: '地块临街宽度',
                          value: frontageVal,
                        },
                        {
                          labelEn: 'Primary Aspect / Orientation',
                          labelZh: '主朝向 / 立面方位',
                          value: orientationVal,
                        },
                        {
                          labelEn: 'Topography',
                          labelZh: '地形',
                          value: topographyVal,
                        },
                      ];
                      return rows.map((row, i) => (
                        <div
                          key={row.labelEn}
                          className={`flex items-center justify-between gap-4 py-3 text-xs ${
                            i < rows.length - 1
                              ? 'border-b border-zinc-200 dark:border-zinc-800/60'
                              : ''
                          }`}
                        >
                          <dt className="text-zinc-500 font-medium uppercase tracking-[0.16em]">
                            {lang === 'en' ? row.labelEn : row.labelZh}
                          </dt>
                          <dd className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-zinc-200">
                            {row.value}
                          </dd>
                        </div>
                      ));
                    })()}
                  </dl>
                </div>

                {/* Card 2 — Hazards */}
                <div className="mt-4 border border-zinc-300 dark:border-zinc-800">
                  <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-700 dark:text-zinc-300">
                      {t('hazardsLabel')}
                    </p>
                  </div>
                  <dl className="grid gap-x-6 gap-y-3 px-5 py-4 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                        {t('bushfireHazardLabel')}
                      </dt>
                      <dd className="mt-1">
                        {live.vicPlan.overlayCodes.includes('BMO') ? (
                          <span className="font-semibold text-[#241F21] dark:text-[#E9E778]">
                            ● {t('hazardDetected')}
                          </span>
                        ) : (
                          <span className="text-zinc-500">○ {t('hazardNoneDetected')}</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                        {t('floodHazardLabel')}
                      </dt>
                      <dd className="mt-1">
                        {isFlood ? (
                          <span className="font-semibold text-[#241F21] dark:text-[#E9E778]">
                            ● {t('hazardDetected')}
                          </span>
                        ) : (
                          <span className="text-zinc-500">○ {t('hazardNoneDetected')}</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Card 3 — Council Information */}
                {(() => {
                  const postcode = extractPostcode(live.displayName);
                  const curated = live.lga ?? findLgaByPostcode(postcode);
                  const rawName = live.councilName;
                  const titleCaseName = rawName
                    ? rawName
                        .toLowerCase()
                        .replace(/\b([a-z])/g, (_, c: string) => c.toUpperCase())
                    : null;
                  const sourceBadge = live.lga
                    ? (lang === 'en' ? 'Source: Vicmap_Admin' : '来源:Vicmap_Admin')
                    : curated
                      ? (lang === 'en' ? 'Source: Postcode Directory' : '来源:邮编目录')
                      : rawName
                        ? (lang === 'en' ? 'Source: Vicmap_Admin · Contacts pending' : '来源:Vicmap_Admin · 联系信息待补')
                        : null;
                  return (
                    <div className="mt-4 border border-zinc-300 dark:border-zinc-800">
                      <div className="flex items-baseline justify-between border-b border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-700 dark:text-zinc-300">
                          {t('councilInfoLabel')}
                        </p>
                        {sourceBadge && (
                          <SourceBadge source={sourceBadge} fallback={!curated} />
                        )}
                      </div>
                      <div className="px-5 py-4 text-xs">
                        {curated ? (
                          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <dt className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                                {t('councilInfoLabel')}
                              </dt>
                              <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
                                {lang === 'zh' && curated.nameZh ? curated.nameZh : curated.name}
                              </dd>
                            </div>
                            {curated.phone && (
                              <div>
                                <dt className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                                  Phone
                                </dt>
                                <dd className="mt-1 font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                                  {curated.phone}
                                </dd>
                              </div>
                            )}
                            {curated.email && (
                              <div>
                                <dt className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                                  Email
                                </dt>
                                <dd className="mt-1 break-all text-zinc-900 dark:text-zinc-100">
                                  {curated.email}
                                </dd>
                              </div>
                            )}
                            <div className="sm:col-span-2">
                              <dt className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                                Website
                              </dt>
                              <dd className="mt-1">
                                <a
                                  href={curated.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="break-all text-[#241F21] underline-offset-4 hover:underline dark:text-[#E9E778]"
                                >
                                  {curated.website}
                                </a>
                              </dd>
                            </div>
                          </dl>
                        ) : titleCaseName ? (
                          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-1">
                            <div>
                              <dt className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                                {t('councilInfoLabel')}
                              </dt>
                              <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
                                {titleCaseName}
                              </dd>
                            </div>
                          </dl>
                        ) : (
                          <p className="text-zinc-400">—</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Card 4 — Education (Schools & Childcare) */}
                <div className="mt-4 border border-zinc-300 dark:border-zinc-800">
                  <div className="flex items-baseline justify-between border-b border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-700 dark:text-zinc-300">
                      {t('schoolInfoLabel')}
                    </p>
                    <div role="tablist" className="flex items-baseline gap-3 text-[10px] font-medium uppercase tracking-[0.18em]">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={educationTab === 'schools'}
                        onClick={() => setEducationTab('schools')}
                        className={`transition-colors ${
                          educationTab === 'schools'
                            ? 'text-[#241F21] underline decoration-[#E9E778] decoration-2 underline-offset-4 dark:text-[#E9E778]'
                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                        }`}
                      >
                        {t('educationTabSchools')}
                      </button>
                      <span aria-hidden className="text-zinc-300 dark:text-zinc-700">·</span>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={educationTab === 'childcare'}
                        onClick={() => setEducationTab('childcare')}
                        className={`transition-colors ${
                          educationTab === 'childcare'
                            ? 'text-[#241F21] underline decoration-[#E9E778] decoration-2 underline-offset-4 dark:text-[#E9E778]'
                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                        }`}
                      >
                        {t('educationTabChildcare')}
                      </button>
                    </div>
                  </div>
                  <div className="px-5 py-4 text-xs">
                    {educationTab === 'schools' && (
                      schools === null ? (
                        <p className="text-zinc-500">{t('childcareLoading')}</p>
                      ) : schools.length === 0 ? (
                        <p className="text-[#E9E778]" title={t('verificationTooltip')}>
                          {t('childcareNone')}
                        </p>
                      ) : (
                        <>
                          <ul className="space-y-1.5">
                            {schools.map((s) => (
                              <li key={`${s.name}-${s.distanceM}`} className="flex items-baseline justify-between gap-3">
                                <span className="text-zinc-900 dark:text-zinc-100">{s.name}</span>
                                <span className="flex items-baseline gap-3 whitespace-nowrap text-zinc-500">
                                  <span className="text-[10px] uppercase tracking-[0.14em]">{placeTypeLabel(s, lang)}</span>
                                  <span className="font-mono tabular-nums">{(s.distanceM / 1000).toFixed(2)} km</span>
                                </span>
                              </li>
                            ))}
                          </ul>
                          <p className="mt-4 text-[10px] leading-relaxed text-zinc-400">
                            {lang === 'en' ? 'Source: Google Places · 2 km radius' : '来源:Google Places · 2 公里范围'}
                          </p>
                        </>
                      )
                    )}
                    {educationTab === 'childcare' && (
                      childcare === null ? (
                        <p className="text-zinc-500">{t('childcareLoading')}</p>
                      ) : childcare.length === 0 ? (
                        <p className="text-[#E9E778]" title={t('verificationTooltip')}>
                          {t('childcareNone')}
                        </p>
                      ) : (
                        <>
                          <ul className="space-y-1.5">
                            {childcare.map((c) => (
                              <li key={`${c.name}-${c.distanceM}`} className="flex items-baseline justify-between gap-3">
                                <span className="text-zinc-900 dark:text-zinc-100">{c.name}</span>
                                <span className="flex items-baseline gap-3 whitespace-nowrap text-zinc-500">
                                  <span className="text-[10px] uppercase tracking-[0.14em]">{placeTypeLabel(c, lang)}</span>
                                  <span className="font-mono tabular-nums">{(c.distanceM / 1000).toFixed(2)} km</span>
                                </span>
                              </li>
                            ))}
                          </ul>
                          <p className="mt-4 text-[10px] leading-relaxed text-zinc-400">
                            {lang === 'en' ? 'Source: Google Places · 2 km radius' : '来源:Google Places · 2 公里范围'}
                          </p>
                        </>
                      )
                    )}
                  </div>
                </div>

                {/* Card 4b — Lifestyle & Demographics (ABS 2021 Census) */}
                {census && (
                  <div className="mt-4 border border-zinc-300 dark:border-zinc-800">
                    <div className="flex items-baseline justify-between border-b border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-700 dark:text-zinc-300">
                        {t('lifestyleDemographicsLabel')} · {census.postcode}
                      </p>
                      <SourceBadge
                        source={census.isCurated ? t('censusSourceCurated') : t('censusSourceFallback')}
                        fallback={!census.isCurated}
                      />
                    </div>
                    <div className="px-5 py-5 text-xs">
                      <div className="grid gap-5 sm:grid-cols-3">
                        <div>
                          <p className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                            {t('censusMedianIncomeLabel')}
                          </p>
                          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                            ${census.medianHouseholdIncomeWeekly.toLocaleString('en-AU')}
                            <span className="ml-2 text-xs font-normal text-zinc-500">
                              {t('censusWeekly')}
                            </span>
                          </p>
                          <div className="mt-3 h-1.5 w-full bg-zinc-100 dark:bg-zinc-900">
                            <div
                              className="h-full bg-[#E9E778]"
                              style={{
                                width: `${Math.min(100, Math.round((census.medianHouseholdIncomeWeekly / 3000) * 100))}%`,
                              }}
                              aria-hidden
                            />
                          </div>
                        </div>
                        <div>
                          <p className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                            {t('censusMedianAgeLabel')}
                          </p>
                          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                            {census.medianAge}
                            <span className="ml-2 text-xs font-normal text-zinc-500">
                              {lang === 'en' ? 'yrs' : '岁'}
                            </span>
                          </p>
                          <div className="mt-3 h-1.5 w-full bg-zinc-100 dark:bg-zinc-900">
                            <div
                              className="h-full bg-[#241F21] dark:bg-[#E9E778]"
                              style={{
                                width: `${Math.min(100, Math.round((census.medianAge / 60) * 100))}%`,
                              }}
                              aria-hidden
                            />
                          </div>
                        </div>
                        <div>
                          <p className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                            {t('censusPopulationLabel')}
                          </p>
                          {census.population != null ? (
                            <>
                              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                                {census.population.toLocaleString('en-AU')}
                                <span className="ml-2 text-xs font-normal text-zinc-500">
                                  {t('censusPersons')}
                                </span>
                              </p>
                              <div className="mt-3 h-1.5 w-full bg-zinc-100 dark:bg-zinc-900">
                                <div
                                  className="h-full bg-[#E9E778]"
                                  style={{
                                    width: `${Math.min(100, Math.round((census.population / 50000) * 100))}%`,
                                  }}
                                  aria-hidden
                                />
                              </div>
                            </>
                          ) : (
                            <p
                              className="mt-2 font-mono text-base text-[#E9E778]"
                              title={t('verificationTooltip')}
                            >
                              {t('tbcSiteVisit')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-6">
                        <p className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                          {t('censusHouseholdLabel')}
                        </p>
                        <div className="mt-3 flex items-center gap-5">
                          <HouseholdPie data={census.households} />
                          <ul className="flex-1 space-y-1.5 text-xs">
                            <li className="flex items-baseline justify-between gap-3">
                              <span className="flex items-baseline gap-2">
                                <span className="inline-block size-2.5 bg-[#E9E778]" aria-hidden />
                                <span className="text-zinc-900 dark:text-zinc-100">
                                  {t('censusHouseholdFamily')}
                                </span>
                              </span>
                              <span className="font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                                {census.households.family}%
                              </span>
                            </li>
                            <li className="flex items-baseline justify-between gap-3">
                              <span className="flex items-baseline gap-2">
                                <span className="inline-block size-2.5 bg-[#241F21] dark:bg-zinc-300" aria-hidden />
                                <span className="text-zinc-900 dark:text-zinc-100">
                                  {t('censusHouseholdLonePerson')}
                                </span>
                              </span>
                              <span className="font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                                {census.households.lonePerson}%
                              </span>
                            </li>
                            <li className="flex items-baseline justify-between gap-3">
                              <span className="flex items-baseline gap-2">
                                <span className="inline-block size-2.5 bg-zinc-300 dark:bg-zinc-600" aria-hidden />
                                <span className="text-zinc-900 dark:text-zinc-100">
                                  {t('censusHouseholdGroup')}
                                </span>
                              </span>
                              <span className="font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                                {census.households.groupOrOther}%
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card 5 — Lifestyle & Safety (RACV-style) */}
                <div className="mt-4 border border-zinc-300 dark:border-zinc-800">
                  <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-700 dark:text-zinc-300">
                      {t('lifestyleSafetyLabel')}
                    </p>
                  </div>
                  <div className="px-5 py-5 text-xs">
                    {burglary ? (
                      <div>
                        <p className="font-medium uppercase tracking-[0.16em] text-zinc-500">
                          {t('burglaryHeadline')} · {burglary.postcode}
                        </p>
                        <div className="mt-3 flex items-baseline gap-3">
                          <span className="font-mono text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                            1 in {burglary.ratioOneIn}
                          </span>
                          <span className="text-zinc-600 dark:text-zinc-400">
                            {t('burglaryUnit')}
                          </span>
                        </div>
                        <div
                          aria-hidden
                          className="mt-3 flex flex-wrap gap-1"
                          title={`1 of every ${burglary.ratioOneIn} homes`}
                        >
                          {Array.from({ length: 10 }).map((_, i) => (
                            <svg
                              key={i}
                              width="14"
                              height="14"
                              viewBox="0 0 16 16"
                              className="shrink-0"
                            >
                              <path
                                d="M8 1 L1 7 L3 7 L3 14 L13 14 L13 7 L15 7 Z"
                                fill={i === 0 ? '#F97316' : '#e4e4e7'}
                                stroke={i === 0 ? '#9a3412' : '#a1a1aa'}
                                strokeWidth="0.75"
                              />
                            </svg>
                          ))}
                        </div>
                        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                          {t('burglaryAverageNote')} ·{' '}
                          {burglary.category === 'Low'
                            ? t('burglayCategoryLow')
                            : burglary.category === 'Moderate'
                              ? t('burglayCategoryModerate')
                              : burglary.category === 'Elevated'
                                ? t('burglayCategoryElevated')
                                : t('burglayCategoryHigh')}
                        </p>
                        <p className="mt-3 text-[10px] leading-relaxed text-zinc-400">
                          {t('burglarySourceNote')}
                        </p>
                      </div>
                    ) : (
                      <p className="text-zinc-500">{t('postcodeUnknown')}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!live && !searchError && source === 'mock' && (
              <p className="mt-4 text-xs text-zinc-500">
                {t('source')} · {t('sourceMock')}
              </p>
            )}
          </div>
        </Section>
        )}

        {live && activeTab === 'ssd' && (
        <>
        {live && (() => {
          const yieldScenarios = computeYieldScenarios(
            lotSize,
            live.vicPlan.zoneCode ?? '',
          );
          const garden = yieldScenarios.gardenArea;
          const town = yieldScenarios.townhouse;
          const lux = yieldScenarios.luxurySingle;
          return (
          <Section
            number="02y"
            title={lang === 'en' ? 'Automated Yield & Feasibility' : '自动化产出与可行性测算'}
          >
            <p className="mt-6 text-xs leading-relaxed text-zinc-500">
              {lang === 'en'
                ? 'Indicative scenarios computed from lot area and zone. Every figure remains subject to a ResCode (Clause 55) / Clause 54 assessment by a registered architect.'
                : '基于地块面积与分区自动测算的指示性方案。所有数字仍须由注册建筑师按 ResCode(第 55 条)/ 第 54 条进行评估。'}
            </p>
            {/* Snapshot-vs-live yield alert. Fires only when the user
                restored a saved record AND the address matches AND the
                live townhouse yield differs from the snapshot. The
                snapshot reference is cleared when the active address
                drifts away from the saved one (different lot loaded). */}
            {restoredSnapshot &&
              restoredSnapshot.address === live.displayName &&
              restoredSnapshot.savedYield !== town.dwellings && (
                <div className="mt-6 border-2 border-[#E9E778] bg-[#E9E778]/[0.08] p-5 dark:bg-[#E9E778]/[0.06]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#241F21] dark:text-[#E9E778]">
                    {t('yieldDiscrepancyHeading')}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {t('yieldDiscrepancyBody')}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                        {t('yieldDiscrepancySaved')}
                      </p>
                      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                        {restoredSnapshot.savedYield}
                        <span className="ml-2 text-xs font-normal text-zinc-500">
                          {t('portfolioUnits')}
                        </span>
                      </p>
                      <p className="mt-1 font-mono text-[10px] tabular-nums text-zinc-500">
                        {(() => {
                          try {
                            return new Date(restoredSnapshot.savedAt)
                              .toISOString()
                              .slice(0, 10);
                          } catch {
                            return restoredSnapshot.savedAt.slice(0, 10);
                          }
                        })()}
                      </p>
                    </div>
                    <div className="border-2 border-[#E9E778] bg-[#E9E778]/[0.10] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#241F21] dark:text-[#E9E778]">
                        {t('yieldDiscrepancyLive')}
                      </p>
                      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#241F21] dark:text-[#E9E778]">
                        {town.dwellings}
                        <span className="ml-2 text-xs font-normal text-zinc-500">
                          {t('portfolioUnits')}
                        </span>
                      </p>
                      <p className="mt-1 font-mono text-[10px] tabular-nums text-zinc-500">
                        {new Date().toISOString().slice(0, 10)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            <div className="mt-6 flex flex-col gap-6 w-full px-4 py-2">
              {/* Section 1 — Development Potential (Townhouse Yield) */}
              <section className="border-b border-zinc-200 pb-6 last:border-0 dark:border-zinc-800/60">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  {lang === 'en' ? '01 · Development Potential' : '01 · 开发潜力'}
                </p>
                {town.mixedUseFlag ? (
                  <div className="mt-4">
                    <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                      {lang === 'en'
                        ? 'Mixed-Use Development Potential'
                        : '混合用途开发潜力'}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {town.mixedUseNote}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div className="md:w-1/3">
                      <p className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        {town.dwellings}{' '}
                        {town.dwellings === 1
                          ? lang === 'en' ? 'Dwelling' : '套住宅'
                          : lang === 'en' ? 'Dwellings' : '套住宅'}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
                        {lang === 'en'
                          ? 'Maximum Townhouse Yield'
                          : '最大联排住宅产出'}
                      </p>
                    </div>
                    {town.dwellings > 0 && (
                      <dl className="flex-1 md:max-w-md">
                        <div className="flex justify-between items-center py-2.5 border-b border-zinc-100 text-sm dark:border-zinc-900/40">
                          <dt className="text-zinc-600 dark:text-zinc-400">
                            {lang === 'en' ? 'Average Dwelling GFA' : '单套平均建筑面积'}
                          </dt>
                          <dd className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                            {town.averageDwellingGfaM2} m²
                          </dd>
                        </div>
                        <div className="flex justify-between items-center py-2.5 border-b border-zinc-100 text-sm dark:border-zinc-900/40">
                          <dt className="text-zinc-600 dark:text-zinc-400">
                            {lang === 'en' ? 'Zone Yield Divisor' : '分区产出系数'}
                          </dt>
                          <dd className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                            1 / {town.divisorM2PerDwelling} m²
                          </dd>
                        </div>
                        <div className="flex justify-between items-center py-2.5 border-b border-zinc-100 text-sm dark:border-zinc-900/40">
                          <dt className="text-zinc-600 dark:text-zinc-400">
                            {lang === 'en' ? 'Total Footprint' : '总占地面积'}
                          </dt>
                          <dd className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                            {town.totalFootprintM2} m²
                          </dd>
                        </div>
                      </dl>
                    )}
                  </div>
                )}
              </section>

              {/* Section 2 — Statutory Compliance (ResCode) */}
              <section className="border-b border-zinc-200 pb-6 last:border-0 dark:border-zinc-800/60">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  {lang === 'en' ? '02 · Statutory Compliance (ResCode)' : '02 · 法定合规 (ResCode)'}
                </p>
                <dl className="mt-4">
                  <div className="flex justify-between items-start py-2.5 border-b border-zinc-100 text-sm dark:border-zinc-900/40">
                    <div>
                      <dt className="text-zinc-600 dark:text-zinc-400">
                        {lang === 'en'
                          ? 'Maximum Site Coverage Cap'
                          : '最大场地覆盖率上限'}
                      </dt>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {lang === 'en'
                          ? 'Standard B8 / Clause 55.03-3'
                          : 'Standard B8 / Clause 55.03-3'}
                      </p>
                    </div>
                    <dd className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                      {Math.round(lux.siteCoverageCap * 100)}%
                    </dd>
                  </div>
                  <div className="flex justify-between items-start py-2.5 border-b border-zinc-100 text-sm dark:border-zinc-900/40">
                    <div>
                      <dt className="text-zinc-600 dark:text-zinc-400">
                        {lang === 'en'
                          ? 'Mandatory Garden Area Requirement'
                          : '强制性花园面积要求'}
                      </dt>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {lang === 'en'
                          ? 'Schedule to Clauses 32.08 / 32.09'
                          : 'Schedule to Clauses 32.08 / 32.09'}
                      </p>
                    </div>
                    <dd className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                      {garden.notApplicable
                        ? lang === 'en' ? 'N/A' : '不适用'
                        : garden.exempt
                          ? lang === 'en' ? 'Exempt' : '豁免'
                          : (
                              <>
                                {garden.requiredAreaM2} m²
                                <span className="ml-2 text-xs text-zinc-500">
                                  ({Math.round(garden.requiredFraction * 100)}%)
                                </span>
                              </>
                            )}
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Section 3 — Alternative Scenario (Single Luxury Dwelling) */}
              <section className="border-b border-zinc-200 pb-6 last:border-0 dark:border-zinc-800/60">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  {lang === 'en'
                    ? '03 · Alternative Scenario · Single Luxury Dwelling'
                    : '03 · 备选情景 · 单套豪华住宅'}
                </p>
                <dl className="mt-4">
                  <div className="flex justify-between items-center py-2.5 border-b border-zinc-100 text-sm dark:border-zinc-900/40">
                    <dt className="text-zinc-600 dark:text-zinc-400">
                      {lang === 'en' ? 'Indicative Maximum GFA' : '指示性最大建筑面积'}
                    </dt>
                    <dd className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                      {lux.maxBuildableGfaM2} m²
                    </dd>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-zinc-100 text-sm dark:border-zinc-900/40">
                    <dt className="text-zinc-600 dark:text-zinc-400">
                      {lang === 'en' ? 'Ground Floor Footprint' : '首层占地面积'}
                    </dt>
                    <dd className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                      {lux.groundFootprintM2} m²
                    </dd>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-zinc-100 text-sm dark:border-zinc-900/40">
                    <dt className="text-zinc-600 dark:text-zinc-400">
                      {lang === 'en' ? 'Assumed Storeys' : '假设楼层数'}
                    </dt>
                    <dd className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                      {lux.storeysAssumed}{' '}
                      {lang === 'en'
                        ? lux.storeysAssumed === 1 ? 'Storey' : 'Storeys'
                        : '层'}
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Footer — Regulatory Notes & Assumptions */}
              <div className="text-[11px] leading-relaxed text-zinc-500 mt-4 bg-zinc-50 dark:bg-zinc-900/20 p-3 rounded-lg border border-zinc-200 dark:border-zinc-900">
                <p className="font-semibold uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">
                  {lang === 'en'
                    ? 'Regulatory Notes & Assumptions'
                    : '监管说明与假设'}
                </p>
                <ul className="mt-2 space-y-1.5 list-disc pl-4">
                  <li>{town.citation}</li>
                  <li>{garden.citation}</li>
                  <li>{lux.citation}</li>
                  <li>
                    {lang === 'en'
                      ? 'All figures are indicative planner-side sanity checks; a ResCode (Clause 55) assessment, registered surveyor and town planner are required before relying on yield outcomes.'
                      : '所有数据仅为规划师层面的指示性参考;在依赖产出结论之前,须经 ResCode (Clause 55) 评估、注册测量师和城市规划师审核。'}
                  </li>
                </ul>
              </div>
            </div>
          </Section>
          );
        })()}

        {live && (
          <Section number="02a" title={t('complianceSummary')}>
            <div className="space-y-3 pt-8 text-sm">
              {effectiveVerdict && (
                <div
                  className={`mb-2 border-2 p-6 ${
                    effectiveVerdict.status === 'compliant'
                      ? 'border-[#E9E778] bg-[#E9E778]/15 dark:border-[#E9E778] dark:bg-[#E9E778]/10'
                      : 'border-zinc-700 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/40'
                  }`}
                >
                  <p
                    className={`text-xs font-medium uppercase tracking-[0.22em] ${
                      effectiveVerdict.status === 'compliant'
                        ? 'text-[#241F21] dark:text-[#E9E778]'
                        : 'text-zinc-900 dark:text-zinc-200'
                    }`}
                  >
                    {t('complianceSummary')}
                  </p>
                  <p
                    className={`mt-3 text-3xl font-semibold uppercase tracking-tight ${
                      effectiveVerdict.status === 'compliant'
                        ? 'text-[#241F21] dark:text-[#E9E778]'
                        : 'text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    {pick(effectiveVerdict.label, lang)}
                  </p>
                </div>
              )}
              {isHeritage && (
                <div className="mb-2 border border-zinc-700 bg-zinc-50/60 p-4 dark:border-zinc-500/50 dark:bg-zinc-900/40">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-900 dark:text-zinc-200">
                    {t('heritageTipLabel')}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-900 dark:text-zinc-100">
                    {t('heritageTip')}
                  </p>
                </div>
              )}
              {gatekeeper && (
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em]">
                  <span className="inline-flex items-center gap-2 border border-zinc-300 bg-zinc-200 px-3 py-1 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {t('propertyCategoryLabel')}
                    </span>
                    <span>{pick(PROPERTY_CATEGORY_LABEL[gatekeeper.category], lang)}</span>
                  </span>
                  <span className="text-zinc-500 normal-case tracking-normal">
                    {t('propertyCategorySource')}:{' '}
                    {gatekeeper.source === 'domain'
                      ? t('propertyCategorySourceDomain')
                      : gatekeeper.source === 'derived'
                        ? t('propertyCategorySourceDerived')
                        : t('propertyCategorySourceUnknown')}
                  </span>
                  <span className="text-zinc-500 normal-case tracking-normal">
                    · {t('dwellingCountLabel')}: {gatekeeper.dwellingCountEstimate}
                  </span>
                </div>
              )}
              {gatekeeper && !gatekeeper.ssdEligible && (
                <div className="border-2 border-red-600 bg-red-50 p-4 dark:border-red-500 dark:bg-red-950/20">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-800 dark:text-red-300">
                    {t('ssdRestrictedTitle')}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-red-900 dark:text-red-200">
                    {gatekeeper.ineligibilityReason === 'multipleDwellings'
                      ? t('ssdMultiDwelling')
                      : gatekeeper.ineligibilityReason === 'nonResidentialZone'
                        ? t('ssdNonResidential')
                        : t('ssdRestrictedBody')}
                  </p>
                </div>
              )}
              {gatekeeper &&
                gatekeeper.ssdEligible &&
                gatekeeper.ineligibilityReason === 'vacantLandNote' && (
                  <div className="border border-zinc-700 bg-zinc-50 p-4 dark:border-zinc-500/50 dark:bg-zinc-900/40">
                    <p className="text-sm leading-relaxed text-zinc-900 dark:text-zinc-100">
                      {t('ssdVacantLandNote')}
                    </p>
                  </div>
                )}
              {overlayOverride && (
                <div className="border border-zinc-700 bg-zinc-50 p-4 dark:border-zinc-500/50 dark:bg-zinc-900/40">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-900 dark:text-zinc-200">
                    {t('overlayOverrideTitle')} ·{' '}
                    {overlayOverride === 'HO+SBO' ? 'HO + SBO' : overlayOverride}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-900 dark:text-zinc-100">
                    {t('overlayOverrideBody')}
                  </p>
                </div>
              )}
              <div className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-900">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
                  {t('complianceChecklist')}
                </p>
                <ul className="mt-3 space-y-2.5">
                  {(['coverage', 'permeability', 'setback', 'pos'] as const)
                    .map((id) => resCodeChecks.find((c) => c.id === id))
                    .filter((c): c is NonNullable<typeof c> => c !== undefined)
                    .map((c) => {
                      const glyph = c.status === 'pass' ? '✅' : c.status === 'fail' ? '❌' : '⚠️';
                      const statusLabel =
                        c.status === 'pass'
                          ? t('resCodePass')
                          : c.status === 'fail'
                            ? t('resCodeFail')
                            : t('resCodeWarn');
                      return (
                        <li
                          key={c.id}
                          className="flex gap-3 border-b border-zinc-100 pb-2.5 last:border-b-0 dark:border-zinc-900"
                        >
                          <span aria-hidden className="mt-0.5 text-base leading-none">
                            {glyph}
                          </span>
                          <div className="flex-1 text-xs leading-relaxed">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                {pick(c.label, lang)}
                              </span>
                              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                                {statusLabel}
                              </span>
                            </div>
                            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                              {pick(c.detail, lang)}
                            </p>
                            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                              {c.clause}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </div>
              <div className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-900">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
                  {lang === 'en' ? 'Tree Canopy · Standard A2-6' : '树冠 · 标准 A2-6'}
                </p>
                <div className="mt-3 flex items-baseline justify-between gap-4 border border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-900 dark:text-zinc-100">
                      {lang === 'en' ? 'Trees required on lot' : '地块所需树木数量'}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                      {lang === 'en'
                        ? 'VC282 Clause 54.03-6 (A2-6) — minimum 1 canopy tree per 100 m² of site area for the new SSD lot.'
                        : 'VC282 第 54.03-6 条(A2-6)— 新建小型第二住宅地块每 100 m² 至少须保留或种植 1 棵冠层树。'}
                    </p>
                  </div>
                  <span className="font-mono text-3xl font-semibold tabular-nums text-[#241F21] dark:text-[#E9E778]">
                    {Math.max(1, Math.ceil(effectiveLotSize / 100))}
                  </span>
                </div>
              </div>
              <div className="mt-6 border-2 border-[#E9E778] bg-[#E9E778]/15 p-4 dark:bg-[#E9E778]/10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#241F21] dark:text-[#E9E778]">
                  {lang === 'en' ? 'Gas-Free Guardrail · NCC 2026' : '禁燃气警示 · NCC 2026'}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-900 dark:text-zinc-100">
                  {lang === 'en'
                    ? 'Reticulated natural gas connections are prohibited for new Small Second Dwellings under the 2026 Victorian electrification reform. Specify all-electric appliances (induction cooktop, heat-pump hot water, reverse-cycle HVAC) at design stage.'
                    : '依据 2026 年维州全面电气化改革,新建小型第二住宅禁止接入燃气主管。设计阶段须采用全电气电器(电磁炉、热泵热水、变频空调)。'}
                </p>
              </div>
              <div className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-900">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
                  {t('potentialRisks')}
                </p>
                <div className="mt-3">
                  <RiskMatrix
                    lang={lang}
                    criteria={buildRiskCriteria({
                      lang,
                      lotSize,
                      gfa,
                      activeOverlays,
                      siteConditions,
                      easementsCount: live.easements.length,
                      treeDbhMm,
                    })}
                  />
                </div>
              </div>
            </div>
          </Section>
        )}
        <Section number="02" title={t('sectionInputs')}>
          <div className="py-8">
            <div className="flex items-baseline justify-between">
              <span className="flex flex-col">
                <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#E9E778]">
                  {lang === 'en' ? 'Verify Lot Area (m²)' : '核实地块面积 (m²)'}
                </span>
                <span className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                  {t('lotSize')}
                </span>
              </span>
              <div className="flex items-baseline gap-2">
                <input
                  type="number"
                  min={50}
                  max={5000}
                  step={1}
                  value={lotSize}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v > 0) setLotSize(Math.round(v));
                  }}
                  className="w-28 border-b-2 border-[#E9E778] bg-transparent px-1 pb-1 text-right font-mono text-3xl tabular-nums text-[#241F21] focus:outline-none dark:text-[#E9E778]"
                  aria-label={lang === 'en' ? 'Verify Lot Area' : '核实地块面积'}
                />
                <span className="text-sm text-zinc-500">m²</span>
              </div>
            </div>
            <input
              type="range"
              min={100}
              max={1000}
              step={10}
              value={Math.min(1000, Math.max(100, lotSize))}
              onChange={(e) => setLotSize(Number(e.target.value))}
              className="mt-6 w-full accent-zinc-900 dark:accent-zinc-100"
              aria-label={t('lotSize')}
            />
            <div className="mt-3 flex justify-between text-xs text-zinc-500">
              <span>100 m²</span>
              <span>
                {t('threshold')} · {SSD_MIN_LOT_SIZE_M2} m²
              </span>
              <span>1000 m²</span>
            </div>
            {live?.polygon ? (
              <p className="mt-4 flex items-center gap-2 text-xs text-[#241F21] dark:text-[#E9E778]">
                <span className="size-1.5 rounded-full bg-[#E9E778]" />
                {lang === 'en'
                  ? 'Verified Data · derived from cadastral parcel geometry'
                  : '已验证数据 · 来自地籍地块几何测算'}
              </p>
            ) : live?.domain?.lotSize ? (
              <p className="mt-4 flex items-center gap-2 text-xs text-[#241F21] dark:text-[#E9E778]">
                <span className="size-1.5 rounded-full bg-[#E9E778]" />
                {lang === 'en'
                  ? 'Verified Data · Domain area metadata'
                  : '已验证数据 · Domain 面积元数据'}
              </p>
            ) : (
              <p className="mt-4 flex items-center gap-2 text-xs text-[#E9E778]">
                <span className="size-1.5 rounded-full bg-[#E9E778]" />
                {lang === 'en'
                  ? 'Architectural Verification Required'
                  : '需建筑师人工核实'}
              </p>
            )}
            {source === 'live' && !live?.polygon && !live?.domain?.lotSize && (
              <p className="mt-2 text-xs text-zinc-500">{t('lotSizeHint')}</p>
            )}
            {envelope && (
              <div className="mt-6 border border-zinc-200 p-4 text-sm dark:border-zinc-800">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                    {t('buildableAreaLabel')}
                  </span>
                  <span className="font-mono text-base tabular-nums">
                    {envelope.areaM2} m²
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  {t('buildableAreaHint')}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-zinc-200 pt-8 dark:border-zinc-900">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {t('gfa')}
              </span>
              <div className="flex items-baseline gap-2">
                <input
                  type="number"
                  min={1}
                  max={500}
                  step={0.1}
                  value={gfa}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v > 0) setGfa(v);
                  }}
                  className={`w-28 border-b bg-transparent px-1 pb-1 text-right font-mono text-3xl tabular-nums focus:outline-none ${
                    gfaExceeded
                      ? 'border-zinc-600 text-zinc-800 focus:border-zinc-900 dark:border-zinc-500/70 dark:text-zinc-300'
                      : 'border-zinc-300 focus:border-zinc-950 dark:border-zinc-700 dark:focus:border-zinc-100'
                  }`}
                  aria-label={t('gfa')}
                />
                <span className="text-sm text-zinc-500">m²</span>
              </div>
            </div>
            <input
              type="range"
              min={20}
              max={150}
              step={5}
              value={Math.min(150, Math.max(20, Math.round(gfa)))}
              onChange={(e) => setGfa(Number(e.target.value))}
              className="mt-6 w-full accent-zinc-900 dark:accent-zinc-100"
              aria-label={t('gfa')}
            />
            <div className="mt-3 flex justify-between text-xs text-zinc-500">
              <span>20 m²</span>
              <span>
                {t('gfaThresholdHint')} · {SSD_MAX_GFA_M2} m²
              </span>
              <span>150 m²</span>
            </div>
          </div>

          <div className="border-t border-zinc-200 pt-8 dark:border-zinc-900">
            <label className="flex cursor-pointer items-start justify-between gap-4">
              <span className="flex-1">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {t('subdivideLabel')}
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {t('subdivideHint')}
                </span>
              </span>
              <input
                type="checkbox"
                checked={subdivided}
                onChange={(e) => setSubdivided(e.target.checked)}
                className="mt-1 size-4 shrink-0 accent-zinc-900 dark:accent-zinc-100"
              />
            </label>
            {subdivided && (
              <p className="mt-4 font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
                {t('lotSize')} · {effectiveLotSize} m²
              </p>
            )}
          </div>

          <div className="border-t border-zinc-200 pt-8 dark:border-zinc-900">
            <label className="block">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {t('wallOnBoundaryLabel')}
              </span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={wallOnBoundaryM}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v >= 0) setWallOnBoundaryM(v);
                }}
                className="mt-3 block w-full border border-zinc-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                aria-label={t('wallOnBoundaryLabel')}
              />
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                {t('wallOnBoundaryHint')}
              </p>
            </label>
          </div>

          <div className="border-t border-zinc-200 pt-8 dark:border-zinc-900">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {t('existingCoverage')}
              </span>
              <span className="font-mono text-3xl tabular-nums">
                {existingCoverage}
                <span className="ml-1 text-sm text-zinc-500">m²</span>
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(50, lotSize - gfa)}
              step={5}
              value={Math.min(existingCoverage, Math.max(0, lotSize - gfa))}
              onChange={(e) => setExistingCoverage(Number(e.target.value))}
              className="mt-6 w-full accent-zinc-900 dark:accent-zinc-100"
              aria-label={t('existingCoverage')}
            />
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              {t('existingCoverageHint')}
            </p>

            {gardenReq ? (
              <div
                className={`mt-6 border p-4 text-sm leading-relaxed ${
                  gardenShort
                    ? 'border-zinc-700 text-zinc-900 dark:border-zinc-500/50 dark:text-zinc-200'
                    : 'border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300'
                }`}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                    {t('gardenAreaLabel')}
                  </span>
                  <span className="font-mono text-base tabular-nums">
                    {Math.round(availableGarden)} m² /{' '}
                    {Math.round(requiredGarden)} m²
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {t('gardenRequirementLabel')} ·{' '}
                  {Math.round(gardenReq.fraction * 100)}% · {gardenReq.bracketLabel}
                </p>
                {gardenShort && (
                  <p className="mt-3 text-xs leading-relaxed">
                    {t('gardenWarning')}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-6 text-xs text-zinc-500">{t('gardenExempt')}</p>
            )}
          </div>

          <div className="border-t border-zinc-200 pt-8 dark:border-zinc-900">
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {t('overlays')}
              </p>
              {source === 'live' && live && live.vicPlan.overlayCodes.length > 0 && (
                <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[#241F21] dark:text-[#E9E778]">
                  <span className="size-1.5 rounded-full bg-[#E9E778]" />
                  {t('overlaysAutoDetected')}
                </span>
              )}
            </div>
            {source === 'live' && live ? (
              <div className="mt-4 space-y-2">
                {live.vicPlan.overlayCodes.length > 0 ? (
                  live.vicPlan.overlayCodes.map((code) => {
                    const o = OVERLAYS[code];
                    return (
                      <div key={code} className="flex items-center gap-2 rounded border border-zinc-700 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-500/50 dark:bg-zinc-900/40">
                        <span className="size-2 rounded-full bg-zinc-700 dark:bg-zinc-500" />
                        <span className="text-zinc-900 dark:text-zinc-100">
                          {pick(o, lang)} ({code})
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-zinc-500">{t('noOverlays')}</p>
                )}
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-900">
                {ALL_OVERLAY_CODES.map((code) => {
                  const o = OVERLAYS[code];
                  const checked = overlayState[code];
                  return (
                    <li key={code}>
                      <label className="flex cursor-pointer items-center justify-between gap-4 py-4 text-sm">
                        <span>
                          {pick(o, lang)} ({code})
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setOverlayState((prev) => ({
                              ...prev,
                              [code]: e.target.checked,
                            }))
                          }
                          className="size-4 accent-zinc-900 dark:accent-zinc-100"
                        />
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-zinc-200 pt-8 dark:border-zinc-900">
            <label className="flex cursor-pointer items-start justify-between gap-4">
              <span className="flex-1">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {t('dpuApplyLabel')}
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {t('dpuApplyHint')}
                </span>
              </span>
              <input
                type="checkbox"
                checked={dpuIntent}
                onChange={(e) => setDpuIntent(e.target.checked)}
                className="mt-1 size-4 shrink-0 accent-zinc-900 dark:accent-zinc-100"
              />
            </label>
          </div>
          <div className="border-t border-zinc-200 pt-8 dark:border-zinc-900">
            <label className="flex cursor-pointer items-start justify-between gap-4">
              <span className="flex-1">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {t('easementLabel')}
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {t('easementHint')}
                </span>
              </span>
              <input
                type="checkbox"
                checked={easementPresent}
                onChange={(e) => setEasementPresent(e.target.checked)}
                className="mt-1 size-4 shrink-0 accent-zinc-900 dark:accent-zinc-100"
              />
            </label>
          </div>
          <div className="border-t border-zinc-200 pt-8 dark:border-zinc-900">
            <label className="block">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {t('architectNotesLabel')}
              </span>
              <textarea
                value={architectNotes}
                onChange={(e) => setArchitectNotes(e.target.value)}
                rows={4}
                className="mt-3 block w-full border border-zinc-300 bg-white px-3 py-2 text-sm leading-relaxed text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                aria-label={t('architectNotesLabel')}
                placeholder={t('architectNotesHint')}
              />
            </label>
          </div>
        </Section>

        <Section number="03" title={t('siteInspector')}>
          <div className="pt-8">
            <button
              type="button"
              onClick={() => setSiteInspectorOpen(!siteInspectorOpen)}
              className="flex w-full items-center justify-between rounded border border-zinc-200 bg-zinc-50 px-5 py-4 text-left transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {t('siteInspector')}
                </p>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {t('siteInspectorHint')}
                </p>
              </div>
              <span className="ml-4 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                {siteInspectorOpen ? t('siteInspectorCollapse') : t('siteInspectorExpand')}
              </span>
            </button>

            {siteInspectorOpen && (
              <div className="mt-6 space-y-8">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
                    {t('sectionSite')}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {t('siteIntro')}
                  </p>
                  <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-900">
                    <SiteToggle
                      label={t('siteFrontageLabel')}
                      hint={t('siteFrontageHint')}
                      yesLabel={t('siteYes')}
                      noLabel={t('siteNo')}
                      value={siteConditions.frontageOk}
                      onChange={(v) =>
                        setSiteConditions((p) => ({ ...p, frontageOk: v }))
                      }
                    />
                    <SiteToggle
                      label={t('siteSlopeLabel')}
                      hint={t('siteSlopeHint')}
                      yesLabel={t('siteYes')}
                      noLabel={t('siteNo')}
                      value={siteConditions.slopeOk}
                      onChange={(v) =>
                        setSiteConditions((p) => ({ ...p, slopeOk: v }))
                      }
                    />
                    <SiteToggle
                      label={t('siteAccessLabel')}
                      hint={t('siteAccessHint')}
                      yesLabel={t('siteYes')}
                      noLabel={t('siteNo')}
                      value={siteConditions.sideAccessOk}
                      onChange={(v) =>
                        setSiteConditions((p) => ({ ...p, sideAccessOk: v }))
                      }
                    />
                    <SiteToggle
                      label={t('siteTreeLabel')}
                      hint={t('siteTreeHint')}
                      yesLabel={t('siteYes')}
                      noLabel={t('siteNo')}
                      value={siteConditions.treeCanopyOk}
                      onChange={(v) =>
                        setSiteConditions((p) => ({ ...p, treeCanopyOk: v }))
                      }
                    />
                  </ul>
                </div>

                <div className="border-t border-zinc-200 pt-8 dark:border-zinc-900">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
                    {t('sectionBuilding')}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {t('buildingIntro')}
                  </p>
                  <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-900">
                    <SiteToggle
                      label={t('lhdEntryLabel')}
                      hint={t('lhdEntryHint')}
                      yesLabel={t('siteYes')}
                      noLabel={t('siteNo')}
                      value={lhd.entryOk}
                      onChange={(v) => setLhd((p) => ({ ...p, entryOk: v }))}
                    />
                    <SiteToggle
                      label={t('lhdDoorsLabel')}
                      hint={t('lhdDoorsHint')}
                      yesLabel={t('siteYes')}
                      noLabel={t('siteNo')}
                      value={lhd.doorsOk}
                      onChange={(v) => setLhd((p) => ({ ...p, doorsOk: v }))}
                    />
                    <SiteToggle
                      label={t('lhdReinforcementLabel')}
                      hint={t('lhdReinforcementHint')}
                      yesLabel={t('siteYes')}
                      noLabel={t('siteNo')}
                      value={lhd.reinforcementOk}
                      onChange={(v) =>
                        setLhd((p) => ({ ...p, reinforcementOk: v }))
                      }
                    />
                  </ul>
                  {(!lhd.entryOk || !lhd.doorsOk || !lhd.reinforcementOk) && (
                    <p className="mt-6 border border-zinc-700 p-4 text-xs leading-relaxed text-zinc-900 dark:border-zinc-500/50 dark:text-zinc-200">
                      {t('lhdWarning')}
                    </p>
                  )}
                </div>

                <div className="border-t border-zinc-200 pt-8 dark:border-zinc-900">
                  <label className="block">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {t('backyardOrientationLabel')}
                    </span>
                    <select
                      value={backyardOrientation}
                      onChange={(e) =>
                        setBackyardOrientation(e.target.value as Orientation)
                      }
                      className="mt-3 block w-full border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      aria-label={t('backyardOrientationLabel')}
                    >
                      {(
                        [
                          'Unknown',
                          'N',
                          'NE',
                          'E',
                          'SE',
                          'S',
                          'SW',
                          'W',
                          'NW',
                        ] as Orientation[]
                      ).map((o) => (
                <option key={o} value={o}>
                          {pick(ORIENTATION_LABELS[o], lang)}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-zinc-500">
                      {t('backyardOrientationHint')}
                    </p>
                  </label>
                </div>
              </div>
            )}
          </div>
        </Section>
        </>
        )}

        {live && activeTab === 'profit' && (
        <Section number="05" title={t('sectionAssessment')}>
          {/* PROFIT & ROI — develop-and-sell pro-forma. Indicative only;
              GRV − TDC, with TDC = site + construction + 15% soft costs.
              Dwellings derive from computeYieldScenarios. Site-purchase
              cost prefers live.price.valueAud (Domain / Valuer-General
              waterfall) and falls back to the $1.2M PROFIT_DEFAULTS
              baseline. Sale-price slider seeds from defaultSalePriceForLga
              and resyncs on every address change. */}
          <div className="border-b-2 border-zinc-900 pb-10 pt-2 dark:border-zinc-100">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#241F21] dark:text-[#E9E778]">
              {t('profitRoiHeading')}
            </p>
            <p className="mt-3 max-w-2xl text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t('profitRoiIntro')}
            </p>

            {profitDwellings === 0 ? (
              <div className="mt-6 border border-zinc-300 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-900/40">
                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {t('profitNoYield')}
                </p>
              </div>
            ) : (
              <>
                {/* Top row — three large KPI tiles. GRV, Net Profit, ROI%. */}
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="border border-zinc-300 p-5 dark:border-zinc-700">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                      {t('profitGrv')}
                    </p>
                    <p className="mt-3 font-mono text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      ${Math.round(profitMetrics.grossRealizationValue).toLocaleString('en-AU')}
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                      {profitDwellings} × ${profitSalePerUnit.toLocaleString('en-AU')}
                    </p>
                  </div>

                  <div
                    className={`border-2 p-5 ${
                      profitMetrics.netProfit >= 0
                        ? 'border-[#E9E778] bg-[#E9E778]/[0.08]'
                        : 'border-zinc-700 bg-zinc-50 dark:border-zinc-500 dark:bg-zinc-900/40'
                    }`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#241F21] dark:text-[#E9E778]">
                      {t('profitNet')}
                    </p>
                    <p
                      className={`mt-3 font-mono text-3xl font-semibold tabular-nums ${
                        profitMetrics.netProfit >= 0
                          ? 'text-[#241F21] dark:text-[#E9E778]'
                          : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {profitMetrics.netProfit < 0 ? '−' : ''}$
                      {Math.abs(Math.round(profitMetrics.netProfit)).toLocaleString('en-AU')}
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                      GRV − TDC
                    </p>
                  </div>

                  <div className="border border-zinc-300 p-5 dark:border-zinc-700">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                      {t('profitRoi')}
                    </p>
                    <p
                      className={`mt-3 font-mono text-3xl font-semibold tabular-nums ${
                        profitMetrics.roiPct !== null && profitMetrics.roiPct >= 0
                          ? 'text-zinc-900 dark:text-zinc-100'
                          : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {profitMetrics.roiPct !== null
                        ? `${profitMetrics.roiPct.toFixed(1)}%`
                        : '—'}
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                      Net / TDC
                    </p>
                  </div>
                </div>

                {/* Secondary ledger row — TDC, soft costs, site cost, dwellings. */}
                <div className="mt-4 border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full text-xs">
                    <tbody className="[&_td]:px-5 [&_td]:py-3 [&_tr]:border-b [&_tr]:border-zinc-100 last:[&_tr]:border-0 dark:[&_tr]:border-zinc-900">
                      <tr>
                        <td className="text-zinc-700 dark:text-zinc-300">
                          {t('profitTdc')}
                        </td>
                        <td className="text-right font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                          ${Math.round(profitMetrics.totalDevelopmentCost).toLocaleString('en-AU')}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-zinc-700 dark:text-zinc-300">
                          {t('profitSiteCost')}
                          {live?.price.valueAud == null && (
                            <span className="ml-2 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                              {lang === 'en' ? '· default baseline' : '· 默认基线'}
                            </span>
                          )}
                        </td>
                        <td className="text-right font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                          ${(live?.price.valueAud ?? PROFIT_DEFAULTS.sitePurchaseCost).toLocaleString('en-AU')}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-zinc-700 dark:text-zinc-300">
                          {t('profitSoftCosts')}
                        </td>
                        <td className="text-right font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                          ${Math.round(profitMetrics.softCostsTotal).toLocaleString('en-AU')}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-zinc-700 dark:text-zinc-300">
                          {t('profitDwellings')}
                        </td>
                        <td className="text-right font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                          {profitDwellings}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Bottom row — two sliders. Construction $/unit, sale $/unit. */}
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                        {t('profitConstructionSlider')}
                      </span>
                      <span className="font-mono text-xl tabular-nums text-zinc-900 dark:text-zinc-100">
                        ${profitConstructionPerUnit.toLocaleString('en-AU')}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={250000}
                      max={750000}
                      step={25000}
                      value={profitConstructionPerUnit}
                      onChange={(e) =>
                        setProfitConstructionPerUnit(Number(e.target.value))
                      }
                      className="mt-3 w-full accent-zinc-900 dark:accent-zinc-100"
                      aria-label={t('profitConstructionSlider')}
                    />
                    <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                      $250k — $750k · step $25k
                    </p>
                  </label>

                  <label className="block">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                        {t('profitSaleSlider')}
                      </span>
                      <span className="font-mono text-xl tabular-nums text-zinc-900 dark:text-zinc-100">
                        ${profitSalePerUnit.toLocaleString('en-AU')}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={600000}
                      max={3000000}
                      step={50000}
                      value={profitSalePerUnit}
                      onChange={(e) =>
                        setProfitSalePerUnit(Number(e.target.value))
                      }
                      className="mt-3 w-full accent-zinc-900 dark:accent-zinc-100"
                      aria-label={t('profitSaleSlider')}
                    />
                    <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                      $600k — $3M · step $50k
                      {live?.lga?.name && (
                        <span className="ml-2 normal-case tracking-normal">
                          · {lang === 'en' ? 'LGA default' : '议会默认'}:{' '}
                          {live.lga.name}
                        </span>
                      )}
                    </p>
                  </label>
                </div>

                <p className="mt-6 text-[11px] leading-relaxed text-zinc-500">
                  {t('profitDisclaimer')}
                </p>
              </>
            )}
          </div>

          <div className="flex items-center gap-5 border-b border-zinc-200 py-8 dark:border-zinc-900">
            <div
              aria-hidden
              className="flex size-14 shrink-0 items-center justify-center border border-zinc-300 dark:border-zinc-700"
            >
              <Logo size={28} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
                {t('reportHeaderTitle')}
              </p>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                {t('reportHeaderSubtitle')}
              </p>
              <p className="mt-1 truncate text-xs text-zinc-500">
                {live?.displayName ?? '—'} · {generatedAt.toISOString().slice(0, 10)}
              </p>
            </div>
          </div>

          {dpuIntent && (
            <div className="mt-8 border border-zinc-950 p-5 dark:border-zinc-100">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
                {t('dpuAlertLabel')} · {t('dpuAlertHeading')}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {t('dpuAlertBody')}
              </p>
            </div>
          )}

          {isFlood && (
            <div className="mt-8 border-2 border-[#241F21] bg-[#E9E778]/15 p-5 dark:border-[#E9E778]">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#241F21] dark:text-[#E9E778]">
                  {t('floodPremiumLabel')}
                </p>
                <span className="font-mono text-2xl font-semibold tabular-nums text-[#241F21] dark:text-[#E9E778]">
                  +${FLOOD_PREMIUM_AUD.toLocaleString('en-AU')}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                {t('floodPremiumNote')}
              </p>
            </div>
          )}

          <div className="py-8">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
              {t('status')}
            </p>
            <div className="mt-4 flex items-center gap-3">
              {isExempt ? (
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  className="shrink-0"
                  aria-hidden
                >
                  <path
                    d="M16 2L4 8v8c0 7.5 5.2 14.5 12 16 6.8-1.5 12-8.5 12-16V8L16 2z"
                    fill="#E9E778"
                    stroke="#241F21"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M12 16l3 3 6-6"
                    stroke="#241F21"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <span
                  aria-hidden
                  className="inline-block size-2.5 rounded-full bg-zinc-700"
                />
              )}
              <span className="text-2xl font-medium tracking-tight">
                {isExempt ? t('verifiedQualified') : pick(STATUS_LABELS[result.status], lang)}
              </span>
            </div>
          </div>

          <div className="border-t border-zinc-200 pt-8 dark:border-zinc-900">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
              {t('basis')}
            </p>
            <ul className="mt-5 space-y-3">
              {result.reasons.map((r) => (
                <li key={r.code} className="flex gap-3 text-sm leading-relaxed">
                  <span
                    aria-hidden
                    className="mt-2 inline-block size-1 shrink-0 rounded-full bg-zinc-400"
                  />
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {pick(r, lang)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 border-t border-zinc-200 pt-8 dark:border-zinc-900">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
              {t('serviceRequirements')}
            </p>
            <div className="mt-5 space-y-5">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {t('srGasBanLabel')}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {t('noticeElectric')}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {t('srEnergyLabel')}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {t('srEnergyDetail')}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-zinc-200 pt-8 dark:border-zinc-900">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
              {t('sectionAdvice')}
            </p>
            <p className="mt-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {pick(advice, lang)}
            </p>
          </div>

          {solarTip && (
            <div className="mt-8 border border-[#E9E778] p-5">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#241F21] dark:text-[#E9E778]">
                {t('solarTipLabel')}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {pick(solarTip, lang)}
              </p>
            </div>
          )}

          {easementPresent && (
            <div className="mt-8 border border-zinc-700 p-5 dark:border-zinc-500/50">
              <p className="text-sm leading-relaxed text-zinc-900 dark:text-zinc-200">
                {t('easementWarning')}
              </p>
            </div>
          )}

          {architectNotes.trim().length > 0 && (
            <div className="mt-8 border-t border-zinc-200 pt-8 dark:border-zinc-900">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
                {t('specialNotesLabel')}
              </p>
              <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {architectNotes}
              </p>
            </div>
          )}

          {gfaExceeded && (
            <div className="mt-8 border border-zinc-700 p-5 dark:border-zinc-500/50">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-800 dark:text-zinc-300">
                {t('warningPrefix')}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {t('gfaWarning')}
              </p>
            </div>
          )}

          <div className="mt-8 border-t border-zinc-200 pt-8 dark:border-zinc-900">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
                {t('marketContext')}
              </p>
              {live?.domain && !live.domain.isDemoData ? (
                <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[#241F21] dark:text-[#E9E778]">
                  <span className="size-1.5 rounded-full bg-[#E9E778]" />
                  {lang === 'en' ? 'Verified Data' : '已验证数据'}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[#E9E778]">
                  <span className="size-1.5 rounded-full bg-[#E9E778]" />
                  {lang === 'en' ? 'Architectural Verification Required' : '需建筑师核实'}
                </span>
              )}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t('marketContextIntro')}
            </p>

            {live?.domain?.lastSoldPrice && (
              <div className="mt-6 flex items-baseline gap-3">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                  {t('marketLastSold')}
                </span>
                <span className="font-mono text-xl tabular-nums text-zinc-900 dark:text-zinc-100">
                  ${live.domain.lastSoldPrice.toLocaleString()}
                </span>
                {live.domain.lastSoldDate && (
                  <span className="text-xs text-zinc-500">
                    · {live.domain.lastSoldDate}
                  </span>
                )}
              </div>
            )}

            <p className="mt-6 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              {t('marketComparables')}
            </p>
            {live?.domain?.comparableSales && live.domain.comparableSales.length > 0 ? (
              <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-900">
                {live.domain.comparableSales.map((sale, idx) => (
                  <li
                    key={idx}
                    className="flex items-baseline justify-between gap-4 py-3 text-sm"
                  >
                    <span className="text-zinc-900 dark:text-zinc-100">
                      {sale.address}
                      <span className="ml-2 text-xs text-zinc-500">
                        · {sale.distanceM} m
                      </span>
                    </span>
                    <span className="flex items-baseline gap-3 whitespace-nowrap">
                      <span className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                        ${sale.price.toLocaleString()}
                      </span>
                      <span className="text-xs text-zinc-500">{sale.saleDate}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">{t('marketNone')}</p>
            )}

            {live?.domain?.isDemoData && (
              <p className="mt-4 text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-300">
                {t('marketDemoNote')}
              </p>
            )}
          </div>

          <div className="mt-8 border-t border-zinc-200 pt-8 dark:border-zinc-900">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
              {t('sectionYield')}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t('yieldIntro')}
            </p>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="border border-zinc-200 p-5 dark:border-zinc-800">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                    {t('yieldLtrLabel')}
                  </p>
                  {live?.domain?.rentalEstimateWeekly && (
                    <span className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.14em] text-[#241F21] dark:text-[#E9E778]">
                      <span className="size-1 rounded-full bg-[#E9E778]" />
                      {t('rentalEstimateSource')}
                    </span>
                  )}
                </div>
                <p className="mt-3 font-mono text-2xl tabular-nums text-zinc-900 dark:text-zinc-100">
                  ${ltrWeekly.toLocaleString()}
                  <span className="ml-2 text-sm text-zinc-500">{t('yieldLtrWeekly')}</span>
                </p>
                <p className="mt-1 font-mono text-base tabular-nums text-zinc-600 dark:text-zinc-400">
                  ${ltrAnnual.toLocaleString()}
                  <span className="ml-2 text-xs text-zinc-500">{t('yieldLtrAnnual')}</span>
                </p>
                {targetRent ? (
                  <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#241F21] dark:text-[#E9E778]">
                        {t('targetRentLabel')}
                      </p>
                      <span className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.18em] ${
                        targetRent.bracket === 'premium'
                          ? 'border-[#E9E778] bg-[#E9E778] text-[#241F21]'
                          : 'border-zinc-700 text-zinc-700 dark:border-zinc-500 dark:text-zinc-300'
                      }`}>
                        {targetRent.bracket === 'premium' ? 'Premium' : 'Standard'}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-xl tabular-nums text-[#241F21] dark:text-[#E9E778]">
                      ${targetRent.low}–${targetRent.high}
                      <span className="ml-2 text-xs font-normal text-zinc-500">{t('yieldLtrWeekly')}</span>
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                      {t('targetRentSuggested')} · ${targetRent.suggested}/wk · {' '}
                      {targetRent.bracket === 'premium'
                        ? t('targetRentBracketPremium')
                        : t('targetRentBracketStandard')}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 border-t border-zinc-200 pt-4 text-[11px] leading-relaxed text-zinc-500 dark:border-zinc-800">
                    {t('targetRentNoData')}
                  </p>
                )}
              </div>

              <div className="border border-zinc-200 p-5 dark:border-zinc-800">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                  {t('yieldStrLabel')}
                </p>
                <p className="mt-3 font-mono text-2xl tabular-nums text-zinc-900 dark:text-zinc-100">
                  ${strAnnual.toLocaleString()}
                  <span className="ml-2 text-sm text-zinc-500">{t('yieldStrAnnual')}</span>
                </p>
              </div>
            </div>

            <div className="mt-6 border border-zinc-200 dark:border-zinc-800">
              <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-700 dark:text-zinc-300">
                  {t('costMatrixLabel')}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                  {t('costMatrixIntro')}
                </p>
              </div>
              <div className="px-5 py-5">
                <label className="block">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                      {t('costRateLabel')}
                    </span>
                    <span className="font-mono text-2xl tabular-nums text-zinc-900 dark:text-zinc-100">
                      ${buildRatePerM2.toLocaleString('en-AU')}
                      <span className="ml-2 text-xs font-normal text-zinc-500">{t('costRatePerM2')}</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={3000}
                    max={5000}
                    step={50}
                    value={buildRatePerM2}
                    onChange={(e) => setBuildRatePerM2(Number(e.target.value))}
                    className="mt-3 w-full accent-zinc-900 dark:accent-zinc-100"
                    aria-label={t('costRateLabel')}
                  />
                  <p className="mt-2 text-[11px] text-zinc-500">{t('costRateBracket')}</p>
                </label>

                <table className="mt-5 w-full text-xs">
                  <tbody className="[&_td]:py-2 [&_tr]:border-b [&_tr]:border-zinc-100 dark:[&_tr]:border-zinc-900">
                    <tr>
                      <td className="text-zinc-700 dark:text-zinc-300">
                        {t('costBaseBuild')}
                        <span className="ml-2 text-[10px] text-zinc-500">{t('costBaseBuildHint')} · {gfa} m²</span>
                      </td>
                      <td className="text-right font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                        ${baseBuild.toLocaleString('en-AU')}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-zinc-700 dark:text-zinc-300">
                        {t('costConsultants')}
                        <span className="ml-2 text-[10px] text-zinc-500">{t('costConsultantsHint')}</span>
                      </td>
                      <td className="text-right font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                        ${consultantFees.toLocaleString('en-AU')}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-zinc-700 dark:text-zinc-300">
                        {t('costCouncil')}
                        <span className="ml-2 text-[10px] text-zinc-500">{t('costCouncilHint')}</span>
                      </td>
                      <td className="text-right font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                        ${councilContrib.toLocaleString('en-AU')}
                      </td>
                    </tr>
                    <tr className="!border-zinc-300 dark:!border-zinc-700">
                      <td className="font-medium text-zinc-700 dark:text-zinc-300">{t('costSubtotal')}</td>
                      <td className="text-right font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                        ${subtotalCost.toLocaleString('en-AU')}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-zinc-700 dark:text-zinc-300">{t('costGst')}</td>
                      <td className="text-right font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                        ${gstAmount.toLocaleString('en-AU')}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-3 flex items-baseline justify-between gap-2 border-t-2 border-[#241F21] pt-3 dark:border-[#E9E778]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#241F21] dark:text-[#E9E778]">
                    {t('costTotal')}
                  </span>
                  <span className="font-mono text-3xl font-semibold tabular-nums text-[#241F21] dark:text-[#E9E778]">
                    ${constructionCost.toLocaleString('en-AU')}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-zinc-500">{t('yieldCostHint')}</p>
              </div>
            </div>

            {/* Investment Highlight Card */}
            <div className="mt-6 border-4 border-[#E9E778] bg-[#E9E778]/15 p-6 dark:bg-[#E9E778]/10">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#241F21] dark:text-[#E9E778]">
                {t('investmentHighlight')}
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {t('paybackPeriodLabel')}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">LTR</p>
                  <p className="mt-1 font-mono text-5xl font-bold tabular-nums text-[#241F21] dark:text-[#E9E778]">
                    {paybackLtr.toFixed(1)}
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    {t('yieldPaybackYears')}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">STR</p>
                  <p className="mt-1 font-mono text-5xl font-bold tabular-nums text-[#241F21] dark:text-[#E9E778]">
                    {paybackStr.toFixed(1)}
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    {t('yieldPaybackYears')}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="border border-[#E9E778]/60 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#241F21] dark:text-[#E9E778]">
                  {t('yieldPaybackLabel')} (LTR)
                </p>
                <p className="mt-2 font-mono text-3xl tabular-nums text-zinc-900 dark:text-zinc-100">
                  {paybackLtr.toFixed(1)}
                  <span className="ml-2 text-base text-zinc-500">{t('yieldPaybackYears')}</span>
                </p>
              </div>

              <div className="border border-[#E9E778]/60 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#241F21] dark:text-[#E9E778]">
                  {t('yieldPaybackLabel')} (STR)
                </p>
                <p className="mt-2 font-mono text-3xl tabular-nums text-zinc-900 dark:text-zinc-100">
                  {paybackStr.toFixed(1)}
                  <span className="ml-2 text-base text-zinc-500">{t('yieldPaybackYears')}</span>
                </p>
              </div>
            </div>

            <p className="mt-6 text-xs leading-relaxed text-zinc-500">
              <span className="font-medium uppercase tracking-[0.18em]">{t('yieldDisclaimerLabel')} · </span>
              {t('yieldDisclaimer')}
            </p>
          </div>

          <div className="mt-8 border-t border-zinc-200 pt-8 dark:border-zinc-900">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
              {t('scenario')}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t('scenarioIntro')}
            </p>
            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                  {t('scenarioBuildCost')}
                </span>
                <input
                  type="number"
                  min={50000}
                  step={5000}
                  value={scenarioBuildCost}
                  onChange={(e) => setScenarioBuildCost(Number(e.target.value))}
                  className="mt-2 block w-full border border-zinc-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                  {t('scenarioRent')}
                </span>
                <input
                  type="number"
                  min={100}
                  step={10}
                  value={scenarioWeeklyRent}
                  onChange={(e) => setScenarioWeeklyRent(Number(e.target.value))}
                  className="mt-2 block w-full border border-zinc-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                  {t('scenarioDwellings')}
                </span>
                <input
                  type="number"
                  min={1}
                  max={4}
                  step={1}
                  value={scenarioDwellings}
                  onChange={(e) => setScenarioDwellings(Number(e.target.value))}
                  className="mt-2 block w-full border border-zinc-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
            </div>
            {scenario && (
              <div className="mt-6 grid gap-4 border border-zinc-200 p-5 dark:border-zinc-800 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                    {t('scenarioAnnualRent')}
                  </p>
                  <p className="mt-2 font-mono text-xl tabular-nums text-zinc-900 dark:text-zinc-100">
                    ${scenario.totalAnnualRentAud.toLocaleString('en-AU')}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                    {t('scenarioPayback')}
                  </p>
                  <p className="mt-2 font-mono text-xl tabular-nums text-zinc-900 dark:text-zinc-100">
                    {scenario.simplePaybackYears !== null ? `${scenario.simplePaybackYears.toFixed(1)} yr` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                    {t('scenarioYield')}
                  </p>
                  <p className="mt-2 font-mono text-xl tabular-nums text-zinc-900 dark:text-zinc-100">
                    {scenario.grossYieldPct !== null ? `${scenario.grossYieldPct.toFixed(1)}%` : '—'}
                  </p>
                </div>
                <p className="col-span-full text-xs leading-relaxed text-zinc-500">
                  {pick(scenario.narrative, lang)}
                </p>
                {isFlood && (
                  <p className="col-span-full border-t border-zinc-200 pt-3 text-xs leading-relaxed text-zinc-800 dark:border-zinc-800 dark:text-zinc-300">
                    <span className="font-medium uppercase tracking-[0.18em]">
                      {t('floodPremiumLabel')}
                    </span>{' '}
                    +${FLOOD_PREMIUM_AUD.toLocaleString('en-AU')} · {t('floodPremiumNote')}
                  </p>
                )}
              </div>
            )}
          </div>
        </Section>
        )}

        {live && activeTab === 'reports' && (
        <Section number="06" title={t('sectionReports')}>
          <div className="mt-8 border-t border-zinc-200 pt-8 dark:border-zinc-900">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
              {t('nextSteps')}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t('nextStepsIntro')}
            </p>

            {live?.lga ? (
              <div className="mt-6 border border-zinc-200 p-5 dark:border-zinc-800">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                    {t('councilLabel')}
                  </p>
                  <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[#241F21] dark:text-[#E9E778]">
                    <span className="size-1.5 rounded-full bg-[#E9E778]" />
                    {lang === 'en' ? 'Verified Data' : '已验证数据'}
                  </span>
                </div>
                <p className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {live.lga.name}
                  {live.lga.nameZh && lang === 'zh' && (
                    <span className="ml-2 text-zinc-500">· {live.lga.nameZh}</span>
                  )}
                </p>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-[max-content_1fr] sm:gap-x-6">
                  {live.lga.phone && (
                    <>
                      <dt className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                        {t('councilPhone')}
                      </dt>
                      <dd className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                        <a href={`tel:${live.lga.phone.replace(/\s+/g, '')}`} className="hover:underline">
                          {live.lga.phone}
                        </a>
                      </dd>
                    </>
                  )}
                  {live.lga.email && (
                    <>
                      <dt className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                        {t('councilEmail')}
                      </dt>
                      <dd className="text-zinc-900 dark:text-zinc-100">
                        <a href={`mailto:${live.lga.email}`} className="hover:underline">
                          {live.lga.email}
                        </a>
                      </dd>
                    </>
                  )}
                  <dt className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                    {t('councilWebsite')}
                  </dt>
                  <dd className="break-all text-zinc-900 dark:text-zinc-100">
                    <a
                      href={live.lga.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {live.lga.website.replace(/^https?:\/\//, '')}
                    </a>
                  </dd>
                </dl>
                {(!live.lga.phone || !live.lga.email) && (
                  <p className="mt-4 text-xs leading-relaxed text-zinc-500">
                    {t('councilFallback')}
                  </p>
                )}
              </div>
            ) : (
              live && (
                <p className="mt-4 text-sm text-zinc-500">{t('councilUnknown')}</p>
              )
            )}
          </div>

          <div className="mt-8 border-t border-zinc-200 pt-8 dark:border-zinc-900">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
              {t('regulatoryNotices')}
            </p>

            {daysRemaining > 0 && (
              <div className="mt-4 border-l-4 border-zinc-700 bg-zinc-50 p-4 dark:border-zinc-600 dark:bg-zinc-900/40">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-900 dark:text-zinc-300">
                  {t('dpuCountdownLabel')}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-900 dark:text-zinc-200">
                  <span className="font-semibold">{t('dpuCountdownPrefix')}</span> {monthsRemaining} {lang === 'en' ? 'months' : '个月'} {t('dpuCountdownSuffix')}
                </p>
              </div>
            )}

            <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {t('noticeDpu')}
            </p>
          </div>

          <div className="mt-8 border-t border-zinc-200 pt-8 dark:border-zinc-900">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
              {lang === 'en' ? 'Disclaimer' : '免责声明'}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {lang === 'en' ? T.disclaimer.en : T.disclaimer.zh}
            </p>
          </div>

          <div className="mt-8 border-t border-zinc-200 pt-8 dark:border-zinc-900">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
              {lang === 'en' ? 'Official Legal Documents' : '官方法律文件'}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {lang === 'en'
                ? 'For legally binding title searches and registered plans of subdivision, order direct from LANDATA — Land Use Victoria\'s authoritative title channel. Fees apply per document.'
                : '若需具法律效力的地契查询及注册分割图,可直接通过 LANDATA(维多利亚州土地利用局官方渠道)订购。每项文件按件收费。'}
            </p>

            <div className="mt-5 border border-zinc-200 dark:border-zinc-800">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-5 border-b border-zinc-900/50 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:border-zinc-800">
                <span>{lang === 'en' ? 'Document' : '文件'}</span>
                <span className="text-right">{lang === 'en' ? 'Source' : '来源'}</span>
                <span className="text-right">{lang === 'en' ? 'Est. Fees' : '估算费用'}</span>
              </div>
              {[
                {
                  doc_en: 'Register Search Statement (Title)',
                  doc_zh: '地籍册查询声明(地契)',
                  fee: 'From $16.26',
                },
                {
                  doc_en: 'Copy of Plan (Registered Deed)',
                  doc_zh: '图则副本(已注册契据)',
                  fee: 'From $12.08',
                },
                {
                  doc_en: 'Instrument Search (Covenant / Easement)',
                  doc_zh: '权益文书查询(契约 / 地役权)',
                  fee: 'From $10.64',
                },
                {
                  doc_en: 'Final Search Statement',
                  doc_zh: '最终查询声明',
                  fee: 'From $10.06',
                },
              ].map((row) => (
                <div
                  key={row.doc_en}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-x-5 border-b border-zinc-900/50 px-4 py-3 text-xs last:border-0 dark:border-zinc-800/60"
                >
                  <span className="text-zinc-800 dark:text-zinc-200">
                    {lang === 'en' ? row.doc_en : row.doc_zh}
                  </span>
                  <span className="text-right font-medium uppercase tracking-[0.16em] text-[10px] text-zinc-500">
                    LANDATA
                  </span>
                  <span className="text-right font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                    {row.fee}
                  </span>
                </div>
              ))}
            </div>
            <span className="text-[10px] text-zinc-500 italic mt-2 block">
              {lang === 'en'
                ? 'Fees current as of July 2025 rates via landata.vic.gov.au. Statutory fees are reviewed annually.'
                : '费用以 landata.vic.gov.au 2025 年 7 月公布的费率为准,法定收费每年复核。'}
            </span>

            <a
              href="https://www.landata.vic.gov.au"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 border-2 border-zinc-950 bg-zinc-950 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {lang === 'en'
                ? 'Secure Document Fulfillment via LANDATA ↗'
                : '通过 LANDATA 安全订购官方文件 ↗'}
            </a>
          </div>

          <div className="mt-10 flex flex-col gap-4">
            {BETA_FREE && (
              <span className="inline-flex w-fit items-center gap-2 self-end border border-[#E9E778]/60 bg-[#E9E778]/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#241F21] dark:text-[#E9E778]">
                <span aria-hidden className="size-1.5 rounded-full bg-[#E9E778]" />
                {pick(BETA_BADGE_LABEL, lang)}
              </span>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Column 1 — Basic Site Summary (free) */}
              <button
                type="button"
                onClick={() => {
                  setReportTier('basic');
                  handlePrint();
                }}
                disabled={printing}
                className="group flex h-full flex-col items-start gap-3 border border-zinc-300 bg-white p-5 text-left transition-colors hover:border-zinc-950 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-100 dark:hover:bg-zinc-900"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  {lang === 'en' ? 'Basic Site Summary' : '基础场地摘要'}
                </p>
                <p className="text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
                  {lang === 'en' ? 'Free · 1-page overview' : '免费 · 单页概览'}
                </p>
                <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {lang === 'en'
                    ? 'Quick-print zoning codes, overlays and the responsible council for this address.'
                    : '快速打印分区代码、覆盖区与本地址所属议会信息。'}
                </p>
                <span className="mt-auto pt-2 text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-700 group-hover:text-zinc-950 dark:text-zinc-300 dark:group-hover:text-zinc-100">
                  {printing ? t('generatingReport') : (lang === 'en' ? 'Print Basic →' : '打印基础版 →')}
                </span>
              </button>

              {/* Column 2 — Premium Developer Feasibility Pack (gold outline) */}
              <button
                type="button"
                onClick={() => {
                  setReportTier('premium');
                  handlePrint();
                }}
                disabled={printing}
                className="group relative flex h-full flex-col items-start gap-3 border-2 border-[#E9E778] bg-[#E9E778]/[0.06] p-5 text-left shadow-[0_0_20px_rgba(233,231,120,0.18)] transition-all hover:bg-[#E9E778]/[0.12] hover:shadow-[0_0_28px_rgba(233,231,120,0.32)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 border border-[#E9E778] bg-[#E9E778] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-[#241F21]">
                  {lang === 'en' ? 'Free Beta Access' : '公测免费'}
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#241F21] dark:text-[#E9E778]">
                  {lang === 'en' ? 'Premium Developer Feasibility Pack' : '高级开发可行性套件'}
                </p>
                <p className="text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
                  {lang === 'en'
                    ? 'Multi-page · Map · Yield · Glossary'
                    : '多页 · 地图 · 产出 · 术语对照'}
                </p>
                <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {lang === 'en'
                    ? 'Architectural-grade A4 brief — site geometry, automated Clause 55 yield, and bilingual statutory definitions.'
                    : '建筑级 A4 简报 — 场地几何、Clause 55 自动产出测算与双语法定术语对照。'}
                </p>
                <span className="mt-auto pt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#241F21] dark:text-[#E9E778]">
                  {printing ? t('generatingReport') : t('generateReport')}
                </span>
              </button>
            </div>
            <div className="flex justify-end">
              <a
                href="mailto:architect@simplysite.com.au?subject=SSD%20Consultation%20Request"
                className="inline-flex items-center gap-2 border border-zinc-300 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-700 transition-colors hover:border-zinc-950 hover:bg-zinc-950 hover:text-white dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-100 dark:hover:bg-zinc-100 dark:hover:text-zinc-950"
              >
                {t('bookConsultation')}
              </a>
            </div>
          </div>
        </Section>
        )}

        {live && activeTab === 'reports' && (
        <p className="mt-24 max-w-xl text-xs leading-relaxed text-zinc-500">
          {lang === 'en'
            ? 'See the Assessment section above for the full bilingual disclaimer.'
            : '完整双语免责声明请参见上方「可行性评估」部分。'}
        </p>
        )}
          </div>
        </aside>

        <main className="relative flex-1 overflow-hidden bg-[#241F21]">
          {searching && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 z-40 h-0.5 overflow-hidden bg-zinc-800"
            >
              <div className="h-full w-1/3 animate-[progress_1.1s_ease-in-out_infinite] bg-[#E9E778]" />
            </div>
          )}
          <div className="absolute left-1/2 top-4 z-30 w-[min(720px,calc(100%-2rem))] -translate-x-1/2">
            <form
              onSubmit={runSearch}
              className="rounded-sm border border-zinc-700 bg-[#241F21]/95 px-4 py-3 text-zinc-100 shadow-2xl backdrop-blur transition-colors focus-within:border-[#E9E778] focus-within:ring-2 focus-within:ring-[#E9E778]/40"
            >
              <div className="flex items-center gap-3">
                <AddressAutocomplete
                  value={query}
                  onValueChange={setQuery}
                  onSelect={handleSuggestionSelect}
                  placeholder={t('searchPlaceholder')}
                  ariaLabel={t('sectionSearch')}
                  disabled={searching}
                  searchingLabel={t('searchingLabel')}
                  fallbackNote={t('fallbackNote')}
                />
                <button
                  type="submit"
                  disabled={searching || query.trim().length === 0}
                  className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#E9E778] transition-colors hover:text-white disabled:text-zinc-500"
                >
                  {t('searchButton')}
                </button>
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={searching}
                  title={t('useMyLocation')}
                  aria-label={t('useMyLocation')}
                  className="flex items-center gap-2 border-l border-zinc-700 pl-3 text-xs font-medium uppercase tracking-[0.18em] text-zinc-300 transition-colors hover:text-[#E9E778] disabled:text-zinc-600"
                >
                  <MapPin
                    aria-hidden
                    className="size-3.5"
                    strokeWidth={1.75}
                  />
                  <span className="hidden sm:inline">
                    {searching ? t('usingLocation') : t('useMyLocation')}
                  </span>
                </button>
              </div>
            </form>
            {searchError && (
              <p className="mt-2 rounded-sm border border-zinc-700 bg-[#241F21]/95 px-4 py-2 text-xs leading-relaxed text-zinc-300 shadow-lg backdrop-blur">
                {t(searchError)}
              </p>
            )}
          </div>
          {!live && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#E9E778]">
                {lang === 'en' ? 'No site selected' : '未选择地块'}
              </p>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
                {lang === 'en'
                  ? 'Search a Victorian address to load planning data, cadastral parcels, and feasibility analytics.'
                  : '搜索维多利亚州的地址以加载规划数据、地籍信息和可行性分析。'}
              </p>
            </div>
          )}
          {live && (
            <>
              <div className="absolute left-3 top-20 z-20 flex flex-wrap items-center gap-2 rounded-sm bg-[#241F21]/95 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] shadow-lg backdrop-blur">
                <span className="text-zinc-400">{t('mapTools')}</span>
                {(['pan', 'tree', 'distance', 'area'] as const).map((id) => {
                  const labels: Record<MapTool, string> = {
                    pan: t('toolPan'),
                    tree: t('toolTree'),
                    distance: t('toolDistance'),
                    area: t('toolArea'),
                  };
                  const active = mapTool === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMapTool(id)}
                      className={`border px-3 py-1.5 transition-colors ${
                        active
                          ? 'border-[#E9E778] bg-[#E9E778] text-[#241F21]'
                          : 'border-zinc-700 text-zinc-300 hover:border-[#E9E778] hover:text-[#E9E778]'
                      }`}
                    >
                      {labels[id]}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setDistancePoints([]);
                    setAreaPoints([]);
                    setTreeLon(null);
                    setTreeLat(null);
                    setTreeDbhMm(0);
                    setMapTool('pan');
                  }}
                  className="border border-zinc-700 px-3 py-1.5 text-zinc-400 hover:border-[#E9E778] hover:text-[#E9E778]"
                >
                  {t('toolClear')}
                </button>
                {mapTool !== 'pan' && (
                  <span className="ml-2 text-[10px] normal-case tracking-normal text-zinc-400">
                    {t('toolHint')}
                  </span>
                )}
              </div>
              <MapPreview
                ref={mapPreviewRef}
                lat={live.lat}
                lon={live.lon}
                lang={lang}
                polygon={live.polygon}
                envelope={envelope?.polygon ?? null}
                envelopeExceeded={envelopeExceeded}
                proposedFootprint={proposedFootprint}
                splitLine={splitLine}
                easements={live.easements}
                buildings={live.buildings}
                treeDbhMm={treeDbhMm}
                treeLon={treeLon}
                treeLat={treeLat}
                tool={mapTool}
                distancePoints={distancePoints}
                areaPoints={areaPoints}
                onMapClick={(p) => {
                  if (mapTool === 'tree') {
                    setPendingTreePoint(p);
                    setDbhModalOpen(true);
                  } else if (mapTool === 'distance') {
                    setDistancePoints((prev) => [...prev, p]);
                  } else if (mapTool === 'area') {
                    setAreaPoints((prev) => [...prev, p]);
                  }
                }}
                onParcelClick={async ([clickLon, clickLat]) => {
                  setActiveTab('overview');
                  try {
                    const nearest = await reverseGeocodeNearest(clickLon, clickLat);
                    if (nearest) {
                      setQuery(nearest.result.displayName);
                      await applyVicPlan(
                        nearest.result.displayName,
                        nearest.result.lon,
                        nearest.result.lat,
                      );
                    }
                  } catch (e) {
                    console.warn('[parcel-click] reverse-geocode failed', e);
                  }
                }}
                hoverInfo={{
                  zoneLabel: t('hoverTipZone'),
                  zoneValue: live.vicPlan.zoneCode
                    ? live.vicPlan.zoneDescription
                      ? `${live.vicPlan.zoneDescription} (${live.vicPlan.zoneCode})`
                      : live.vicPlan.zoneCode
                    : null,
                  overlayLabel: t('hoverTipOverlay'),
                  overlayValue:
                    live.vicPlan.overlayRaw.length > 0
                      ? live.vicPlan.overlayRaw.join(', ')
                      : null,
                }}
                className={presentationMode ? 'absolute inset-0 h-full w-full' : 'absolute inset-0 h-full w-full'}
              />
              {presentationMode && (
                <div className="absolute bottom-8 left-8 right-8 rounded border border-zinc-200 bg-white/95 p-6 shadow-2xl backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
                  <div className="flex items-center gap-5">
                    <div className="fze-14 shrink-0 items-center justify-center border border-zinc-300 dark:border-zinc-700">
                      <Logo size={28} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
                        {pick(STATUS_LABELS[result.status], lang)}
                      </p>
                      <p className="mt-1 truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        {live.displayName}
                      </p>
                      <div className="mt-2 flrap gap-x-6 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                        <span>{t('lotSize')}: {lotSize} m²</span>
                        <span>{t('gfa')}: {gfa} m²</span>
                        {zoneLine && <span>{t('zone')}: {zoneLine}</span>}
                      </div>
                    </div>
                    <div className={`flex size-16 shrink-0 items-center justify-center rounded-full border-4 ${isExempt ? 'border-[#E9E778] bg-[#E9E778]/15 dark:border-[#E9E778] dark:bg-[#E9E778]/10' : 'border-zinc-700 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900'}`}>
                      <span className="text-2xl">
                        {isExempt ? '✓' : '!'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <div
        aria-hidden
        data-print-root
        style={{
          position: 'fixed',
          left: '-99999px',
          top: 0,
          pointerEvents: 'none',
        }}
      >
        <div ref={printRef}>
          <PrintReport lang={lang} data={reportData} />
        </div>
      </div>

      {dbhModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
              {t('dbhModalTitle')}
            </p>
            <label className="mt-5 block">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                {t('dbhInputLabel')}
              </span>
              <input
                type="number"
                min={50}
                max={2000}
                step={10}
                autoFocus
                value={dbhInputMm}
                onChange={(e) => setDbhInputMm(Number(e.target.value))}
                className="mt-2 block w-full border border-zinc-300 bg-white px-3 py-2 font-mono text-lg tabular-nums text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
            <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
              {t('dbhStandardNote')}
            </p>
            <p className="mt-3 font-mono text-sm tabular-nums text-zinc-700 dark:text-zinc-300">
              TPZ radius = {tpzRadiusM(dbhInputMm).toFixed(2)} m
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDbhModalOpen(false);
                  setPendingTreePoint(null);
                  setMapTool('pan');
                }}
                className="border border-zinc-300 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {t('dbhCancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingTreePoint && dbhInputMm > 0) {
                    setTreeLon(pendingTreePoint[0]);
                    setTreeLat(pendingTreePoint[1]);
                    setTreeDbhMm(dbhInputMm);
                  }
                  setDbhModalOpen(false);
                  setPendingTreePoint(null);
                  setMapTool('pan');
                }}
                className="border-2 border-zinc-950 bg-zinc-950 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {t('dbhConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className="uppercase tracking-[0.18em]">{label}</span>
      <span className="text-zinc-700 dark:text-zinc-300">{value}</span>
    </span>
  );
}

function SourceBadge({
  source,
  fallback,
}: {
  source: string;
  fallback?: boolean;
}) {
  const tooltip =
    'Professional Site Verification Recommended · 建议由建筑师进行专业现场核实';
  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1.5 border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.18em] ${
        fallback
          ? 'border-[#E9E778] text-[#E9E778]'
          : 'border-zinc-600 text-zinc-300'
      }`}
    >
      <span
        className={`size-1 rounded-full ${fallback ? 'bg-[#E9E778]' : 'bg-zinc-400'}`}
      />
      {source}
    </span>
  );
}

function priceSourceLabel(s: PriceSource, lang: Lang): string {
  if (s === 'verified')
    return lang === 'en' ? 'Source: Verified Sale' : '来源:已核实成交';
  if (s === 'domain') return lang === 'en' ? 'Source: Domain (Verified)' : '来源:Domain(已核实)';
  if (s === 'vg')
    return lang === 'en' ? 'Source: Valuer-General' : '来源:估价总署';
  return lang === 'en' ? 'Source: TBC' : '来源:待定';
}

function areaSourceLabel(s: AreaSource, lang: Lang): string {
  if (s === 'verified')
    return lang === 'en' ? 'Source: Verified Title' : '来源:已核实地契';
  if (s === 'vicmap')
    return lang === 'en' ? 'Source: Vicmap Calculation' : '来源:Vicmap 计算';
  if (s === 'domain') return lang === 'en' ? 'Source: Domain' : '来源:Domain';
  return lang === 'en' ? 'Source: TBC' : '来源:待定';
}

function councilSourceLabel(s: CouncilSource, lang: Lang): string {
  if (s === 'vicmap-admin')
    return lang === 'en' ? 'Source: Vicmap_Admin' : '来源:Vicmap_Admin';
  return lang === 'en' ? 'Source: TBC' : '来源:待定';
}

function formatDistance(m: number): string {
  if (m >= 1000) {
    return `${(m / 1000).toFixed(1)} km`;
  }
  return `${m} m`;
}

function HouseholdPie({
  data,
}: {
  data: { family: number; lonePerson: number; groupOrOther: number };
}) {
  // Render a 64×64 SVG donut. Three arcs in Acid Lime, charcoal, and a
  // mid-grey accent — proportions sum to 100. Stroke-dasharray drives the
  // segments; the trick is to lay the arcs on the circumference of a
  // circle whose radius is chosen so 2πr ≈ 100 (r ≈ 15.915) — then each
  // segment's percentage maps 1:1 onto its dash length.
  const r = 15.915;
  const cx = 21;
  const cy = 21;
  const total = data.family + data.lonePerson + data.groupOrOther;
  if (total === 0) return null;
  const family = (data.family / total) * 100;
  const lone = (data.lonePerson / total) * 100;
  const group = (data.groupOrOther / total) * 100;
  return (
    <svg
      viewBox="0 0 42 42"
      width={88}
      height={88}
      aria-label="Household composition"
      role="img"
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="transparent"
        stroke="#f4f4f5"
        strokeWidth={6}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="transparent"
        stroke="#E9E778"
        strokeWidth={6}
        strokeDasharray={`${family} ${100 - family}`}
        strokeDashoffset={25}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="transparent"
        stroke="#241F21"
        strokeWidth={6}
        strokeDasharray={`${lone} ${100 - lone}`}
        strokeDashoffset={25 - family}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="transparent"
        stroke="#a1a1aa"
        strokeWidth={6}
        strokeDasharray={`${group} ${100 - group}`}
        strokeDashoffset={25 - family - lone}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </svg>
  );
}

type RiskCriterionRow = {
  category: string;
  label: string;
  status: 'pass' | 'fail' | 'warning';
  detail?: string;
};

function buildRiskCriteria(input: {
  lang: Lang;
  lotSize: number;
  gfa: number;
  activeOverlays: OverlayCode[];
  siteConditions: SiteConditions;
  easementsCount: number;
  treeDbhMm: number;
}): RiskCriterionRow[] {
  const { lang, lotSize, gfa, activeOverlays, siteConditions, easementsCount, treeDbhMm } = input;
  const en = lang === 'en';
  const cat = {
    lot: en ? 'Lot' : '地块',
    plan: en ? 'Planning' : '规划',
    site: en ? 'Site' : '场地',
    services: en ? 'Services' : '服务',
    trees: en ? 'Trees' : '树木',
  };
  const rows: RiskCriterionRow[] = [
    {
      category: cat.lot,
      label: en ? `Lot size ≥ ${SSD_MIN_LOT_SIZE_M2} m²` : `地块面积 ≥ ${SSD_MIN_LOT_SIZE_M2} m²`,
      status: lotSize >= SSD_MIN_LOT_SIZE_M2 ? 'pass' : 'fail',
      detail: `${lotSize} m²`,
    },
    {
      category: cat.lot,
      label: en ? `GFA ≤ ${SSD_MAX_GFA_M2} m²` : `建筑面积 ≤ ${SSD_MAX_GFA_M2} m²`,
      status: gfa <= SSD_MAX_GFA_M2 ? 'pass' : 'fail',
      detail: `${gfa} m²`,
    },
    {
      category: cat.plan,
      label: en ? 'Disqualifying overlays' : '限制性覆盖区',
      status: activeOverlays.length === 0 ? 'pass' : 'warning',
      detail:
        activeOverlays.length === 0
          ? en ? 'None' : '无'
          : activeOverlays.join(', '),
    },
    {
      category: cat.site,
      label: en ? 'Frontage adequate' : '正面宽度满足',
      status: siteConditions.frontageOk ? 'pass' : 'fail',
    },
    {
      category: cat.site,
      label: en ? 'Slope manageable' : '坡度可控',
      status: siteConditions.slopeOk ? 'pass' : 'warning',
    },
    {
      category: cat.services,
      label: en ? 'Side access available' : '侧面通道可用',
      status: siteConditions.sideAccessOk ? 'pass' : 'warning',
    },
    {
      category: cat.trees,
      label: en ? 'Tree canopy clear' : '树冠不构成限制',
      status: siteConditions.treeCanopyOk ? 'pass' : 'warning',
    },
    {
      category: cat.plan,
      label: en ? 'Easements' : '地役权',
      status: easementsCount === 0 ? 'pass' : 'warning',
      detail:
        easementsCount === 0
          ? en ? 'None recorded' : '无记录'
          : en ? `${easementsCount} recorded` : `共 ${easementsCount} 条`,
    },
  ];
  if (treeDbhMm > 0) {
    rows.push({
      category: cat.trees,
      label: en ? 'TPZ noted' : '已标注 TPZ',
      status: 'warning',
      detail: en ? `DBH ${treeDbhMm} mm` : `胸径 ${treeDbhMm} mm`,
    });
  }
  return rows;
}

function LanguageToggle({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <button
        type="button"
        onClick={() => onChange('en')}
        aria-pressed={lang === 'en'}
        className={`transition-colors ${
          lang === 'en'
            ? 'font-medium text-zinc-950 dark:text-zinc-50'
            : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
        }`}
      >
        English
      </button>
      <span aria-hidden className="text-zinc-300 dark:text-zinc-700">·</span>
      <button
        type="button"
        onClick={() => onChange('zh')}
        aria-pressed={lang === 'zh'}
        className={`transition-colors ${
          lang === 'zh'
            ? 'font-medium text-zinc-950 dark:text-zinc-50'
            : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
        }`}
      >
        简体中文
      </button>
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-20 border-t border-zinc-200 pt-10 dark:border-zinc-900">
      <div className="flex items-baseline gap-4 text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
        <span className="font-mono">{number}</span>
        <span>{title}</span>
      </div>
      {children}
    </section>
  );
}

function SiteToggle({
  label,
  hint,
  yesLabel,
  noLabel,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  yesLabel: string;
  noLabel: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const baseBtn =
    'px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] transition-colors';
  const on =
    'bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950';
  const off =
    'border border-zinc-300 text-zinc-500 hover:text-zinc-950 dark:border-zinc-700 dark:hover:text-zinc-50';
  return (
    <li className="flex items-start justify-between gap-4 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-900 dark:text-zinc-100">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{hint}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          aria-pressed={value}
          onClick={() => onChange(true)}
          className={`${baseBtn} ${value ? on : off}`}
        >
          {yesLabel}
        </button>
        <button
          type="button"
          aria-pressed={!value}
          onClick={() => onChange(false)}
          className={`${baseBtn} ${!value ? on : off}`}
        >
          {noLabel}
        </button>
      </div>
    </li>
  );
}
