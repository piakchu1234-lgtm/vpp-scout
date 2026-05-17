'use client';

import { useEffect, useMemo, useState } from 'react';
import { Show, SignInButton, UserButton } from '@clerk/nextjs';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { MapPreview, type MapTool } from '@/components/MapPreview';
import { RegulatoryModal } from '@/components/RegulatoryModal';
import { RiskMatrix } from '@/components/RiskMatrix';
import type { GeocodeSuggestion } from '@/lib/geocoding';
import { reverseGeocodeNearest } from '@/lib/geocoding';
import { fetchPropertyData, type PropertyData } from '@/lib/propertyData';
import { calculateFrontage } from '@/lib/propertyGeometry';
import {
  fetchNearestSchools,
  type NearestSchools,
  type School,
} from '@/lib/schoolApi';
import {
  computeSetbacks,
  computeSiteCoverage,
  type Setbacks,
  type SiteCoverage,
} from '@/lib/spatial';
import {
  computeProfitMetrics,
  defaultSalePriceForLga,
  PROFIT_DEFAULTS,
  type ProfitMetrics,
} from '@/lib/profitCalculator';
import {
  getGlossaryEntry,
  type GlossaryEntry,
} from '@/lib/regulatoryGlossary';
import type {
  FeasibilityReport,
  ReportRequest,
  ReportResponse,
  ReportSiteMetrics,
} from '@/lib/report';

type Lang = 'en' | 'zh';
type TabId = 'details' | 'zoning' | 'profit' | 'report';

const TAB_LABELS: Record<TabId, Record<Lang, string>> = {
  details: { en: 'Property Details', zh: '物业详情' },
  zoning: { en: 'Zoning & ResCode', zh: '分区与 ResCode' },
  profit: { en: 'Profit Analysis', zh: '利润分析' },
  report: { en: 'AI Report', zh: 'AI 报告' },
};

const T = {
  brand: 'SimplySite',
  signIn: { en: 'Sign in', zh: '登录' },
  searchPlaceholder: { en: 'Search address…', zh: '搜索地址…' },
  searchHint: {
    en: 'Search an address to anchor the map',
    zh: '搜索地址以定位地图',
  },
  selected: { en: 'Selected', zh: '已选地块' },
  loading: { en: 'Loading planning data…', zh: '正在加载规划数据…' },
  loadError: {
    en: 'Failed to load planning data.',
    zh: '加载规划数据失败。',
  },
  detailsTitle: { en: 'Property Details', zh: '物业详情' },
  detailsIntro: {
    en: 'Core site metrics derived from the cadastral parcel and lot geometry.',
    zh: '依据地籍地块与几何形状推导的核心场地指标。',
  },
  zoningTitle: { en: 'Zoning & ResCode', zh: '分区与 ResCode' },
  zoningIntro: {
    en: 'Victoria Planning Provisions context for this site, including overlays and ResCode standards (Clauses 54 / 55).',
    zh: '维多利亚州规划条款 (VPP) 适用于本场地的内容，包括规划覆盖区与 ResCode 标准 (Clause 54 / 55)。',
  },
  profitTitle: { en: 'Profit Analysis', zh: '利润分析' },
  profitIntro: {
    en: 'Develop-and-sell pro-forma. Adjust the inputs to test scenarios; each row overrides a default baseline.',
    zh: '开发出售估算模型。调整下方参数以测试不同场景；每一项均覆盖默认基线。',
  },
  reportTitle: { en: 'AI Report', zh: 'AI 报告' },
  reportIntro: {
    en: 'Bilingual feasibility brief — Senior Victorian Architect persona, SSD 2026 + NCC 2026 logic.',
    zh: '双语可行性简报 — 资深维多利亚州建筑师视角，基于 SSD 2026 + NCC 2026 逻辑。',
  },
  lotArea: { en: 'Lot area', zh: '地块面积' },
  frontage: { en: 'Frontage', zh: '临街面' },
  council: { en: 'Council', zh: '地方政府' },
  spi: { en: 'SPI', zh: 'SPI' },
  siteCoverage: { en: 'Site coverage', zh: '场地覆盖率' },
  frontSetback: { en: 'Front setback', zh: '前退界' },
  sideSetback: { en: 'Side setback (min)', zh: '侧退界 (最小)' },
  rearSetback: { en: 'Rear setback', zh: '后退界' },
  zoneLabel: { en: 'Zone', zh: '分区' },
  overlays: { en: 'Overlays', zh: '规划覆盖区' },
  noOverlays: {
    en: 'No HO / BMO / FO / SBO / DDO intersections at this point.',
    zh: '此处未检测到 HO / BMO / FO / SBO / DDO 任何覆盖区相交。',
  },
  schemeCodes: { en: 'Scheme codes', zh: '规划方案代码' },
  rescode: { en: 'ResCode standards', zh: 'ResCode 标准' },
  rescodeBody: {
    en: 'Clause 54 / 55 setback, site coverage and amenity tests run against the lot geometry once selected.',
    zh: '选定地块后，Clause 54 / 55 的退界、场地覆盖与舒适性测试将基于几何形状自动运行。',
  },
  awaitingParcel: { en: 'Awaiting parcel selection.', zh: '等待选取地块。' },
  vacantLot: { en: 'Vacant lot', zh: '空地' },
  noBuilding: { en: 'No building detected', zh: '未检测到建筑物' },
  dwellings: { en: 'Dwellings', zh: '住宅数量' },
  constructionCost: { en: 'Construction cost / unit', zh: '单套建造成本' },
  salePrice: { en: 'Target sale price / unit', zh: '单套目标售价' },
  siteCost: { en: 'Site purchase cost', zh: '土地购置成本' },
  grv: { en: 'Gross Realization Value (GRV)', zh: '项目总销售回款 (GRV)' },
  tdc: { en: 'Total Development Cost (TDC)', zh: '开发总成本 (TDC)' },
  softCosts: {
    en: 'Soft costs (design, levies, finance)',
    zh: '软成本 (设计、规费、融资)',
  },
  netProfit: { en: 'Net profit (before tax)', zh: '税前净利润' },
  roi: { en: 'Project ROI', zh: '项目投资回报率' },
  profitDisclaimer: {
    en: 'Indicative only — excludes GST, holding costs, agent commission, and contingency. Refine with a quantity surveyor.',
    zh: '仅供参考 — 不含 GST、持有成本、代理佣金及备用金。请咨询测量工程师 (QS) 进一步细化。',
  },
  generateReport: { en: 'Generate report', zh: '生成报告' },
  generating: { en: 'Generating…', zh: '生成中…' },
  downloadPdf: { en: 'Download PDF', zh: '下载 PDF' },
  reportCta: {
    en: 'Side-by-side English and Mandarin assessment of development capacity, zoning context, ResCode considerations, and risk.',
    zh: '英文与中文并列呈现：开发容量、分区背景、ResCode 注意事项与风险评估。',
  },
  reportAvail: {
    en: 'Available once a site is selected',
    zh: '请先选择地块',
  },
  printGenerated: { en: 'Generated', zh: '生成于' },
  printDisclaimer: {
    en: 'Indicative only. Verify with a registered town planner before relying on this brief.',
    zh: '仅供参考。在采用本简报建议前请咨询注册城市规划师确认。',
  },
  verdict: { en: 'Verdict', zh: '初步判定' },
  summary: { en: 'Summary', zh: '摘要' },
  devCapacity: { en: 'Development capacity', zh: '开发容量' },
  zoningAnalysis: { en: 'Zoning analysis', zh: '分区分析' },
  rescodeConsiderations: {
    en: 'ResCode considerations',
    zh: 'ResCode 注意事项',
  },
  risks: { en: 'Risks', zh: '风险评估' },
  recommendation: { en: 'Recommendation', zh: '建议' },
  toolPan: { en: 'Pan', zh: '平移' },
  toolDistance: { en: 'Distance', zh: '距离' },
  toolArea: { en: 'Area', zh: '面积' },
  toolClear: { en: 'Clear', zh: '清除' },
  marketTitle: { en: 'Market & Sales', zh: '市场与成交' },
  lastSold: { en: 'Last sold', zh: '最近成交价' },
  lastSoldDate: { en: 'Sale date', zh: '成交日期' },
  comparables: { en: 'Comparable sales', zh: '近期可比成交' },
  noComparables: { en: 'No comparable sales available.', zh: '暂无可比成交数据。' },
  streetViewTitle: { en: 'Street View', zh: '街景' },
  streetViewShow: { en: 'Show street view', zh: '查看街景' },
  streetViewHide: { en: 'Hide street view', zh: '隐藏街景' },
  streetViewDemo: {
    en: 'Demo image — set NEXT_PUBLIC_GOOGLE_PLACES_API_KEY to enable live Street View.',
    zh: '示例图 — 请配置 NEXT_PUBLIC_GOOGLE_PLACES_API_KEY 以启用实时街景。',
  },
  schoolsTitle: { en: 'School Catchments', zh: '学区' },
  schoolsPrimary: { en: 'Primary', zh: '小学' },
  schoolsSecondary: { en: 'Secondary', zh: '中学' },
  schoolsLoading: { en: 'Loading schools…', zh: '正在加载学校数据…' },
  schoolsDemo: {
    en: 'Seeded demo data — connect a live boundary feed to upgrade.',
    zh: '示例数据 — 接入实时学区数据后将自动升级。',
  },
  riskTitle: { en: 'Safety & Hazard Risk', zh: '安全与灾害风险' },
  riskOpen: { en: 'Open risk matrix', zh: '展开风险矩阵' },
  riskClose: { en: 'Close risk matrix', zh: '收起风险矩阵' },
  riskVerdictClear: { en: 'No hazard overlays detected', zh: '未检测到灾害类覆盖区' },
  riskVerdictPresent: {
    en: 'Hazard overlay present — review the matrix below',
    zh: '存在灾害类覆盖区 — 请查看下方矩阵',
  },
  riskBushfire: { en: 'Bushfire', zh: '山火' },
  riskFlood: { en: 'Flood', zh: '洪水' },
  riskHeritage: { en: 'Heritage', zh: '遗产' },
  riskEnvironment: { en: 'Environment', zh: '环境' },
  riskLandslide: { en: 'Landslide', zh: '山体滑坡' },
};

