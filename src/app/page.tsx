'use client';

import { useMemo, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { Logo } from '@/components/Logo';
import { MapPreview, type MapPreviewHandle } from '@/components/MapPreview';
import { PrintReport, type PrintReportData } from '@/components/PrintReport';
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
import {
  geocodeAddress,
  reverseGeocodeNearest,
  type GeocodeSuggestion,
} from '@/lib/geocoding';
import {
  fetchVicParcelForPoint,
  fetchVicPlanForPoint,
  type ParcelPolygon,
  type VicPlanData,
} from '@/lib/vicPlanApi';
import {
  fetchDomainPropertyData,
  type DomainPropertyData,
} from '@/lib/domainApi';

type Lang = 'en' | 'zh';
type DataSource = 'mock' | 'live';

const ALL_OVERLAY_CODES = Object.keys(OVERLAYS) as OverlayCode[];

const T = {
  brand: { en: 'LandCheckFirst', zh: 'LandCheckFirst' },
  eyebrow: { en: 'Victoria Planning Provisions', zh: '维多利亚州规划条款' },
  title: {
    en: '2026 Small Second Dwelling Feasibility',
    zh: '2026 小型第二住宅可行性',
  },
  intro: {
    en: 'Search a Victorian address. LandCheckFirst queries the live planning scheme for zone and overlays, then assesses the 2026 Small Second Dwelling permit-exempt pathway.',
    zh: '搜索维多利亚州地址。LandCheckFirst 将实时查询规划方案的分区与覆盖区,并依据 2026 小型第二住宅豁免规划许可路径进行评估。',
  },
  sectionSearch: { en: 'Address', zh: '地址搜索' },
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
    zh: '仅供参考。完整的 2026 小型第二住宅路径还包括地块正面宽度、坡度、市政服务、邻里特征及住宅设计准则等评估条件,本页面未予体现。',
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
  warningPrefix: { en: 'Warning', zh: '警告' },
  generateReport: { en: 'Generate PDF Report', zh: '生成 PDF 报告' },
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
    zh: '住宅设计准则要求建筑师现场确认的人工核查项,均须为「是」方可适用 SSD 豁免规划许可路径。',
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
    zh: '住宅设计准则最低值',
  },
  gardenExempt: {
    en: 'Garden Area standard does not apply to lots under 400 m².',
    zh: '地块面积不足 400 m²,不适用花园面积标准。',
  },
  gardenWarning: {
    en: 'Available garden area falls below the ResCode minimum once the proposed SSD is added.',
    zh: '加上拟建小型第二住宅后,可用花园面积低于住宅设计准则最低要求。',
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
    en: 'Adjust to match your project budget. Typical SSD construction ranges $3,000–$4,500/m² in Victoria (2026).',
    zh: '根据项目预算调整。维多利亚州典型 SSD 建造成本为 $3,000–$4,500/m²(2026 年)。',
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
    en: 'LandCheckFirst Verified: Planning Permit Exempt',
    zh: 'LandCheckFirst 已验证:豁免规划许可',
  },
} as const;

function pick<T extends { en: string; zh: string }>(obj: T, lang: Lang) {
  return lang === 'en' ? obj.en : obj.zh;
}

type LiveResult = {
  displayName: string;
  lat: number;
  lon: number;
  polygon: ParcelPolygon | null;
  vicPlan: VicPlanData;
  domain: DomainPropertyData | null;
};

