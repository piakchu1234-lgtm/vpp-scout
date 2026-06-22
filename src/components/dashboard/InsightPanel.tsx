'use client';

import React, { useState } from 'react';
import { Bed, Bath, Car, MapPin, Loader2, Landmark } from 'lucide-react';
import ComplianceStatus from '@/components/dashboard/ComplianceStatus';
import PlanningCard from '@/components/dashboard/PlanningCard';
import YieldCard from '@/components/dashboard/YieldCard';
import FeasibilityCard from '@/components/dashboard/FeasibilityCard';
import DocumentStorefront from '@/components/dashboard/DocumentStorefront';
import ScenarioComparison from '@/components/dashboard/ScenarioComparison';
import DemographicPanel from '@/components/dashboard/DemographicPanel';
import GardenAreaCard from '@/components/cards/GardenAreaCard';
import ParkingDeductionCard from '@/components/cards/ParkingDeductionCard';
import HighestBestUseCard from '@/components/cards/HighestBestUseCard';
import SSDComplianceCard from '@/components/cards/SSDComplianceCard';
import { Skeleton, SkeletonAttribute } from '@/components/ui/Skeleton';
import { useUserPlan } from '@/contexts/UserPlanContext';
import { FileText } from 'lucide-react';
import type { AIInsightData } from '@/app/app/page';
import type { MarketDataResult } from '@/lib/marketData';
import type { VicPlanData } from '@/lib/vicPlanApi';
import type { YieldData } from '@/lib/yieldEngine';
import type { PlanningOverlay } from '@/components/dashboard/PlanningCard';
import type { MergedMarketData } from '@/lib/agentMarketIntegration';
import { DataSourceBadge } from '@/components/ui/DataSourceBadge';
import type { DwellingCount } from '@/lib/vppCompliance';
import type { OverlayGeometry } from '@/lib/overlayService';
import type { MassingResult } from '@/lib/massingEngine';
import type { Polygon } from 'geojson';

type Lang = 'en' | 'zh';

type InsightPanelProps = {
  address: string | null;
  language: Lang;
  setLanguage: (lang: Lang) => void;
  landSizeM2: number | null;
  lotPlan: string | null;
  liveCouncil: string | null;
  lat: number;
  lon: number;
  aiInsight: AIInsightData | null;
  isLoadingAI: boolean;
  marketData: MarketDataResult | null;
  isLoadingMarket: boolean;
  mergedMarketData: MergedMarketData;
  planData: VicPlanData | null;
  overlays: PlanningOverlay[] | null;
  yieldData: YieldData;
  effectiveLandSizeM2: number | null;
  onViewReport?: () => void;
  overlayGeometries?: OverlayGeometry[];
  generatedMassing?: MassingResult | null;
};

const LABELS = {
  noAddress: { en: 'No address selected', zh: '未选择地址' },
  saveProject: { en: 'Save to Project', zh: '保存到项目' },
  viewReport: { en: 'View Report', zh: '查看报告' },
  consolidate: { en: 'Consolidate Sites', zh: '合并地块' },
  propertyDetails: { en: 'Property Details', zh: '物业详情' },
  landSize: { en: 'Land Size', zh: '地块面积' },
  planningZone: { en: 'Planning Zone', zh: '规划分区' },
  frontage: { en: 'Frontage', zh: '临街面宽' },
  orientation: { en: 'Orientation', zh: '朝向' },
  lotPlan: { en: 'Lot/Plan', zh: '地块/地籍号' },
  localContext: { en: 'Local Context', zh: '本地环境' },
  council: { en: 'Council', zh: '地方议会' },
  schoolCatchments: { en: 'School Catchments', zh: '学区范围' },
  nearbySchools: { en: 'Nearby Schools', zh: '附近学校' },
  marketAttributes: { en: 'Market Attributes', zh: '市场属性' },
  bedsBathsCars: { en: 'Beds/Baths/Cars', zh: '卧室/浴室/车位' },
  lastSold: { en: 'Last Sold', zh: '最近成交' },
  planningHazards: { en: 'Planning & Hazards', zh: '规划与灾害' },
  vppOverlays: { en: 'VPP Overlays', zh: 'VPP 覆盖区' },
  lppOverlays: { en: 'LPP Overlays', zh: 'LPP 覆盖区' },
  hazardStatus: { en: 'Hazard Status', zh: '灾害状况' },
  floodUnaffected: { en: 'Flood Unaffected', zh: '无洪水影响' },
  bushfireUnaffected: { en: 'Bushfire Unaffected', zh: '无山火影响' },
  landslideUnaffected: { en: 'Landslide Unaffected', zh: '无滑坡影响' },
  aiFeasibility: { en: 'AI Feasibility Intelligence', zh: 'AI 可行性分析' },
  loadingAI: { en: 'Analyzing site potential...', zh: '正在分析地块潜力...' },
  vacantLand: { en: 'Vacant Land', zh: '空置土地' },
  property: { en: 'Property', zh: '物业' },
  planning: { en: 'Planning', zh: '规划' },
  feasibility: { en: 'Feasibility', zh: '可行性' },
};