function t(key: keyof typeof T, lang: Lang): string {
  const v = T[key];
  if (typeof v === 'string') return v;
  return v[lang];
}

const MELBOURNE_CBD = { lat: -37.8136, lon: 144.9631 };
const LIME = '#E9E778';

type SelectedSite = {
  lat: number;
  lon: number;
  label: string;
} | null;

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

export default function Home() {
  const [lang, setLang] = useState<Lang>('en');
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [query, setQuery] = useState('');
  const [site, setSite] = useState<SelectedSite>(null);
  const [data, setData] = useState<PropertyData | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [glossaryEntry, setGlossaryEntry] = useState<GlossaryEntry | null>(null);
  const [printable, setPrintable] = useState<PrintablePayload | null>(null);
  const [mapTool, setMapTool] = useState<MapTool>('pan');
  const [distancePoints, setDistancePoints] = useState<[number, number][]>([]);
  const [areaPoints, setAreaPoints] = useState<[number, number][]>([]);
  const [schools, setSchools] = useState<NearestSchools | null>(null);

  const handleSelect = (s: GeocodeSuggestion) => {
    setQuery(s.displayName);
    setSite({ lat: s.lat, lon: s.lon, label: s.displayName });
  };

  const handleParcelClick = async (lonLat: [number, number]) => {
    const [lon, lat] = lonLat;
    setSite({ lat, lon, label: `${lat.toFixed(5)}, ${lon.toFixed(5)}` });
    setQuery('');
    try {
      const hit = await reverseGeocodeNearest(lon, lat);
      if (hit) {
        setQuery(hit.result.displayName);
        setSite({
          lat: hit.result.lat,
          lon: hit.result.lon,
          label: hit.result.displayName,
        });
      }
    } catch (err) {
      console.warn('[page] reverse geocode failed', err);
    }
  };

  useEffect(() => {
    if (!site) {
      setData(null);
      setLoadState('idle');
      setErrorMsg(null);
      setSchools(null);
      setDistancePoints([]);
      setAreaPoints([]);
      return;
    }
    let cancelled = false;
    setLoadState('loading');
    setErrorMsg(null);
    fetchPropertyData(site.label, site.lon, site.lat)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoadState('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Failed to load property data';
        console.warn('[page] fetchPropertyData failed', err);
        setErrorMsg(msg);
        setLoadState('error');
      });
    fetchNearestSchools(site.lat, site.lon)
      .then((result) => {
        if (!cancelled) setSchools(result);
      })
      .catch((err) => {
        if (!cancelled) console.warn('[page] fetchNearestSchools failed', err);
      });
    return () => {
      cancelled = true;
    };
  }, [site]);

  const handleMapClick = (lonLat: [number, number]) => {
    if (mapTool === 'distance') {
      setDistancePoints((prev) => [...prev, lonLat]);
    } else if (mapTool === 'area') {
      setAreaPoints((prev) => [...prev, lonLat]);
    }
  };

  const handleClearMeasurements = () => {
    setDistancePoints([]);
    setAreaPoints([]);
    setMapTool('pan');
  };

  // Print on next paint after the printable root mounts.
  useEffect(() => {
    if (!printable) return;
    const handle = window.setTimeout(() => {
      window.print();
      setPrintable(null);
    }, 50);
    return () => window.clearTimeout(handle);
  }, [printable]);

  const frontageM = data?.parcel ? calculateFrontage(data.parcel) : null;
  const coverage = data?.parcel
    ? computeSiteCoverage(data.parcel, data.buildings)
    : null;
  const setbacks = data?.parcel
    ? computeSetbacks(data.parcel, data.buildings)
    : null;

  return (
    <div className="flex h-screen flex-col bg-zinc-50 text-zinc-900">
      <Header
        lang={lang}
        onLangChange={setLang}
        query={query}
        onQueryChange={setQuery}
        onSelect={handleSelect}
      />
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <MapPanel
          site={site}
          data={data}
          onParcelClick={handleParcelClick}
          lang={lang}
          mapTool={mapTool}
          onToolChange={setMapTool}
          distancePoints={distancePoints}
          areaPoints={areaPoints}
          onMapClick={handleMapClick}
          onClearMeasurements={handleClearMeasurements}
        />
        <DataPanel
          lang={lang}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          site={site}
          data={data}
          schools={schools}
          loadState={loadState}
          errorMsg={errorMsg}
          frontageM={frontageM}
          coverage={coverage}
          setbacks={setbacks}
          onOverlayClick={(entry) => setGlossaryEntry(entry)}
          onPrint={(p) => setPrintable(p)}
        />
      </div>

      {glossaryEntry && (
        <RegulatoryModal
          entry={glossaryEntry}
          lang={lang}
          lga={data?.councilName ?? null}
          onClose={() => setGlossaryEntry(null)}
        />
      )}

      {printable && (
        <div
          data-print-root
          className="pointer-events-none fixed left-[-99999px] top-0"
        >
          <PrintableSummary payload={printable} lang={lang} />
        </div>
      )}
    </div>
  );
}