export default function Home() {
  const [lang, setLang] = useState<Lang>('en');
  const [lotSize, setLotSize] = useState(400);
  const [gfa, setGfa] = useState(50);
  const [dpuIntent, setDpuIntent] = useState(false);
  const [overlayState, setOverlayState] = useState<Record<OverlayCode, boolean>>({
    HO: false,
    BMO: false,
    FO: false,
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
  const [treeOffsetX, setTreeOffsetX] = useState(0);
  const [treeOffsetY, setTreeOffsetY] = useState(0);
  const [presentationMode, setPresentationMode] = useState(false);
  const [constructionCost, setConstructionCost] = useState(200000);
  const [siteInspectorOpen, setSiteInspectorOpen] = useState(false);
  const [source, setSource] = useState<DataSource>('mock');
  const [live, setLive] = useState<LiveResult | null>(null);
  const [mapSnapshot, setMapSnapshot] = useState<string | null>(null);

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
      }),
    [lotSize, activeOverlays, siteConditions, existingCoverage, gfa],
  );

  const gardenReq = useMemo(() => getGardenRequirement(lotSize), [lotSize]);
  const availableGarden = Math.max(0, lotSize - existingCoverage - gfa);
  const requiredGarden = gardenReq ? lotSize * gardenReq.fraction : 0;
  const gardenShort = gardenReq ? availableGarden < requiredGarden : false;

  const envelope = useMemo(
    () => (live?.polygon ? computeBuildingEnvelope(live.polygon) : null),
    [live?.polygon],
  );

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
  const strAnnual = 58000;
  const paybackLtr = constructionCost / ltrAnnual;
  const paybackStr = constructionCost / strAnnual;

  // DPU countdown
  const dpuDeadline = new Date('2027-03-28');
  const now = new Date();
  const daysRemaining = Math.max(0, Math.floor((dpuDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const monthsRemaining = Math.floor(daysRemaining / 30);

  async function applyVicPlan(displayName: string, lon: number, lat: number) {
    const parcelPromise = fetchVicParcelForPoint(lon, lat).catch((e) => {
      console.warn('[parcel] fetch failed, continuing without boundary', e);
      return null;
    });
    const domainPromise = fetchDomainPropertyData(displayName, lat, lon).catch((e) => {
      console.warn('[domain] fetch failed, continuing without enrichment', e);
      return null;
    });

    const [vicPlan, parcel, domain] = await Promise.all([
      fetchVicPlanForPoint(lon, lat),
      parcelPromise,
      domainPromise,
    ]);

    // Auto-map VicPlan overlays to state
    const next: Record<OverlayCode, boolean> = { HO: false, BMO: false, FO: false };
    for (const code of vicPlan.overlayCodes) next[code] = true;
    setOverlayState(next);

    // Auto-populate lot size from Domain if available
    if (domain?.lotSize) {
      setLotSize(Math.round(domain.lotSize));
    }

    // The geocoder's lon/lat is unit-level when Vicmap resolved a unit address;
    // the parcel polygon is rendered as the boundary, but the marker stays on
    // the actual address point so a townhouse / unit is never visually shifted
    // to the parent lot's centroid.
    setLive({ displayName, lat, lon, polygon: parcel, vicPlan, domain });
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

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'LandCheckFirst — 2026 SSD Feasibility Report',
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

  const reportData: PrintReportData = {
    generatedAt,
    address: { displayName: live?.displayName ?? null, sourceLabel },
    mapSnapshot,
    planning: { zoneLine, overlayLine },
    inputs: { lotSize, gfa },
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
            ? `Significant tree with ${treeDbhMm} mm diameter. TPZ radius: ${Math.round((12 * treeDbhMm) / 1000)} m (12× DBH rule).`
            : `重要树木直径 ${treeDbhMm} mm。TPZ 半径:${Math.round((12 * treeDbhMm) / 1000)} 米(12 倍 DBH 规则)。`
          : null,
    },
    specialNotes: architectNotes.trim().length > 0 ? architectNotes : null,
    disclaimer: { en: T.disclaimer.en, zh: T.disclaimer.zh },
  };

  return (
    <div className="min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-8 py-5">
          <div className="flex items-center gap-2">
            <Logo size={16} />
            <span className="text-sm font-semibold tracking-tight">{t('brand')}</span>
          </div>
          <div className="flex items-center gap-4">
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
      </header>

      <main
        className={`mx-auto px-8 pt-2b-32 ${
          live && presentationMode
            ? 'max-w-7xl'
            : live
            ? 'max-w-6xl lg:grid lg:grid-cols-[3fr_2fr] lg:gap-12'
            : 'max-w-3xl'
        }`}
      >
        <div className={`min-w-0 ${presentationMode && live ? 'hidden' : ''}`}>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
          {t('eyebrow')}
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.15] tracking-tight">
          {t('title')}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          {t('intro')}
        </p>

        <Section number="01" title={t('sectionSearch')}>
          <form onSubmit={runSearch} className="pt-8">
            <div className="flex items-center gap-3 border-b border-zinc-300 pb-3 focus-within:border-zinc-950 dark:border-zinc-700 dark:focus-within:border-zinc-100">
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
                className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-700 transition-colors hover:text-zinc-950 disabled:text-zinc-400 dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                {searching ? (
                  <>
                    <Loader2
                      aria-hidden
                      className="size-3.5 animate-spin"
                      strokeWidth={1.75}
                    />
                    {t('searching')}
                  </>
                ) : (
                  t('searchButton')
                )}
              </button>
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={searching}
                title={t('useMyLocation')}
                aria-label={t('useMyLocation')}
                className="flex items-center gap-2 border-l border-zinc-200 pl-3 text-xs font-medium uppercase tracking-[0.18em] text-zinc-700 transition-colors hover:text-zinc-950 disabled:text-zinc-400 dark:border-zinc-800 dark:text-zinc-300 dark:hover:text-zinc-50"
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

            {searchError && (
              <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">
                {t(searchError)}
              </p>
            )}

            {live && !searchError && (
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <p className="flex-1 leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {live.displayName}
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/60 bg-emerald-50 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-800 dark:border-emerald-500/50 dark:bg-emerald-950/30 dark:text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500" />
                    {live.domain ? t('dataSourceBadge') : t('dataSourceVicPlanOnly')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-zinc-500">
                  <Meta label={t('source')} value={t('sourceLive')} />
                  {live.vicPlan.zoneCode && (
                    <Meta
                      label={t('zone')}
                      value={
                        live.vicPlan.zoneDescription
                          ? `${live.vicPlan.zoneDescription} (${live.vicPlan.zoneCode})`
                          : live.vicPlan.zoneCode
                      }
                    />
                  )}
                  {live.vicPlan.overlayRaw.length > 0 && (
                    <Meta
                      label={t('overlays')}
                      value={live.vicPlan.overlayRaw.join(', ')}
                    />
                  )}
                </div>
              </div>
            )}

            {!live && !searchError && source === 'mock' && (
              <p className="mt-4 text-xs text-zinc-500">
                {t('source')} · {t('sourceMock')}
              </p>
            )}
          </form>
        </Section>

        <Section number="02" title={t('sectionInputs')}>
          <div className="py-8">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {t('lotSize')}
              </span>
              <span className="font-mono text-3xl tabular-nums">
                {lotSize}
                <span className="ml-1 text-sm text-zinc-500">m²</span>
              </span>
            </div>
            <input
              type="range"
              min={100}
              max={1000}
              step={10}
              value={lotSize}
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
            {live?.domain?.lotSize && (
              <p className="mt-4 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500" />
                {t('lotSizeAutoPopulated')}
              </p>
            )}
            {source === 'live' && !live?.domain?.lotSize && (
              <p className="mt-4 text-xs text-zinc-500">{t('lotSizeHint')}</p>
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
              <span
                className={`font-mono text-3xl tabular-nums ${
                  gfaExceeded ? 'text-amber-700 dark:text-amber-400' : ''
                }`}
              >
                {gfa}
                <span className="ml-1 text-sm text-zinc-500">m²</span>
              </span>
            </div>
            <input
              type="range"
              min={20}
              max={150}
              step={5}
              value={gfa}
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
                    ? 'border-amber-600/60 text-amber-800 dark:border-amber-500/50 dark:text-amber-300'
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
                <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500" />
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
                      <div key={code} className="flex items-center gap-2 rounded border border-amber-600/60 bg-amber-50 px-3 py-2 text-sm dark:border-amber-500/50 dark:bg-amber-950/20">
                        <span className="size-2 rounded-full bg-amber-600 dark:bg-amber-500" />
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
                {t('treeDbhLabel')}
              </span>
              <input
                type="number"
                min={0}
                max={3000}
                step={50}
                value={treeDbhMm}
                onChange={(e) => setTreeDbhMm(Number(e.target.value))}
                className="mt-3 block w-full border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                aria-label={t('treeDbhLabel')}
              />
              <p className="mt-2 text-xs text-zinc-500">{t('treeDbhHint')}</p>
            </label>
          </div>
          {treeDbhMm > 0 && (
            <div className="border-t border-zinc-200 pt-8 dark:border-zinc-900">
              <label className="block">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {t('treeOffsetLabel')}
                </span>
                <div className="mt-3 flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-zinc-500">X (E/W)</label>
                    <input
                      type="number"
                      min={-50}
                      max={50}
                      step={1}
                      value={treeOffsetX}
                      onChange={(e) => setTreeOffsetX(Number(e.target.value))}
                      className="mt-1 block w-full border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-zinc-500">Y (N/S)</label>
                    <input
                      type="number"
                      min={-50}
                      max={50}
                      step={1}
                      value={treeOffsetY}
                      onChange={(e) => setTreeOffsetY(Number(e.target.value))}
                      className="mt-1 block w-full border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-zinc-500">{t('treeOffsetHint')}</p>
              </label>
            </div>
          )}
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
                    <p className="mt-6 border border-amber-600/60 p-4 text-xs leading-relaxed text-amber-800 dark:border-amber-500/50 dark:text-amber-300">
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

        <Section number="04" title={t('sectionAssessment')}>
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
        </Section>

        <Section number="04" title={t('sectionBuilding')}>
          <p className="pt-8 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {t('buildingIntro')}
          </p>
          <ul className="mt-6 divide-y divide-zinc-200 dark:divide-zinc-900">
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
            <p className="mt-6 border border-amber-600/60 p-4 text-xs leading-relaxed text-amber-800 dark:border-amber-500/50 dark:text-amber-300">
              {t('lhdWarning')}
            </p>
          )}
        </Section>

        <Section number="05" title={t('sectionAssessment')}>
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

          <div className="py-8">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
              {t('status')}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span
                aria-hidden
                className={`inline-block size-2.5 rounded-full ${
                  isExempt ? 'bg-emerald-600' : 'bg-amber-600'
                }`}
              />
              <span className="text-2xl font-medium tracking-tight">
                {pick(STATUS_LABELS[result.status], lang)}
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
            <div className="mt-8 border border-emerald-600/60 p-5 dark:border-emerald-500/50">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-400">
                {t('solarTipLabel')}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {pick(solarTip, lang)}
              </p>
            </div>
          )}

          {easementPresent && (
            <div className="mt-8 border border-amber-600/60 p-5 dark:border-amber-500/50">
              <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-300">
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
            <div className="mt-8 border border-amber-600/60 p-5 dark:border-amber-500/50">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-amber-700 dark:text-amber-400">
                {t('warningPrefix')}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {t('gfaWarning')}
              </p>
            </div>
          )}

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
                    <span className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
                      <span className="size-1 rounded-full bg-emerald-600 dark:bg-emerald-500" />
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

            <div className="mt-6 border border-zinc-200 p-5 dark:border-zinc-900">
              <label className="block">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {t('yieldCostLabel')}
                </span>
                <input
                  type="number"
                  min={50000}
                  max={1000000}
                  step={10000}
                  value={constructionCost}
                  onChange={(e) => setConstructionCost(Number(e.target.value))}
                  className="mt-3 block w-full border border-zinc-300 bg-white px-3 py-2 font-mono text-lg text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  aria-label={t('yieldCostLabel')}
                />
             <p className="mt-2 text-xs text-zinc-500">{t('yieldCostHint')}</p>
              </label>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="border border-emerald-600/60 p-4 dark:border-emerald-500/50">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
                  {t('yieldPaybackLabel')} (LTR)
                </p>
                <p className="mt-2 font-mono text-3xl tabular-nums text-zinc-900 dark:text-zinc-100">
                  {paybackLtr.toFixed(1)}
                  <span className="ml-2 text-base text-zinc-500">{t('yieldPaybackYears')}</span>
                </p>
              </div>

              <div className="border border-emerald-600/60 p-4 dark:border-emerald-500/50">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
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
              {t('regulatoryNotices')}
            </p>

            {daysRemaining > 0 && (
              <div className="mt-4 border-l-4 border-amber-600 bg-amber-50 p-4 dark:border-amber-500 dark:bg-amber-950/20">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-800 dark:text-amber-400">
                  {t('dpuCountdownLabel')}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-amber-900 dark:text-amber-300">
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
              {T.disclaimer.en}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {T.disclaimer.zh}
            </p>
          </div>

          <div className="mt-10 flex flex-wrap justify-end gap-4">
            <a
              href="mailto:architect@landcheckfirst.com.au?subject=SSD%20Consultation%20Request"
              className="inline-flex items-center gap-2 border border-zinc-950 bg-zinc-950 px-6 py-3 text-xs font-medium uppercase tracking-[0.22em] text-white transition-colors hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {t('bookConsultation')}
            </a>
            <button
              type="button"
              onClick={() => handlePrint()}
              disabled={printing}
              className="inline-flex items-center gap-2 border border-zinc-950 px-6 py-3 text-xs font-medium uppercase tracking-[0.22em] transition-colors hover:bg-zinc-950 hover:text-white disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-400 dark:border-zinc-100 dark:hover:bg-zinc-100 dark:hover:text-zinc-950"
            >
              {printing ? (
                <>
                  <Loader2
                    aria-hidden
                    className="size-3.5 animate-spin"
                    strokeWidth={1.75}
                  />
                  {t('generatingReport')}
                </>
              ) : (
                t('generateReport')
              )}
            </button>
          </div>
        </Section>

        <p className="mt-24 max-w-xl text-xs leading-relaxed text-zinc-500">
          {lang === 'en'
            ? 'See the Assessment section above for the full bilingual disclaimer.'
            : '完整双语免责声明请参见上方「可行性评估」部分。'}
        </p>
        </div>

        {live && (
          <aside className={`mt-12 lg:mt-0 ${presentationMode ? 'fixed inset-0 top-[73px] z-50' : ''}`}>
            <div className={presentationMode ? '' : 'lg:sticky lg:top-8'}>
              <MapPreview
                ref={mapPreviewRef}
                lat={live.lat}
                lon={live.lon}
                polygon={live.polygon}
                envelope={envelope?.polygon ?? null}
                treeDbhMm={treeDbhMm}
                treeOffsetX={treeOffsetX}
                treeOffsetY={treeOffsetY}
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
                className={presentationMode ? 'h-screen w-full' : 'h-[55vh] w-full lg:h-[calc(100vh-4rem)]'}
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
                    <div className={`flex size-16 shrink-0 items-center justify-center rounded-full border-4 ${isExempt ? 'border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950' : 'border-amber-600 bg-amber-50 dark:border-amber-500 dark:bg-amber-950'}`}>
                      <span className="text-2xl">
                        {isExempt ? '✓' : '!'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </main>

      <div
        aria-hidden
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