type TabId = 'property' | 'planning' | 'feasibility';

export default function InsightPanel({
  address,
  language,
  setLanguage,
  landSizeM2,
  lotPlan,
  liveCouncil,
  lat,
  lon,
  aiInsight,
  isLoadingAI,
  marketData,
  isLoadingMarket,
  mergedMarketData,
  planData,
  overlays,
  yieldData,
  effectiveLandSizeM2,
  onViewReport,
  overlayGeometries = [],
  generatedMassing = null,
}: InsightPanelProps) {
  // Tab state for advanced analysis sections
  const [activeTab, setActiveTab] = useState<TabId>('property');

  // User plan context for debug tier switcher
  const { plan, setPlan, remainingQuota, resetQuota } = useUserPlan();

  // Debug panel state (hidden by default, toggle with Ctrl+Shift+D)
  const [showDebug, setShowDebug] = useState(false);

  // VPP Compliance state - dwelling count for parking deduction
  const [proposedDwellingCount, setProposedDwellingCount] = useState<DwellingCount>(2);

  // SSD Compliance state
  const [ssdModeEnabled, setSsdModeEnabled] = useState(false);

  // Keyboard shortcut to toggle debug panel
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setShowDebug(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Use merged market data with source tracking
  const bedrooms = mergedMarketData.bedrooms ?? aiInsight?.bedrooms ?? null;
  const bathrooms = mergedMarketData.bathrooms ?? aiInsight?.bathrooms ?? null;
  const carspaces = marketData?.carspaces ?? aiInsight?.carspaces ?? null;
  const estimatedValue = mergedMarketData.estimatedValue;

  // Detect vacant land: explicit flag from AI OR all property metrics are 0/null
  const isVacantLand = aiInsight?.isVacantLand || (bedrooms === 0 && bathrooms === 0 && carspaces === 0);

  // Check if ANY market data exists
  const hasAnyMarketData =
    (bedrooms !== null && bedrooms > 0) ||
    (marketData?.lastSoldPrice || aiInsight?.estimatedLastSoldPrice) ||
    marketData?.yearBuilt ||
    marketData?.roofMaterial ||
    marketData?.wallMaterial;

  const formatLandSize = (m2: number | null) => {
    if (!m2 || !Number.isFinite(m2) || m2 <= 0) return '—';
    return `${Math.round(m2)} m²`;
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* 1. ACTION HEADER: Premium button layout */}
      <div className="flex flex-col gap-2">
        {/* Primary CTA: View Report */}
        <button
          type="button"
          onClick={onViewReport}
          className="w-full px-4 py-3 text-sm font-bold uppercase tracking-wider rounded-lg bg-[#E9E778] text-[#241F21] hover:bg-[#E9E778]/90 transition-colors shadow-lg"
        >
          <FileText className="inline-block w-4 h-4 mr-2" />
          {LABELS.viewReport[language]}
        </button>

        {/* Secondary Actions: Icon-first ghost buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-300 transition-colors border border-white/5"
          >
            {LABELS.saveProject[language]}
          </button>
          <button
            type="button"
            className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-300 transition-colors border border-white/5"
          >
            {LABELS.consolidate[language]}
          </button>
        </div>
      </div>

      {/* 2. ADDRESS HEADER + Language Toggle */}
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xl font-bold text-white leading-tight flex-1 min-w-0 break-words">
          {address || LABELS.noAddress[language]}
        </h2>
      </div>

      {/* DEBUG: Hidden Tier Switcher (Ctrl+Shift+D to toggle) */}
      {process.env.NODE_ENV === 'development' && showDebug && (
        <div className="rounded-lg border border-amber-600/50 bg-amber-900/20 p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-2">
            🛠️ Debug: Tier Switcher (Ctrl+Shift+D to hide)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPlan('free');
                resetQuota();
              }}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                plan === 'free'
                  ? 'bg-[#E9E778] text-[#241F21]'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              Free
            </button>
            <button
              type="button"
              onClick={() => {
                setPlan('premium');
                resetQuota();
              }}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                plan === 'premium'
                  ? 'bg-[#E9E778] text-[#241F21]'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              Premium
            </button>
            <span className="text-xs text-zinc-400 ml-2">
              Quota: {plan === 'premium' ? '∞' : `${remainingQuota}/5`}
            </span>
          </div>
        </div>
      )}

      {/* 3. PROPERTY DETAILS: Borderless data grid with skeleton loading */}
      <div className="bg-white/[0.02] rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">
          {LABELS.propertyDetails[language]}
        </h3>
        <div className="divide-y divide-white/10">
          <div className="grid grid-cols-2 gap-x-6 py-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">{LABELS.landSize[language]}</div>
              {isLoadingAI && !effectiveLandSizeM2 ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                <div className="text-white font-medium transition-opacity duration-300">
                  {formatLandSize(effectiveLandSizeM2)}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">{LABELS.planningZone[language]}</div>
              {isLoadingAI && !planData?.zoneCode && !aiInsight?.zoning ? (
                <Skeleton className="h-5 w-32" />
              ) : (
                <div className="text-white font-medium transition-opacity duration-300">
                  {planData?.zoneCode ? (
                    <span>
                      {planData.zoneCode}
                      {planData.zoneDescription && (
                        <span className="text-zinc-400 font-normal text-xs ml-1">
                          - {planData.zoneDescription}
                        </span>
                      )}
                    </span>
                  ) : (
                    aiInsight?.zoning || '—'
                  )}
                </div>
              )}
            </div>
          </div>

          {(isLoadingAI || aiInsight?.estimatedFrontage) && (
            <div className="grid grid-cols-2 gap-x-6 py-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">{LABELS.frontage[language]}</div>
                {isLoadingAI && !aiInsight?.estimatedFrontage ? (
                  <Skeleton className="h-5 w-20" />
                ) : (
                  <div className="text-white font-medium transition-opacity duration-300">
                    {aiInsight?.estimatedFrontage}
                  </div>
                )}
              </div>
            </div>
          )}

          {(isLoadingAI || lotPlan || aiInsight?.lotPlanNumber) && (
            <div className="py-3">
              <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">{LABELS.lotPlan[language]}</div>
              {isLoadingAI && !lotPlan && !aiInsight?.lotPlanNumber ? (
                <Skeleton className="h-5 w-40" />
              ) : (
                <div className="text-white font-medium transition-opacity duration-300">
                  {lotPlan || aiInsight?.lotPlanNumber}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3.6. LOCAL CONTEXT: Council & Schools */}
      <div className="bg-white/[0.02] rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
          <Landmark className="w-3.5 h-3.5" />
          {LABELS.localContext[language]}
        </h3>
        <div className="divide-y divide-white/10">
          {/* Council / LGA */}
          {(liveCouncil || aiInsight?.localCouncil) && (
            <div className="py-3">
              <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">{LABELS.council[language]}</div>
              <div className="text-white font-medium transition-opacity duration-300">
                {liveCouncil || aiInsight?.localCouncil}
              </div>
            </div>
          )}

          {/* School Catchments - Placeholder UI */}
          <div className="py-3">
            <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">{LABELS.nearbySchools[language]}</div>
            <div className="text-sm text-zinc-500 italic">
              {language === 'en' ? 'Coming soon - School zone data' : '即将推出 - 学区数据'}
            </div>
          </div>
        </div>
      </div>

      {/* 3.7. MARKET ATTRIBUTES: Borderless data grid with skeleton loading */}
      {!isVacantLand && (isLoadingMarket || hasAnyMarketData) && (
        <div className="bg-white/[0.02] rounded-lg p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center justify-between">
            {LABELS.marketAttributes[language]}
            {isLoadingMarket && (
              <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />
            )}
          </h3>
          <div className="divide-y divide-white/10">
            {/* Beds/Baths/Cars - Show skeleton or data */}
            {(isLoadingMarket || (bedrooms !== null && bedrooms > 0)) && (
              <div className="py-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs uppercase tracking-wider text-zinc-500">
                    {LABELS.bedsBathsCars[language]}
                  </div>
                  {!isLoadingMarket && bedrooms !== null && (
                    <DataSourceBadge source={mergedMarketData.source} language={language} />
                  )}
                </div>
                {isLoadingMarket && bedrooms === null ? (
                  <Skeleton className="h-5 w-40" />
                ) : (
                  <div className="text-white font-medium transition-opacity duration-300">
                    🛏️ {bedrooms} | 🛁 {bathrooms || 0} | 🚗 {carspaces || 0}
                  </div>
                )}
              </div>
            )}

            {/* Estimated Value - Show if available from agent */}
            {estimatedValue && (
              <div className="py-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs uppercase tracking-wider text-zinc-500">
                    {language === 'en' ? 'Estimated Value' : '估计价值'}
                  </div>
                  <DataSourceBadge source={mergedMarketData.source} language={language} />
                </div>
                <div className="text-white font-medium transition-opacity duration-300">
                  ${estimatedValue.toLocaleString()}
                </div>
              </div>
            )}

            {/* Last Sold Price - Show skeleton or data */}
            {(isLoadingMarket || marketData?.lastSoldPrice || aiInsight?.estimatedLastSoldPrice) && (
              <div className="py-3">
                <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">{LABELS.lastSold[language]}</div>
                {isLoadingMarket && !marketData?.lastSoldPrice && !aiInsight?.estimatedLastSoldPrice ? (
                  <Skeleton className="h-5 w-32" />
                ) : (
                  <div className="text-white font-medium transition-opacity duration-300">
                    {marketData?.lastSoldPrice || aiInsight?.estimatedLastSoldPrice}
                  </div>
                )}
              </div>
            )}

            {/* Year Built - Show skeleton or data */}
            {(isLoadingMarket || marketData?.yearBuilt) && (
              <div className="py-3">
                <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
                  {language === 'en' ? 'Year Built' : '建造年份'}
                </div>
                {isLoadingMarket && !marketData?.yearBuilt ? (
                  <Skeleton className="h-5 w-20" />
                ) : marketData?.yearBuilt ? (
                  <div className="text-white font-medium transition-opacity duration-300">
                    {marketData.yearBuilt}
                  </div>
                ) : null}
              </div>
            )}

            {/* Construction Materials - Show skeleton or data */}
            {(isLoadingMarket || marketData?.roofMaterial || marketData?.wallMaterial) && (
              <div className="py-3">
                <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
                  {language === 'en' ? 'Construction' : '建筑材料'}
                </div>
                {isLoadingMarket && !marketData?.roofMaterial && !marketData?.wallMaterial ? (
                  <Skeleton className="h-5 w-48" />
                ) : (
                  <div className="text-white font-medium text-xs transition-opacity duration-300">
                    {[marketData?.wallMaterial, marketData?.roofMaterial].filter(Boolean).join(' / ')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. ADVANCED ANALYSIS TABS */}
      <div className="border-t border-white/10 pt-4">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'property'}
            aria-controls="tab-panel-property"
            onClick={() => setActiveTab('property')}
            className={`
              flex-1 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all
              ${
                activeTab === 'property'
                  ? 'bg-[#E9E778] text-[#241F21]'
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200 border border-zinc-700'
              }
            `}
          >
            {LABELS.property[language]}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'planning'}
            aria-controls="tab-panel-planning"
            onClick={() => setActiveTab('planning')}
            className={`
              flex-1 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all
              ${
                activeTab === 'planning'
                  ? 'bg-[#E9E778] text-[#241F21]'
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200 border border-zinc-700'
              }
            `}
          >
            {LABELS.planning[language]}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'feasibility'}
            aria-controls="tab-panel-feasibility"
            onClick={() => setActiveTab('feasibility')}
            className={`
              flex-1 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all
              ${
                activeTab === 'feasibility'
                  ? 'bg-[#E9E778] text-[#241F21]'
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200 border border-zinc-700'
              }
            `}
          >
            {LABELS.feasibility[language]}
          </button>
        </div>

        {/* Tab Panels - STRICT ROUTING */}
        {activeTab === 'property' && (
          <div role="tabpanel" id="tab-panel-property" aria-labelledby="tab-property">
            {/* PROPERTY TAB: Official Property Documents (Landata) */}
            <DocumentStorefront lotPlan={lotPlan} lang={language} />
          </div>
        )}

        {activeTab === 'planning' && (
          <div role="tabpanel" id="tab-panel-planning" aria-labelledby="tab-planning">
            {/* PLANNING TAB: Zoning, Overlays, Hazards */}
            <PlanningCard
              zoneCode={planData?.zoneCode}
              zoneDescription={planData?.zoneDescription}
              overlays={overlays}
              aiInsight={aiInsight}
              effectiveLandSizeM2={effectiveLandSizeM2}
              address={address}
              lang={language}
            />
          </div>
        )}

        {activeTab === 'feasibility' && (
          <div role="tabpanel" id="tab-panel-feasibility" aria-labelledby="tab-feasibility">
            {/* FEASIBILITY TAB: AI Intelligence + SSD Compliance */}
            <div className="space-y-4">
              {/* SSD COMPLIANCE CHECKER - 2026 Victorian Reforms */}
              {effectiveLandSizeM2 && effectiveLandSizeM2 > 0 && planData?.zoneCode && (
                <SSDComplianceCard
                  enabled={ssdModeEnabled}
                  onToggle={setSsdModeEnabled}
                  lotSizeM2={effectiveLandSizeM2}
                  existingDwellingFootprintM2={aiInsight?.isVacantLand ? 0 : effectiveLandSizeM2 * 0.3}
                  proposedSSDFootprintM2={60}
                  zoneCode={planData.zoneCode}
                  overlays={planData.overlayRaw || []}
                  language={language}
                  buildingFootprintGeometry={generatedMassing?.footprint || undefined}
                  overlayGeometries={overlayGeometries}
                />
              )}

              {/* HIGHEST & BEST USE - AI Development Strategy */}
              {aiInsight?.highestBestUse && (
                <HighestBestUseCard
                  highestBestUse={aiInsight.highestBestUse}
                  language={language}
                />
              )}

              {/* VPP COMPLIANCE CARDS - ResCode Enforcement (only show if NOT in SSD mode) */}
              {!ssdModeEnabled && effectiveLandSizeM2 && effectiveLandSizeM2 > 0 && (
                <>
                  {/* Garden Area Compliance */}
                  <GardenAreaCard
                    lotSizeM2={effectiveLandSizeM2}
                    existingCoverageM2={aiInsight?.isVacantLand ? 0 : effectiveLandSizeM2 * 0.3}
                    proposedFootprintM2={60}
                    language={language}
                  />

                  {/* Parking Deduction Calculator */}
                  <ParkingDeductionCard
                    dwellingCount={proposedDwellingCount}
                    bedroomsPerDwelling={3}
                    grossLotSizeM2={effectiveLandSizeM2}
                    language={language}
                    onDwellingCountChange={setProposedDwellingCount}
                  />
                </>
              )}

              {/* AI FEASIBILITY CARD - New AI Analyst Integration */}
              <FeasibilityCard
                yieldData={yieldData}
                zones={planData?.zoneCode ? [planData.zoneCode] : []}
                overlays={planData?.overlayRaw || []}
                landSize={effectiveLandSizeM2}
                suburb={address?.split(',').pop()?.trim() || ''}
                council={liveCouncil || aiInsight?.localCouncil || undefined}
                lastSoldPrice={marketData?.lastSoldPrice || aiInsight?.estimatedLastSoldPrice || null}
              />

              {/* SCENARIO COMPARISON */}
              <ScenarioComparison yieldData={yieldData} lang={language} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