function Header({
  lang,
  onLangChange,
  query,
  onQueryChange,
  onSelect,
}: {
  lang: Lang;
  onLangChange: (l: Lang) => void;
  query: string;
  onQueryChange: (v: string) => void;
  onSelect: (s: GeocodeSuggestion) => void;
}) {
  return (
    <header className="relative z-30 flex h-14 flex-shrink-0 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur-md sm:px-6">
      <div className="flex flex-1 items-center gap-4">
        <span
          className="text-sm font-semibold tracking-tight text-zinc-900"
          style={{
            backgroundImage: `linear-gradient(transparent 62%, ${LIME} 62%, ${LIME} 92%, transparent 92%)`,
          }}
        >
          {T.brand}
        </span>
        <div className="hidden h-6 w-px bg-zinc-200 sm:block" />
        <div className="hidden flex-1 sm:block sm:max-w-md">
          <AddressAutocomplete
            value={query}
            onValueChange={onQueryChange}
            onSelect={onSelect}
            placeholder={t('searchPlaceholder', lang)}
            ariaLabel="Address search"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <LanguageToggle lang={lang} onChange={onLangChange} />
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900">
              {t('signIn', lang)}
            </button>
          </SignInButton>
        </Show>
        <Show when="signed-in">
          <UserButton appearance={{ elements: { avatarBox: 'h-8 w-8' } }} />
        </Show>
      </div>
    </header>
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
    <div className="flex items-center rounded-md border border-zinc-200 bg-white p-0.5 text-[11px] font-medium">
      {(['en', 'zh'] as const).map((code) => {
        const active = lang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            className="rounded-sm px-2 py-1 transition"
            style={{
              background: active ? LIME : 'transparent',
              color: active ? '#1a1a14' : '#52525b',
            }}
            aria-pressed={active}
          >
            {code === 'en' ? 'EN' : '中文'}
          </button>
        );
      })}
    </div>
  );
}

function MapPanel({
  site,
  data,
  onParcelClick,
  lang,
  mapTool,
  onToolChange,
  distancePoints,
  areaPoints,
  onMapClick,
  onClearMeasurements,
}: {
  site: SelectedSite;
  data: PropertyData | null;
  onParcelClick: (lonLat: [number, number]) => void;
  lang: Lang;
  mapTool: MapTool;
  onToolChange: (t: MapTool) => void;
  distancePoints: [number, number][];
  areaPoints: [number, number][];
  onMapClick: (lonLat: [number, number]) => void;
  onClearMeasurements: () => void;
}) {
  const lat = site?.lat ?? MELBOURNE_CBD.lat;
  const lon = site?.lon ?? MELBOURNE_CBD.lon;
  return (
    <section
      aria-label="Mapbox canvas container"
      className="relative h-[55vh] flex-shrink-0 overflow-hidden bg-[#1b1d22] lg:h-auto lg:flex-1 lg:basis-[60%]"
    >
      <MapPreview
        key={`${lat},${lon}`}
        lat={lat}
        lon={lon}
        lang={lang}
        polygon={data?.parcel ?? null}
        easements={data?.easements ?? []}
        buildings={data?.buildings ?? []}
        onParcelClick={onParcelClick}
        tool={mapTool}
        distancePoints={distancePoints}
        areaPoints={areaPoints}
        onMapClick={onMapClick}
        className="absolute inset-0 h-full w-full border-0"
      />
      <MapToolbar
        lang={lang}
        mapTool={mapTool}
        onToolChange={onToolChange}
        onClear={onClearMeasurements}
        canClear={distancePoints.length > 0 || areaPoints.length > 0}
      />
      {!site && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
          <div className="rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[11px] font-medium tracking-wide text-zinc-200 backdrop-blur-md">
            {t('searchHint', lang)}
          </div>
        </div>
      )}
    </section>
  );
}

function MapToolbar({
  lang,
  mapTool,
  onToolChange,
  onClear,
  canClear,
}: {
  lang: Lang;
  mapTool: MapTool;
  onToolChange: (t: MapTool) => void;
  onClear: () => void;
  canClear: boolean;
}) {
  const tools: { id: MapTool; label: string }[] = [
    { id: 'pan', label: t('toolPan', lang) },
    { id: 'distance', label: t('toolDistance', lang) },
    { id: 'area', label: t('toolArea', lang) },
  ];
  return (
    <div className="absolute left-3 top-3 z-20 flex items-center gap-1 rounded-md border border-white/10 bg-black/55 p-1 text-[11px] font-medium text-zinc-200 backdrop-blur-md">
      {tools.map((tool) => {
        const active = mapTool === tool.id;
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => onToolChange(tool.id)}
            className="rounded px-2 py-1 transition"
            style={{
              background: active ? LIME : 'transparent',
              color: active ? '#1a1a14' : '#e4e4e7',
            }}
          >
            {tool.label}
          </button>
        );
      })}
      <div className="mx-1 h-4 w-px bg-white/20" />
      <button
        type="button"
        onClick={onClear}
        disabled={!canClear}
        className="rounded px-2 py-1 text-zinc-200 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t('toolClear', lang)}
      </button>
    </div>
  );
}

type PrintablePayload =
  | { kind: 'report'; site: SelectedSite; data: PropertyData | null; report: FeasibilityReport }
  | {
      kind: 'profit';
      site: SelectedSite;
      data: PropertyData | null;
      inputs: ProfitInputs;
      metrics: ProfitMetrics;
    };

type ProfitInputs = {
  dwellings: number;
  constructionCostPerUnit: number;
  salePricePerUnit: number;
  sitePurchaseCost: number;
};

function DataPanel({
  lang,
  activeTab,
  onTabChange,
  site,
  data,
  schools,
  loadState,
  errorMsg,
  frontageM,
  coverage,
  setbacks,
  onOverlayClick,
  onPrint,
}: {
  lang: Lang;
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
  site: SelectedSite;
  data: PropertyData | null;
  schools: NearestSchools | null;
  loadState: LoadState;
  errorMsg: string | null;
  frontageM: number | null;
  coverage: SiteCoverage | null;
  setbacks: Setbacks | null;
  onOverlayClick: (entry: GlossaryEntry) => void;
  onPrint: (payload: PrintablePayload) => void;
}) {
  const tabs: TabId[] = ['details', 'zoning', 'profit', 'report'];
  return (
    <aside className="flex flex-1 flex-col overflow-hidden border-zinc-200 bg-white lg:basis-[40%] lg:border-l">
      <nav
        role="tablist"
        aria-label="Property analysis sections"
        className="flex flex-shrink-0 overflow-x-auto border-b border-zinc-200 px-4 sm:px-6"
      >
        {tabs.map((id) => {
          const active = id === activeTab;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(id)}
              className={`relative -mb-px shrink-0 py-3 px-3 text-xs font-medium tracking-wide transition first:pl-0 ${
                active ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {TAB_LABELS[id][lang]}
              {active && (
                <span
                  className="absolute inset-x-3 bottom-0 h-[2px] first:left-0"
                  style={{ background: LIME }}
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'details' && (
          <PropertyDetailsPanel
            lang={lang}
            site={site}
            data={data}
            schools={schools}
            loadState={loadState}
            errorMsg={errorMsg}
            frontageM={frontageM}
            coverage={coverage}
            setbacks={setbacks}
          />
        )}
        {activeTab === 'zoning' && (
          <ZoningPanel
            lang={lang}
            data={data}
            loadState={loadState}
            errorMsg={errorMsg}
            onOverlayClick={onOverlayClick}
          />
        )}
        {activeTab === 'profit' && (
          <ProfitAnalysisPanel
            lang={lang}
            site={site}
            data={data}
            onPrint={onPrint}
          />
        )}
        {activeTab === 'report' && (
          <AiReportPanel
            lang={lang}
            site={site}
            data={data}
            frontageM={frontageM}
            coverage={coverage}
            setbacks={setbacks}
            onPrint={onPrint}
          />
        )}
      </div>
    </aside>
  );
}

function PanelShell({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div role="tabpanel" className="px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500"
          style={{ borderLeft: `3px solid ${LIME}`, paddingLeft: '0.5rem' }}
        >
          {number}
        </p>
        <h2 className="mt-2 text-base font-semibold tracking-tight text-zinc-900">
          {title}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

function MetricRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-zinc-100 py-3 last:border-b-0">
      <div>
        <p className="text-xs font-medium text-zinc-700">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-zinc-400">{hint}</p>}
      </div>
      <p className="font-mono text-sm tabular-nums text-zinc-900">{value}</p>
    </div>
  );
}

function LoadBanner({
  lang,
  loadState,
  errorMsg,
}: {
  lang: Lang;
  loadState: LoadState;
  errorMsg: string | null;
}) {
  if (loadState === 'loading') {
    return (
      <div className="mb-4 rounded-md border border-zinc-200 bg-white px-3 py-2 text-[11px] text-zinc-500">
        {t('loading', lang)}
      </div>
    );
  }
  if (loadState === 'error') {
    return (
      <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
        {errorMsg ?? t('loadError', lang)}
      </div>
    );
  }
  return null;
}

function PropertyDetailsPanel({
  lang,
  site,
  data,
  schools,
  loadState,
  errorMsg,
  frontageM,
  coverage,
  setbacks,
}: {
  lang: Lang;
  site: SelectedSite;
  data: PropertyData | null;
  schools: NearestSchools | null;
  loadState: LoadState;
  errorMsg: string | null;
  frontageM: number | null;
  coverage: SiteCoverage | null;
  setbacks: Setbacks | null;
}) {
  const lotAreaM2 = data?.area.valueM2 ?? null;
  const councilLabel = data?.councilName ?? data?.council.contact?.name ?? null;
  const spi = data?.spi ?? null;

  return (
    <PanelShell
      number="01"
      title={t('detailsTitle', lang)}
      description={t('detailsIntro', lang)}
    >
      {site && (
        <div
          className="mb-4 rounded-md border bg-zinc-50 px-3 py-2"
          style={{ borderLeft: `3px solid ${LIME}`, borderColor: '#e4e4e7' }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            {t('selected', lang)}
          </p>
          <p className="mt-0.5 text-xs font-medium text-zinc-900">
            {site.label}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
            {site.lat.toFixed(5)}, {site.lon.toFixed(5)}
          </p>
        </div>
      )}

      <LoadBanner lang={lang} loadState={loadState} errorMsg={errorMsg} />

      <div className="rounded-md border border-zinc-200">
        <div className="px-4">
          <MetricRow
            label={t('lotArea', lang)}
            value={lotAreaM2 != null ? `${lotAreaM2.toLocaleString()} m²` : '—'}
            hint={areaSourceHint(data)}
          />
          <MetricRow
            label={t('frontage', lang)}
            value={frontageM != null ? `${frontageM.toFixed(1)} m` : '—'}
            hint={lang === 'en' ? 'Shortest cadastral edge' : '最短地籍边'}
          />
          <MetricRow
            label={t('council', lang)}
            value={councilLabel ?? '—'}
            hint="Vicmap_Admin"
          />
          <MetricRow
            label={t('spi', lang)}
            value={spi ?? '—'}
            hint={lang === 'en' ? 'Standard Parcel Identifier' : 'Standard Parcel Identifier'}
          />
          <MetricRow
            label={t('siteCoverage', lang)}
            value={
              coverage
                ? `${coverage.pct.toFixed(1)}%`
                : data?.parcel
                ? '0%'
                : '—'
            }
            hint={
              coverage
                ? `${coverage.coveredM2.toLocaleString()} m² / ${coverage.lotM2.toLocaleString()} m²`
                : lang === 'en'
                ? 'Built form ÷ lot'
                : '建筑面积 ÷ 地块'
            }
          />
          <MetricRow
            label={t('frontSetback', lang)}
            value={
              setbacks
                ? `${setbacks.frontM.toFixed(1)} m`
                : data?.parcel
                ? t('vacantLot', lang)
                : '—'
            }
            hint={
              lang === 'en'
                ? 'Longest edge → nearest building corner'
                : '最长边 → 最近建筑角点'
            }
          />
          <MetricRow
            label={t('sideSetback', lang)}
            value={
              setbacks
                ? `${setbacks.sideMinM.toFixed(1)} m`
                : data?.parcel
                ? t('noBuilding', lang)
                : '—'
            }
            hint={lang === 'en' ? 'Binding side edge' : '决定性侧边'}
          />
          <MetricRow
            label={t('rearSetback', lang)}
            value={
              setbacks
                ? `${setbacks.rearM.toFixed(1)} m`
                : data?.parcel
                ? t('vacantLot', lang)
                : '—'
            }
            hint={lang === 'en' ? 'Opposite the frontage' : '临街面对侧'}
          />
        </div>
      </div>

      <MarketCard lang={lang} data={data} />
      <StreetViewCard lang={lang} site={site} />
      <SchoolsCard lang={lang} schools={schools} />
    </PanelShell>
  );
}

function areaSourceHint(data: PropertyData | null): string {
  if (!data) return 'm²';
  switch (data.area.source) {
    case 'verified':
      return 'Verified record';
    case 'vicmap':
      return 'Vicmap cadastral';
    case 'domain':
      return 'Domain enrichment';
    default:
      return 'm²';
  }
}

function ZoningPanel({
  lang,
  data,
  loadState,
  errorMsg,
  onOverlayClick,
}: {
  lang: Lang;
  data: PropertyData | null;
  loadState: LoadState;
  errorMsg: string | null;
  onOverlayClick: (entry: GlossaryEntry) => void;
}) {
  const zoneCode = data?.vicPlan.zoneCode ?? null;
  const zoneDescription = data?.vicPlan.zoneDescription ?? null;
  const overlayCodes = data?.vicPlan.overlayCodes ?? [];
  const overlayRaw = data?.vicPlan.overlayRaw ?? [];

  const handleZoneClick = () => {
    if (!zoneCode) return;
    const entry = getGlossaryEntry(zoneCode);
    if (entry) onOverlayClick(entry);
  };

  const handleOverlayClick = (code: string) => {
    const entry = getGlossaryEntry(code);
    if (entry) onOverlayClick(entry);
  };

  return (
    <PanelShell
      number="02"
      title={t('zoningTitle', lang)}
      description={t('zoningIntro', lang)}
    >
      <LoadBanner lang={lang} loadState={loadState} errorMsg={errorMsg} />

      <div className="space-y-3">
        <div className="rounded-md border border-zinc-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-zinc-900">
              {T.zoneLabel.en}
            </p>
            <span className="text-[11px] text-zinc-400">{T.zoneLabel.zh}</span>
          </div>
          {zoneCode ? (
            <button
              type="button"
              onClick={handleZoneClick}
              className="mt-2 block w-full text-left"
            >
              <p className="font-mono text-sm tracking-tight text-zinc-900 underline decoration-dotted decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900">
                {zoneCode}
              </p>
              {zoneDescription && (
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                  {zoneDescription}
                </p>
              )}
            </button>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              {t('awaitingParcel', lang)}
            </p>
          )}
        </div>

        <div className="rounded-md border border-zinc-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-zinc-900">
              {T.overlays.en}
            </p>
            <span className="text-[11px] text-zinc-400">{T.overlays.zh}</span>
          </div>
          {overlayCodes.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {overlayCodes.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleOverlayClick(c)}
                  className="rounded-sm border px-2 py-0.5 font-mono text-[11px] text-zinc-900 transition hover:text-black"
                  style={{
                    borderColor: '#E9E778',
                    background: '#FBFADC',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          ) : data ? (
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              {t('noOverlays', lang)}
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              {t('awaitingParcel', lang)}
            </p>
          )}
          {overlayRaw.length > 0 && (
            <p className="mt-2 font-mono text-[10px] leading-relaxed text-zinc-400">
              {t('schemeCodes', lang)}: {overlayRaw.join(', ')}
            </p>
          )}
        </div>

        <div className="rounded-md border border-zinc-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-zinc-900">ResCode</p>
            <span className="text-[11px] text-zinc-400">
              {t('rescode', lang)}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {t('rescodeBody', lang)}
          </p>
        </div>

        <RiskAccordion lang={lang} data={data} />
      </div>
    </PanelShell>
  );
}

function ProfitAnalysisPanel({
  lang,
  site,
  data,
  onPrint,
}: {
  lang: Lang;
  site: SelectedSite;
  data: PropertyData | null;
  onPrint: (payload: PrintablePayload) => void;
}) {
  const lgaName = data?.councilName ?? data?.council.contact?.name ?? null;
  const [dwellings, setDwellings] = useState<number>(2);
  const [constructionCostPerUnit, setConstructionCostPerUnit] =
    useState<number>(PROFIT_DEFAULTS.constructionCostPerUnit);
  const [salePricePerUnit, setSalePricePerUnit] = useState<number>(
    defaultSalePriceForLga(lgaName),
  );
  const [sitePurchaseCost, setSitePurchaseCost] = useState<number>(
    data?.price.valueAud ?? PROFIT_DEFAULTS.sitePurchaseCost,
  );

  // Re-baseline sale price + site cost when the property data resolves
  // for a new site. Only fire on lgaName / price-value changes so manual
  // slider tweaks don't get clobbered by re-renders.
  useEffect(() => {
    setSalePricePerUnit(defaultSalePriceForLga(lgaName));
  }, [lgaName]);
  useEffect(() => {
    if (data?.price.valueAud) setSitePurchaseCost(data.price.valueAud);
  }, [data?.price.valueAud]);

  const metrics = useMemo<ProfitMetrics>(
    () =>
      computeProfitMetrics({
        dwellings,
        constructionCostPerUnit,
        salePricePerUnit,
        sitePurchaseCost,
        softCostFraction: PROFIT_DEFAULTS.softCostFraction,
      }),
    [dwellings, constructionCostPerUnit, salePricePerUnit, sitePurchaseCost],
  );

  const canPrint = Boolean(site);

  return (
    <PanelShell
      number="03"
      title={t('profitTitle', lang)}
      description={t('profitIntro', lang)}
    >
      <div className="space-y-3">
        <NumberInputRow
          label={t('dwellings', lang)}
          value={dwellings}
          onChange={setDwellings}
          step={1}
          min={1}
        />
        <NumberInputRow
          label={t('constructionCost', lang)}
          value={constructionCostPerUnit}
          onChange={setConstructionCostPerUnit}
          step={10000}
          min={0}
          prefix="$"
        />
        <NumberInputRow
          label={t('salePrice', lang)}
          value={salePricePerUnit}
          onChange={setSalePricePerUnit}
          step={10000}
          min={0}
          prefix="$"
        />
        <NumberInputRow
          label={t('siteCost', lang)}
          value={sitePurchaseCost}
          onChange={setSitePurchaseCost}
          step={10000}
          min={0}
          prefix="$"
        />
      </div>

      <div className="mt-6 rounded-md border border-zinc-200">
        <div className="px-4">
          <MetricRow
            label={t('grv', lang)}
            value={formatAud(metrics.grossRealizationValue)}
          />
          <MetricRow
            label={t('tdc', lang)}
            value={formatAud(metrics.totalDevelopmentCost)}
          />
          <MetricRow
            label={t('softCosts', lang)}
            value={formatAud(metrics.softCostsTotal)}
            hint={`${(PROFIT_DEFAULTS.softCostFraction * 100).toFixed(0)}%`}
          />
          <MetricRow
            label={t('netProfit', lang)}
            value={formatAud(metrics.netProfit)}
          />
          <MetricRow
            label={t('roi', lang)}
            value={
              metrics.roiPct != null ? `${metrics.roiPct.toFixed(1)}%` : '—'
            }
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!canPrint}
        onClick={() =>
          site &&
          onPrint({
            kind: 'profit',
            site,
            data,
            inputs: {
              dwellings,
              constructionCostPerUnit,
              salePricePerUnit,
              sitePurchaseCost,
            },
            metrics,
          })
        }
        className="mt-4 inline-flex h-9 items-center justify-center rounded-md px-4 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: LIME, color: '#1a1a14' }}
      >
        {t('downloadPdf', lang)}
      </button>

      <p className="mt-4 text-[11px] leading-relaxed text-zinc-400">
        {t('profitDisclaimer', lang)}
      </p>
    </PanelShell>
  );
}

function NumberInputRow({
  label,
  value,
  onChange,
  step,
  min,
  prefix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  prefix?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2">
      <span className="text-xs font-medium text-zinc-700">{label}</span>
      <div className="flex items-center gap-1">
        {prefix && (
          <span className="font-mono text-xs text-zinc-400">{prefix}</span>
        )}
        <input
          type="number"
          value={value}
          step={step}
          min={min}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          className="w-28 rounded border border-zinc-200 bg-white px-2 py-1 text-right font-mono text-xs tabular-nums text-zinc-900 outline-none focus:border-zinc-500"
        />
      </div>
    </label>
  );
}

function formatAud(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function AiReportPanel({
  lang,
  site,
  data,
  frontageM,
  coverage,
  setbacks,
  onPrint,
}: {
  lang: Lang;
  site: SelectedSite;
  data: PropertyData | null;
  frontageM: number | null;
  coverage: SiteCoverage | null;
  setbacks: Setbacks | null;
  onPrint: (payload: PrintablePayload) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<FeasibilityReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = Boolean(site && data);

  const handleGenerate = async () => {
    if (!site || !data) return;
    setGenerating(true);
    setError(null);
    setReport(null);

    const metrics: ReportSiteMetrics = {
      address: site.label,
      lat: site.lat,
      lon: site.lon,
      spi: data.spi,
      council: data.councilName ?? data.council.contact?.name ?? null,
      zoneCode: data.vicPlan.zoneCode,
      zoneDescription: data.vicPlan.zoneDescription,
      overlayCodes: data.vicPlan.overlayCodes,
      overlayRaw: data.vicPlan.overlayRaw,
      lotAreaM2: data.area.valueM2,
      frontageM,
      siteCoveragePct: coverage ? coverage.pct : null,
      setbackFrontM: setbacks ? setbacks.frontM : null,
      setbackSideMinM: setbacks ? setbacks.sideMinM : null,
      setbackRearM: setbacks ? setbacks.rearM : null,
    };

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ metrics } satisfies ReportRequest),
      });
      const json = (await res.json()) as ReportResponse;
      if (!json.ok) {
        setError(json.error);
      } else {
        setReport(json.report);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <PanelShell
      number="04"
      title={t('reportTitle', lang)}
      description={t('reportIntro', lang)}
    >
      <div
        className="rounded-md border bg-zinc-50 p-4"
        style={{ borderLeft: `3px solid ${LIME}`, borderColor: '#e4e4e7' }}
      >
        <p className="text-xs font-medium text-zinc-900">
          {t('reportTitle', lang)}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
          {t('reportCta', lang)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="inline-flex h-9 items-center justify-center rounded-md px-4 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: LIME, color: '#1a1a14' }}
          >
            {generating ? t('generating', lang) : t('generateReport', lang)}
          </button>
          {report && site && (
            <button
              type="button"
              onClick={() =>
                onPrint({ kind: 'report', site, data, report })
              }
              className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-900 bg-white px-4 text-xs font-medium text-zinc-900 transition hover:bg-zinc-900 hover:text-white"
            >
              {t('downloadPdf', lang)}
            </button>
          )}
        </div>
        {!canGenerate && (
          <p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-400">
            {t('reportAvail', lang)}
          </p>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          {error}
        </div>
      )}

      {report && <ReportView report={report} lang={lang} />}
    </PanelShell>
  );
}

function ReportView({
  report,
  lang,
}: {
  report: FeasibilityReport;
  lang: Lang;
}) {
  const sections: { key: keyof FeasibilityReport; titleKey: keyof typeof T }[] = [
    { key: 'verdict', titleKey: 'verdict' },
    { key: 'summary', titleKey: 'summary' },
    { key: 'developmentCapacity', titleKey: 'devCapacity' },
    { key: 'zoningAnalysis', titleKey: 'zoningAnalysis' },
    { key: 'rescodeConsiderations', titleKey: 'rescodeConsiderations' },
    { key: 'risks', titleKey: 'risks' },
    { key: 'recommendation', titleKey: 'recommendation' },
  ];
  return (
    <div className="mt-6 space-y-5">
      {sections.map(({ key, titleKey }) => (
        <div
          key={key}
          className="overflow-hidden rounded-md border border-zinc-200"
        >
          <div
            className="border-b px-3 py-1.5"
            style={{ background: '#FBFADC', borderColor: '#e4e4e7' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-700">
              {t(titleKey, lang)}
            </p>
          </div>
          <div className="grid grid-cols-1 divide-y divide-zinc-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                EN
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-800">
                {report[key].en}
              </p>
            </div>
            <div className="px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                ZH
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-800">
                {report[key].zh}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Printable summary (browser-native print → PDF) ----------

function PrintableSummary({
  payload,
  lang,
}: {
  payload: PrintablePayload;
  lang: Lang;
}) {
  const now = new Date();
  return (
    <div className="bg-white p-12 text-zinc-900">
      <div
        className="mb-6 flex items-end justify-between border-b-2 pb-3"
        style={{ borderColor: '#1a1a14' }}
      >
        <div>
          <p className="text-2xl font-bold tracking-tight">
            <span
              style={{
                backgroundImage: `linear-gradient(transparent 62%, ${LIME} 62%, ${LIME} 92%, transparent 92%)`,
              }}
            >
              {T.brand}
            </span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {payload.kind === 'report'
              ? t('reportTitle', lang)
              : t('profitTitle', lang)}
          </p>
        </div>
        <p className="font-mono text-[10px] text-zinc-500">
          {t('printGenerated', lang)}: {now.toISOString().slice(0, 16).replace('T', ' ')}
        </p>
      </div>

      {payload.site && (
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            {t('selected', lang)}
          </p>
          <p className="mt-1 text-base font-semibold">{payload.site.label}</p>
          <p className="font-mono text-[11px] text-zinc-500">
            {payload.site.lat.toFixed(5)}, {payload.site.lon.toFixed(5)}
          </p>
          {payload.data && (
            <p className="mt-1 text-xs text-zinc-600">
              {payload.data.vicPlan.zoneCode ?? '—'} ·{' '}
              {payload.data.vicPlan.overlayCodes.join(', ') || 'no overlays'} ·{' '}
              {payload.data.area.valueM2
                ? `${payload.data.area.valueM2.toLocaleString()} m²`
                : '—'}
            </p>
          )}
        </div>
      )}

      {payload.kind === 'report' ? (
        <PrintableReportBody report={payload.report} lang={lang} />
      ) : (
        <PrintableProfitBody
          inputs={payload.inputs}
          metrics={payload.metrics}
          lang={lang}
        />
      )}

      <p className="mt-10 border-t pt-3 text-[10px] leading-relaxed text-zinc-500">
        {t('printDisclaimer', lang)}
      </p>
    </div>
  );
}

function PrintableReportBody({
  report,
  lang,
}: {
  report: FeasibilityReport;
  lang: Lang;
}) {
  const sections: { key: keyof FeasibilityReport; titleKey: keyof typeof T }[] = [
    { key: 'verdict', titleKey: 'verdict' },
    { key: 'summary', titleKey: 'summary' },
    { key: 'developmentCapacity', titleKey: 'devCapacity' },
    { key: 'zoningAnalysis', titleKey: 'zoningAnalysis' },
    { key: 'rescodeConsiderations', titleKey: 'rescodeConsiderations' },
    { key: 'risks', titleKey: 'risks' },
    { key: 'recommendation', titleKey: 'recommendation' },
  ];
  return (
    <div className="space-y-4">
      {sections.map(({ key, titleKey }) => (
        <div key={key} className="break-inside-avoid">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-700"
            style={{ borderLeft: `3px solid ${LIME}`, paddingLeft: '0.5rem' }}
          >
            {t(titleKey, lang)}
          </p>
          <div className="mt-1 grid grid-cols-2 gap-4 text-[11px] leading-relaxed">
            <p>{report[key].en}</p>
            <p>{report[key].zh}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function PrintableProfitBody({
  inputs,
  metrics,
  lang,
}: {
  inputs: ProfitInputs;
  metrics: ProfitMetrics;
  lang: Lang;
}) {
  const rows: { label: string; value: string }[] = [
    { label: t('dwellings', lang), value: `${inputs.dwellings}` },
    {
      label: t('constructionCost', lang),
      value: formatAud(inputs.constructionCostPerUnit),
    },
    {
      label: t('salePrice', lang),
      value: formatAud(inputs.salePricePerUnit),
    },
    { label: t('siteCost', lang), value: formatAud(inputs.sitePurchaseCost) },
    { label: t('grv', lang), value: formatAud(metrics.grossRealizationValue) },
    {
      label: t('tdc', lang),
      value: formatAud(metrics.totalDevelopmentCost),
    },
    { label: t('softCosts', lang), value: formatAud(metrics.softCostsTotal) },
    { label: t('netProfit', lang), value: formatAud(metrics.netProfit) },
    {
      label: t('roi', lang),
      value: metrics.roiPct != null ? `${metrics.roiPct.toFixed(1)}%` : '—',
    },
  ];
  return (
    <table className="w-full text-[11px]">
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-b border-zinc-200">
            <td className="py-2 pr-4">{r.label}</td>
            <td className="py-2 text-right font-mono tabular-nums">
              {r.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------- Property Details supplementary cards ----------

function CardShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 rounded-md border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-4 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          {title}
        </p>
        {subtitle && (
          <p className="mt-0.5 text-[11px] text-zinc-400">{subtitle}</p>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function MarketCard({
  lang,
  data,
}: {
  lang: Lang;
  data: PropertyData | null;
}) {
  if (!data) return null;
  const domain = data.domain;
  const lastSoldPrice = domain?.lastSoldPrice ?? null;
  const lastSoldDate = domain?.lastSoldDate ?? null;
  const comparables = (domain?.comparableSales ?? []).slice(0, 4);
  const isDemo = domain?.isDemoData ?? false;

  if (!lastSoldPrice && comparables.length === 0) return null;

  return (
    <CardShell
      title={t('marketTitle', lang)}
      subtitle={
        isDemo
          ? lang === 'en'
            ? 'Seeded demo — connect Domain API key to upgrade.'
            : '示例数据 — 配置 Domain API 密钥后将自动升级。'
          : 'Domain enrichment'
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-400">
            {t('lastSold', lang)}
          </p>
          <p className="mt-0.5 font-mono text-sm tabular-nums text-zinc-900">
            {lastSoldPrice ? formatAud(lastSoldPrice) : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-400">
            {t('lastSoldDate', lang)}
          </p>
          <p className="mt-0.5 font-mono text-sm tabular-nums text-zinc-900">
            {lastSoldDate ?? '—'}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-[10px] uppercase tracking-wider text-zinc-400">
          {t('comparables', lang)}
        </p>
        {comparables.length === 0 ? (
          <p className="mt-1 text-[11px] text-zinc-500">
            {t('noComparables', lang)}
          </p>
        ) : (
          <table className="mt-2 w-full text-[11px]">
            <tbody>
              {comparables.map((c, i) => (
                <tr
                  key={`${c.address}-${i}`}
                  className="border-t border-zinc-100 first:border-t-0"
                >
                  <td className="py-1.5 pr-2 text-zinc-700">{c.address}</td>
                  <td className="py-1.5 pr-2 text-right font-mono tabular-nums text-zinc-900">
                    {formatAud(c.price)}
                  </td>
                  <td className="py-1.5 text-right font-mono tabular-nums text-zinc-400">
                    {c.saleDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </CardShell>
  );
}

function StreetViewCard({
  lang,
  site,
}: {
  lang: Lang;
  site: SelectedSite;
}) {
  const [open, setOpen] = useState(false);
  if (!site) return null;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const embedSrc = apiKey
    ? `https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${site.lat},${site.lon}&heading=0&pitch=0&fov=80`
    : null;
  return (
    <CardShell title={t('streetViewTitle', lang)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50"
      >
        {open ? t('streetViewHide', lang) : t('streetViewShow', lang)}
      </button>
      {open && (
        <div className="mt-3">
          {embedSrc ? (
            <div className="overflow-hidden rounded-md border border-zinc-200">
              <iframe
                src={embedSrc}
                title="Google Street View"
                allow="accelerometer; gyroscope"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                className="block aspect-[5/3] w-full"
              />
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center">
              <p className="text-[11px] text-zinc-500">
                {t('streetViewDemo', lang)}
              </p>
              <p className="mt-1 font-mono text-[10px] text-zinc-400">
                NEXT_PUBLIC_GOOGLE_MAPS_KEY
              </p>
            </div>
          )}
        </div>
      )}
    </CardShell>
  );
}

function SchoolsCard({
  lang,
  schools,
}: {
  lang: Lang;
  schools: NearestSchools | null;
}) {
  if (!schools) {
    return (
      <CardShell title={t('schoolsTitle', lang)}>
        <p className="text-[11px] text-zinc-500">{t('schoolsLoading', lang)}</p>
      </CardShell>
    );
  }
  return (
    <CardShell
      title={t('schoolsTitle', lang)}
      subtitle={schools.isDemoData ? t('schoolsDemo', lang) : undefined}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SchoolColumn label={t('schoolsPrimary', lang)} list={schools.primary} />
        <SchoolColumn
          label={t('schoolsSecondary', lang)}
          list={schools.secondary}
        />
      </div>
    </CardShell>
  );
}

function SchoolColumn({ label, list }: { label: string; list: School[] }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <ul className="mt-1 space-y-1.5">
        {list.map((s) => (
          <li
            key={s.name}
            className="flex items-baseline justify-between border-b border-zinc-100 pb-1 text-[11px]"
          >
            <span className="text-zinc-800">{s.name}</span>
            <span className="font-mono tabular-nums text-zinc-500">
              {s.distanceM} m
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Risk matrix (Zoning tab) ----------

type RiskRow = {
  category: string;
  label: string;
  status: 'pass' | 'fail' | 'warning';
  detail?: string;
};

function buildRiskCriteria(
  data: PropertyData | null,
  lang: Lang,
): RiskRow[] {
  const overlays = data?.vicPlan.overlayCodes ?? [];
  const overlayRaw = data?.vicPlan.overlayRaw ?? [];
  const has = (c: string) => overlays.includes(c as never);
  const hasRawPrefix = (prefix: string) =>
    overlayRaw.some((code) => code.toUpperCase().startsWith(prefix));
  const en = lang === 'en';
  const hasEmo = hasRawPrefix('EMO');

  return [
    {
      category: t('riskBushfire', lang),
      label: en ? 'Bushfire Management Overlay (BMO)' : '山火管理覆盖区 (BMO)',
      status: has('BMO') ? 'fail' : 'pass',
      detail: has('BMO')
        ? en
          ? 'BMO present — bushfire attack level (BAL) assessment required; construction must meet AS 3959.'
          : '存在 BMO — 需进行 BAL 山火攻击等级评估，建造须符合 AS 3959。'
        : en
        ? 'No BMO intersection at this point.'
        : '此处未与 BMO 相交。',
    },
    {
      category: t('riskFlood', lang),
      label: en
        ? 'Flood / LSIO / SBO overlays'
        : 'Flood / LSIO / SBO 覆盖区',
      status: has('FO') ? 'fail' : 'pass',
      detail: has('FO')
        ? en
          ? 'Flood-related overlay present (FO, LSIO or SBO) — habitable floor levels and stormwater flow paths trigger planning permit requirements.'
          : '存在 FO / LSIO / SBO 类覆盖区 — 可居住楼层高程与雨洪排放路径将触发规划许可要求。'
        : en
        ? 'No FO / LSIO / SBO intersection.'
        : '未检测到 FO / LSIO / SBO 相交。',
    },
    {
      category: t('riskHeritage', lang),
      label: en ? 'Heritage Overlay (HO)' : '遗产覆盖区 (HO)',
      status: has('HO') ? 'warning' : 'pass',
      detail: has('HO')
        ? en
          ? 'HO present — demolition, external alteration, and subdivision require a planning permit; SSD pathway likely inapplicable.'
          : '存在 HO — 拆除、外立面改建与分割均需规划许可；SSD 路径通常不适用。'
        : en
        ? 'No HO intersection.'
        : '未检测到 HO 相交。',
    },
    {
      category: t('riskEnvironment', lang),
      label: en
        ? 'Environmental overlays (DDO / VPO / DCPO)'
        : '环境类覆盖区 (DDO / VPO / DCPO)',
      status:
        has('DDO') || has('DCPO') || has('VPO') ? 'warning' : 'pass',
      detail:
        has('DDO') || has('DCPO') || has('VPO')
          ? en
            ? 'Design / vegetation / contribution overlay present — additional permit conditions and built-form controls apply.'
            : '存在设计 / 植被 / 贡献类覆盖区 — 附加许可条件与建筑形态管控生效。'
          : en
          ? 'No environmental-overlay intersection.'
          : '未检测到环境类覆盖区相交。',
    },
    {
      category: t('riskLandslide', lang),
      label: en
        ? 'Erosion Management Overlay (EMO)'
        : '侵蚀管理覆盖区 (EMO)',
      status: hasEmo ? 'fail' : 'pass',
      detail: hasEmo
        ? en
          ? 'EMO present — geotechnical assessment required; siting, footings, and stormwater design must address slope-stability and erosion risk under the responsible authority\'s conditions.'
          : '存在 EMO — 须进行岩土工程评估；选址、基础与雨洪排放设计须满足责任机构对边坡稳定与侵蚀风险的条件。'
        : en
        ? 'No EMO intersection — landslide hazard not flagged at this point.'
        : '未检测到 EMO 相交 — 此处未标记山体滑坡风险。',
    },
  ];
}

function RiskAccordion({
  lang,
  data,
}: {
  lang: Lang;
  data: PropertyData | null;
}) {
  const [open, setOpen] = useState(false);
  const criteria = buildRiskCriteria(data, lang);
  const hasHazard = criteria.some((c) => c.status !== 'pass');
  const verdict = hasHazard
    ? t('riskVerdictPresent', lang)
    : t('riskVerdictClear', lang);

  return (
    <div className="rounded-md border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div>
          <p className="text-xs font-medium text-zinc-900">
            {t('riskTitle', lang)}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">{verdict}</p>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{
            background: hasHazard ? '#FEF3C7' : '#E9E778',
            color: '#1a1a14',
          }}
        >
          {hasHazard ? '!' : '✓'}
        </span>
      </button>
      {open && (
        <div className="border-t border-zinc-100 px-2 pb-2">
          <RiskMatrix
            lang={lang}
            criteria={criteria}
          />
        </div>
      )}
    </div>
  );
}

