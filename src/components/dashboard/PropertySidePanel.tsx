/**
 * Property Side Panel - Streamlined Statutory Data Panel
 *
 * Left-anchored scrollable panel for address, search, and dense statutory data.
 * Charts moved to bottom dock for better visual hierarchy.
 */

'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileDown, Loader2, Search, Save, Lock } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import type { VicPlanData } from '@/lib/vicPlanApi';
import * as turf from '@turf/turf';
import { getOverlayDescription } from '@/lib/planningDictionary';
import { getCouncilContact } from '@/lib/councilContacts';
import { calculateDevelopmentParameters } from '@/lib/developmentParameters';
import { evaluateSSDEligibility } from '@/lib/ssdEligibility';

type PropertySidePanelProps = {
  address: string | null;
  language: 'en' | 'zh';
  zoneCode: string | null;
  zoneDescription: string | null;
  planData: VicPlanData | null;
  onExportPDF: () => void;
  isGeneratingPDF: boolean;
  onSaveProject?: () => void;
  isSavingProject?: boolean;
  onSearch?: (query: string) => void;
  onTestAgent?: () => void;
  isTestingAgent?: boolean;
  showEasements?: boolean;
  onToggleEasements?: (show: boolean) => void;
  showDAs?: boolean;
  onToggleDAs?: (show: boolean) => void;
  show3DMassing?: boolean;
  onToggle3DMassing?: (show: boolean) => void;
  showBoundaryLabels?: boolean;
  onToggleBoundaryLabels?: (show: boolean) => void;
  showContours?: boolean;
  onToggleContours?: (show: boolean) => void;
  daData?: any[]; // Array of fetched DAs
  propertyLat?: number;
  propertyLng?: number;
  activeScenario?: 'current' | 'ssd' | 'dual_occ' | 'townhouse';
  onScenarioChange?: (scenario: 'current' | 'ssd' | 'dual_occ' | 'townhouse') => void;
  scenarioLabel?: string;
  schoolZones?: Array<{ schoolName: string; type: 'primary' | 'secondary' }>;
  crimeStats?: { incidents: number; ratePer100k: number } | null;
  userTier?: 'free' | 'pro';
  lotSize?: string;
  frontage?: string;
  liveCouncil?: string | null;
};

export default function PropertySidePanel({
  address,
  language,
  zoneCode,
  zoneDescription,
  planData,
  onExportPDF,
  isGeneratingPDF,
  onSaveProject,
  isSavingProject = false,
  onSearch,
  onTestAgent,
  isTestingAgent = false,
  showEasements = false,
  onToggleEasements,
  showDAs = false,
  onToggleDAs,
  show3DMassing = false,
  onToggle3DMassing,
  showBoundaryLabels = false,
  onToggleBoundaryLabels,
  showContours = false,
  onToggleContours,
  daData,
  propertyLat,
  propertyLng,
  activeScenario = 'current',
  onScenarioChange,
  scenarioLabel,
  schoolZones = [],
  crimeStats = null,
  userTier = 'free',
  lotSize,
  frontage,
  liveCouncil = null,
}: PropertySidePanelProps) {
  // Get real user plan from Clerk Billing using has()
  const { has, isLoaded } = useAuth();
  const isPro = isLoaded && (has?.({ plan: 'pro' }) ?? false);

  const [searchQuery, setSearchQuery] = useState('');
  const [overlaysExpanded, setOverlaysExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'statutory' | 'development' | 'feasibility'>('statutory');

  // Get council contact information
  const councilContact = getCouncilContact(liveCouncil);

  // Calculate development parameters
  const lotSizeM2 = lotSize ? parseFloat(lotSize.replace(/[^\d.]/g, '')) : null;
  const devParams = calculateDevelopmentParameters(zoneCode, lotSizeM2);

  // Evaluate SSD eligibility for residential zones
  const ssdEligibility = evaluateSSDEligibility(zoneCode, lotSizeM2, true);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      onSearch?.(searchQuery);
    }
  };

  // Calculate DA statistics
  const daStats = React.useMemo(() => {
    if (!daData || daData.length === 0) {
      return null;
    }

    // Status breakdown
    const approved = daData.filter((da) => da.status === 'approved').length;
    const pending = daData.filter((da) => da.status === 'pending').length;
    const refused = daData.filter((da) => da.status === 'refused').length;

    // Proximity breakdown (if property coordinates available)
    let within500m = 0;
    let between500and1km = 0;

    if (propertyLat && propertyLng) {
      const propertyPoint = turf.point([propertyLng, propertyLat]);

      daData.forEach((da) => {
        if (da.lat && da.lng) {
          const daPoint = turf.point([da.lng, da.lat]);
          const distanceKm = turf.distance(propertyPoint, daPoint, { units: 'kilometers' });
          const distanceM = distanceKm * 1000;

          if (distanceM <= 500) {
            within500m++;
          } else if (distanceM <= 1000) {
            between500and1km++;
          }
        }
      });
    }

    return {
      total: daData.length,
      approved,
      pending,
      refused,
      within500m,
      between500and1km,
    };
  }, [daData, propertyLat, propertyLng]);

  return (
    <div className="h-full bg-charcoal backdrop-blur-xl border-l border-white/10 overflow-y-auto shadow-2xl">
      {/* Header Section */}
      <div className="sticky top-0 bg-charcoal/95 backdrop-blur-xl border-b border-white/10 p-6 z-10 space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
            Property Analysis
          </h2>
        </div>

        {/* Address - Dynamic Loading State */}
        <div>
          <h1 className={`text-lg font-bold mb-2 line-clamp-2 ${
            !address ? 'italic text-zinc-400 animate-pulse' : 'text-white'
          }`}>
            {address || 'Loading planning data...'}
          </h1>
          {zoneCode && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1.5 bg-black/40 border border-white/10 text-white text-sm font-mono font-bold rounded-lg">
                {zoneCode}
              </span>
              {zoneDescription && (
                <span className="text-xs text-lime font-semibold line-clamp-1">{zoneDescription}</span>
              )}
            </div>
          )}
        </div>

        {/* Tab Navigation - Underline Style with Lime Slider */}
        <div className="relative border-b border-white/10">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('statutory')}
              className={`relative py-3 text-sm font-bold uppercase tracking-wide transition-all ${
                activeTab === 'statutory'
                  ? 'text-white'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {language === 'en' ? 'Statutory' : '法定规划'}
              {activeTab === 'statutory' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('development')}
              className={`relative py-3 text-sm font-bold uppercase tracking-wide transition-all ${
                activeTab === 'development'
                  ? 'text-white'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {language === 'en' ? 'Development' : '开发参数'}
              {activeTab === 'development' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('feasibility')}
              className={`relative py-3 text-sm font-bold uppercase tracking-wide transition-all ${
                activeTab === 'feasibility'
                  ? 'text-white'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {language === 'en' ? 'Feasibility' : '可行性'}
              {activeTab === 'feasibility' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content Area - No Scroll, Fixed Height */}
      <div className="p-6 space-y-4 h-[calc(100vh-280px)] overflow-hidden">

        {/* OVERVIEW TAB - DEAD CODE (no button sets activeTab to 'overview') */}
        {false && (activeTab as string) === 'overview' && (
          <div className="space-y-4">
            {/* Site Summary Card */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 text-[#E9E778]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <h3 className="text-white text-sm font-semibold uppercase tracking-wide">
                  {language === 'en' ? 'Site Summary' : '场地概要'}
                </h3>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                  <span className="text-zinc-400 text-xs font-semibold">
                    {language === 'en' ? 'Lot Size' : '地块面积'}
                  </span>
                  <span className="text-white text-sm font-bold">
                    {lotSize || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-zinc-400 text-xs font-semibold">
                    {language === 'en' ? 'Frontage' : '临街面'}
                  </span>
                  <span className="text-white text-sm font-bold">
                    {frontage || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* School Catchment Card */}
            {schoolZones.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 relative">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h3 className="text-white text-sm font-semibold uppercase tracking-wide">
                    {language === 'en' ? 'School Catchment' : '学校学区'}
                  </h3>
                </div>
                <div className={`flex flex-col gap-3 ${!isPro ? 'blur-sm' : ''}`}>
                  {schoolZones.map((zone, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0">
                      <span className="text-zinc-400 text-xs font-semibold">
                        {zone.type === 'primary'
                          ? (language === 'en' ? 'Primary' : '小学')
                          : (language === 'en' ? 'Secondary' : '中学')}
                      </span>
                      <span className="text-white text-sm font-medium text-right max-w-[200px] truncate" title={zone.schoolName}>
                        {zone.schoolName}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Paywall Overlay for Free Users */}
                {!isPro && (
                  <button
                    onClick={() => window.location.href = '/pricing'}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 backdrop-blur-sm rounded-xl border border-emerald-500/30 hover:bg-zinc-900/95 transition-all cursor-pointer group"
                  >
                    <Lock className="w-6 h-6 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold text-emerald-400 uppercase tracking-wide">
                      {language === 'en' ? 'Pro Feature' : '专业版功能'}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* LGA Safety Card */}
            {crimeStats && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 relative">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <h3 className="text-white text-sm font-semibold uppercase tracking-wide">
                    {language === 'en' ? 'LGA Safety' : '地方政府区域安全'}
                  </h3>
                </div>
                <div className={`flex flex-col gap-3 ${!isPro ? 'blur-sm' : ''}`}>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                    <span className="text-zinc-400 text-xs font-semibold">
                      {language === 'en' ? 'Incidents (YE Mar 2026)' : '事件数（截至2026年3月）'}
                    </span>
                    <span className="text-white text-sm font-medium">
                      {crimeStats?.incidents.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-zinc-400 text-xs font-semibold">
                      {language === 'en' ? 'Rate per 100,000' : '每10万人比率'}
                    </span>
                    <span className="text-emerald-400 text-sm font-bold">
                      {crimeStats?.ratePer100k.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    </span>
                  </div>
                </div>

                {/* Paywall Overlay for Free Users */}
                {!isPro && (
                  <button
                    onClick={() => window.location.href = '/pricing'}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 backdrop-blur-sm rounded-xl border border-emerald-500/30 hover:bg-zinc-900/95 transition-all cursor-pointer group"
                  >
                    <Lock className="w-6 h-6 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold text-emerald-400 uppercase tracking-wide">
                      {language === 'en' ? 'Pro Feature' : '专业版功能'}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* STATUTORY TAB */}
        {activeTab === 'statutory' && (
          <div className="space-y-4">
            {/* ZONING CARD */}
            {zoneCode && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h3 className="text-white text-sm font-semibold uppercase tracking-wide">
                    {language === 'en' ? 'Planning Zone' : '规划区'}
                  </h3>
                </div>
                <div className="inline-block px-3 py-1.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-md text-sm font-bold">
                  {zoneCode} {zoneDescription && `- ${zoneDescription.substring(0, 30)}...`}
                </div>
              </div>
            )}

            {/* OVERLAYS CARD */}
            {planData?.overlayRaw && planData.overlayRaw.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    <h3 className="text-white text-sm font-semibold uppercase tracking-wide">
                      {language === 'en' ? 'Overlays' : '叠加层'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setOverlaysExpanded(!overlaysExpanded)}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    {overlaysExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
                {overlaysExpanded && (() => {
                  // Deduplicate overlays
                  const uniqueOverlays = Array.from(new Set(planData.overlayRaw.map((overlay: any) =>
                    overlay.ZONE_CODE || overlay.code || overlay
                  )));

                  return (
                    <div className="flex flex-wrap gap-2">
                      {uniqueOverlays.slice(0, 3).map((overlayCode: string, idx: number) => {
                        const overlayDescription = getOverlayDescription(overlayCode);

                        return (
                          <div
                            key={idx}
                            className="inline-block px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md text-sm font-bold w-fit"
                            title={overlayDescription}
                          >
                            {overlayCode}
                          </div>
                        );
                      })}
                      {uniqueOverlays.length > 3 && (
                        <div className="inline-block px-3 py-1.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-md text-xs font-medium">
                          +{uniqueOverlays.length - 3} more
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* COUNCIL INFORMATION CARD */}
            <div className="bg-black/20 border border-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 text-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="text-white text-sm font-semibold uppercase tracking-wide">
                  {language === 'en' ? 'Local Council' : '地方议会'}
                </h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-zinc-400 font-medium">{language === 'en' ? 'LGA' : '地方政府区域'}</span>
                  <span className="text-white text-xs font-semibold">
                    {councilContact?.name || liveCouncil || '—'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-zinc-400 font-medium">{language === 'en' ? 'Website' : '网站'}</span>
                  {councilContact?.website ? (
                    <a
                      href={`https://${councilContact.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lime text-xs hover:text-lime/80 transition-colors font-medium"
                    >
                      {councilContact.website}
                    </a>
                  ) : (
                    <span className="text-zinc-600 text-xs">—</span>
                  )}
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-zinc-400 font-medium">{language === 'en' ? 'Planning Phone' : '规划电话'}</span>
                  {councilContact?.planningPhone ? (
                    <a
                      href={`tel:${councilContact.planningPhone.replace(/[^\d+]/g, '')}`}
                      className="text-white text-xs hover:text-lime transition-colors font-medium"
                    >
                      {councilContact.planningPhone}
                    </a>
                  ) : (
                    <span className="text-zinc-600 text-xs">—</span>
                  )}
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-zinc-400 font-medium">{language === 'en' ? 'Planning Email' : '规划邮箱'}</span>
                  {councilContact?.planningEmail ? (
                    <a
                      href={`mailto:${councilContact.planningEmail}`}
                      className="text-white text-xs hover:text-lime transition-colors font-medium"
                    >
                      {councilContact.planningEmail}
                    </a>
                  ) : (
                    <span className="text-zinc-600 text-xs">—</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DEVELOPMENT PARAMETERS TAB */}
        {activeTab === 'development' && (
          <div className="space-y-4">
            {/* Section: ResCode & VPP Parameters */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <h3 className="text-white text-sm font-semibold uppercase tracking-wide">
                  {language === 'en' ? 'Development Parameters' : '开发参数'}
                </h3>
              </div>

              <div className="space-y-0 divide-y divide-white/5">
                {/* Max Building Height */}
                <div className="flex justify-between items-center py-3">
                  <span className="text-white text-sm font-medium">
                    {language === 'en' ? 'Max Building Height' : '最大建筑高度'}
                  </span>
                  <span className="text-lime text-sm font-bold">{devParams.maxBuildingHeight || '—'}</span>
                </div>

                {/* Mandatory Garden Area */}
                <div className="flex justify-between items-center py-3">
                  <span className="text-white text-sm font-medium">
                    {language === 'en' ? 'Mandatory Garden Area' : '必需花园面积'}
                  </span>
                  <span className="text-lime text-sm font-bold">{devParams.mandatoryGardenArea || '—'}</span>
                </div>

                {/* Site Coverage */}
                <div className="flex justify-between items-center py-3">
                  <span className="text-white text-sm font-medium">
                    {language === 'en' ? 'Site Coverage' : '建筑覆盖率'}
                  </span>
                  <span className="text-lime text-sm font-bold">{devParams.siteCoverage || '—'}</span>
                </div>

                {/* Permeability */}
                <div className="flex justify-between items-center py-3">
                  <span className="text-white text-sm font-medium">
                    {language === 'en' ? 'Permeability' : '渗透率'}
                  </span>
                  <span className="text-lime text-sm font-bold">{devParams.permeability || '—'}</span>
                </div>

                {/* Front Setback */}
                <div className="flex justify-between items-center py-3">
                  <span className="text-white text-sm font-medium">
                    {language === 'en' ? 'Front Setback' : '前院退界'}
                  </span>
                  <span className="text-lime text-sm font-bold">{devParams.frontSetback || '—'}</span>
                </div>

                {/* Side/Rear Setbacks */}
                <div className="flex justify-between items-center py-3">
                  <span className="text-white text-sm font-medium">
                    {language === 'en' ? 'Side/Rear Setbacks' : '侧/后退界'}
                  </span>
                  <span className="text-lime text-sm font-bold">{devParams.sideRearSetback || '—'}</span>
                </div>

                {/* FSR - Only show for Commercial zones with lime highlight */}
                {devParams.floorSpaceRatio && (
                  <div className="flex justify-between items-center py-3 bg-lime/5 -mx-4 px-4">
                    <span className="text-white text-sm font-medium">
                      {language === 'en' ? 'Floor Space Ratio (FSR)' : '容积率 (FSR)'}
                    </span>
                    <span className="text-lime text-sm font-bold">{devParams.floorSpaceRatio}</span>
                  </div>
                )}
              </div>

              {/* SSD Eligibility Checklist - Show for residential zones */}
              {!devParams.floorSpaceRatio && ssdEligibility && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-4 h-4 text-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-white text-sm font-semibold uppercase tracking-wide">
                      {language === 'en' ? 'Small Second Dwelling (SSD) Eligibility' : '小型第二住宅资格'}
                    </h3>
                  </div>

                  {/* Overall Status */}
                  <div className={`mb-4 p-3 rounded-lg border ${
                    ssdEligibility.isEligible
                      ? 'bg-lime/10 border-lime/30'
                      : 'bg-zinc-800/50 border-zinc-700'
                  }`}>
                    <p className={`text-xs font-medium ${
                      ssdEligibility.isEligible ? 'text-lime' : 'text-zinc-400'
                    }`}>
                      {ssdEligibility.summary[language]}
                    </p>
                  </div>

                  {/* Criteria Checklist */}
                  <div className="space-y-2">
                    {ssdEligibility.criteria.map((criterion) => (
                      <div key={criterion.id} className="flex items-start gap-3 py-2 border-b border-white/5">
                        <div className="mt-0.5">
                          {criterion.isPassing ? (
                            <svg className="w-4 h-4 text-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`text-xs font-medium ${
                            criterion.isPassing ? 'text-white' : 'text-zinc-400'
                          }`}>
                            {criterion.label[language]}
                          </p>
                          {criterion.reasoning && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {criterion.reasoning}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-300">
                  {language === 'en'
                    ? '📊 VPP schedule data integration coming soon'
                    : '📊 VPP数据集成即将推出'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* FEASIBILITY TAB */}
        {activeTab === 'feasibility' && (
          <div className="space-y-4">
            {/* Scenario Selector */}
            {onScenarioChange && (
              <div className="space-y-3">
                <label className="text-zinc-400 text-xs font-bold uppercase tracking-widest block">
                  {language === 'en' ? 'Feasibility Scenario' : '可行性场景'}
                </label>
                <div className="bg-zinc-900 p-1 rounded-lg flex w-full">
                  <button
                    onClick={() => onScenarioChange('current')}
                    className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${
                      activeScenario === 'current'
                        ? 'bg-zinc-800 text-white shadow-md border border-zinc-700'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {language === 'en' ? 'Current' : '当前'}
                  </button>
                  <button
                    onClick={() => onScenarioChange('ssd')}
                    className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${
                      activeScenario === 'ssd'
                        ? 'bg-zinc-800 text-white shadow-md border border-zinc-700'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {language === 'en' ? 'SSD' : '单户'}
                  </button>
                  <button
                    onClick={() => onScenarioChange('dual_occ')}
                    className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${
                      activeScenario === 'dual_occ'
                        ? 'bg-zinc-800 text-white shadow-md border border-zinc-700'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {language === 'en' ? 'Dual Occ' : '双户'}
                  </button>
                  <button
                    onClick={() => onScenarioChange('townhouse')}
                    className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${
                      activeScenario === 'townhouse'
                        ? 'bg-zinc-800 text-white shadow-md border border-zinc-700'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {language === 'en' ? 'Townhouse' : '联排'}
                  </button>
                </div>
              </div>
            )}

            {/* DYNAMIC SCENARIO RULES CARD */}
            {activeScenario && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-white text-sm font-semibold uppercase tracking-wide">
                    {activeScenario === 'ssd'
                      ? (language === 'en' ? 'SSD Requirements' : 'SSD 要求')
                      : (language === 'en' ? 'Development Rules' : '开发规则')}
                  </h3>
                </div>

                <div className="flex flex-col gap-3">
                  {activeScenario === 'ssd' && (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                        <span className="text-zinc-400 text-xs font-semibold">
                          {language === 'en' ? 'Max Height' : '最大高度'}
                        </span>
                        <span className="text-white text-sm font-medium">5.0 meters</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                        <span className="text-zinc-400 text-xs font-semibold">
                          {language === 'en' ? 'Min Garden Area' : '最小花园面积'}
                        </span>
                        <span className="text-white text-sm font-medium">35%</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-zinc-400 text-xs font-semibold">
                          {language === 'en' ? 'Permit Required' : '需要许可'}
                        </span>
                        <span className="text-green-400 text-sm font-bold">
                          {language === 'en' ? 'No' : '否'}
                        </span>
                      </div>
                    </>
                  )}
                  {activeScenario === 'dual_occ' && (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                        <span className="text-zinc-400 text-xs font-semibold">
                          {language === 'en' ? 'Max Units' : '最大单位'}
                        </span>
                        <span className="text-white text-sm font-medium">2 Dwellings</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                        <span className="text-zinc-400 text-xs font-semibold">
                          {language === 'en' ? 'Min Lot Size' : '最小地块面积'}
                        </span>
                        <span className="text-white text-sm font-medium">400m²</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-zinc-400 text-xs font-semibold">
                          {language === 'en' ? 'Permit Required' : '需要许可'}
                        </span>
                        <span className="text-amber-400 text-sm font-bold">
                          {language === 'en' ? 'Yes' : '是'}
                        </span>
                      </div>
                    </>
                  )}
                  {activeScenario === 'townhouse' && (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                        <span className="text-zinc-400 text-xs font-semibold">
                          {language === 'en' ? 'Max Yield' : '最大收益'}
                        </span>
                        <span className="text-white text-sm font-medium">Variable</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                        <span className="text-zinc-400 text-xs font-semibold">
                          {language === 'en' ? 'Site Coverage' : '场地覆盖率'}
                        </span>
                        <span className="text-white text-sm font-medium">60% Max</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-zinc-400 text-xs font-semibold">
                          {language === 'en' ? 'Permit Required' : '需要许可'}
                        </span>
                        <span className="text-amber-400 text-sm font-bold">
                          {language === 'en' ? 'Yes' : '是'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Export PDF Button */}
            <button
              onClick={onExportPDF}
              disabled={isGeneratingPDF}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#E9E778] hover:bg-[#d4d262] text-[#05060E] font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {language === 'en' ? 'Generating PDF...' : '生成 PDF 中...'}
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  {language === 'en' ? 'Export PDF Report' : '导出 PDF 报告'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Old content - DELETE THIS ENTIRE BLOCK */}
      <div className="hidden">
        {/* Scenario Selector - Pill-Style Toggle */}
        {onScenarioChange && (
          <div className="space-y-3">
            <label className="text-zinc-400 text-xs font-bold uppercase tracking-widest block">
              {language === 'en' ? 'Feasibility Scenario' : '可行性场景'}
            </label>
            <div className="bg-zinc-900 p-1 rounded-lg flex w-full">
              <button
                onClick={() => onScenarioChange('current')}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${
                  activeScenario === 'current'
                    ? 'bg-zinc-800 text-white shadow-md border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {language === 'en' ? 'Current' : '当前'}
              </button>
              <button
                onClick={() => onScenarioChange('ssd')}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${
                  activeScenario === 'ssd'
                    ? 'bg-zinc-800 text-white shadow-md border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                SSD
              </button>
              <button
                onClick={() => onScenarioChange('dual_occ')}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${
                  activeScenario === 'dual_occ'
                    ? 'bg-zinc-800 text-white shadow-md border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {language === 'en' ? 'Dual Occ' : '双户'}
              </button>
              <button
                onClick={() => onScenarioChange('townhouse')}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${
                  activeScenario === 'townhouse'
                    ? 'bg-zinc-800 text-white shadow-md border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {language === 'en' ? 'Townhouse' : '联排'}
              </button>
            </div>
            {scenarioLabel && (
              <p className="text-xs text-zinc-500 italic">
                {language === 'en' ? 'Active:' : '活跃:'} {scenarioLabel}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {/* Save Project Button - Subtle Outlined */}
          {onSaveProject && (
            <button
              onClick={onSaveProject}
              disabled={isSavingProject || !address}
              className="px-4 py-2.5 border border-zinc-600 hover:bg-zinc-800 disabled:border-zinc-700 disabled:bg-zinc-900 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isSavingProject ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {language === 'en' ? 'Saving...' : '保存中...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {language === 'en' ? 'Save' : '保存'}
                </>
              )}
            </button>
          )}

          {/* Export PDF Button - Primary CTA */}
          <button
            onClick={onExportPDF}
            disabled={isGeneratingPDF || !address}
            className={`${onSaveProject ? '' : 'col-span-2'} px-4 py-2.5 bg-[#E9E778] hover:bg-[#E9E778]/90 disabled:bg-zinc-700 disabled:cursor-not-allowed text-[#05060E] font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2`}
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {language === 'en' ? 'Generating PDF...' : '生成PDF中...'}
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                {language === 'en' ? 'Export PDF' : '导出PDF'}
              </>
            )}
          </button>
        </div>

        {/* Planning Constraints - Progressive Disclosure */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            {language === 'en' ? 'Planning Constraints' : '规划限制'}
          </h2>

          {/* ZONING CARD */}
          {zoneCode && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="text-white text-sm font-semibold uppercase tracking-wide">
                  {language === 'en' ? 'Planning Zone' : '规划区'}
                </h3>
              </div>
              <div className="inline-block px-3 py-1.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-md text-sm font-bold">
                {zoneCode} {zoneDescription && `- ${zoneDescription}`}
              </div>
              {zoneDescription && (
                <p className="text-zinc-400 text-xs mt-3 leading-relaxed">
                  {language === 'en'
                    ? 'Encourages a diversity of housing types and housing growth particularly in locations offering good access to services and transport.'
                    : '鼓励住房类型多样化和住房增长，特别是在交通和服务便利的地区。'}
                </p>
              )}
            </div>
          )}

          {/* OVERLAYS CARD */}
          {planData?.overlayRaw && planData.overlayRaw.length > 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-white text-sm font-semibold uppercase tracking-wide">
                  {language === 'en' ? 'Overlays' : '叠加层'}
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                {planData.overlayRaw.slice(0, 3).map((overlay: any, idx: number) => {
                  const overlayCode = overlay.ZONE_CODE || overlay.code || 'Unknown';
                  const overlayDescription = getOverlayDescription(overlayCode);

                  return (
                    <div
                      key={idx}
                      className="inline-block px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md text-sm font-bold w-fit"
                      title={overlayDescription}
                    >
                      {overlayCode}
                    </div>
                  );
                })}
                {planData.overlayRaw.length > 3 && (
                  <span className="text-xs text-zinc-500">
                    +{planData.overlayRaw.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* SCHOOL CATCHMENT CARD */}
          {schoolZones.length > 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 relative">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 className="text-white text-sm font-semibold uppercase tracking-wide">
                  {language === 'en' ? 'School Catchment' : '学校学区'}
                </h3>
              </div>
              <div className={`flex flex-col gap-3 ${!isPro ? 'blur-sm' : ''}`}>
                {schoolZones.map((zone, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0">
                    <span className="text-zinc-400 text-xs font-semibold">
                      {zone.type === 'primary'
                        ? (language === 'en' ? 'Primary' : '小学')
                        : (language === 'en' ? 'Secondary' : '中学')}
                    </span>
                    <span className="text-white text-sm font-medium text-right max-w-[200px] truncate" title={zone.schoolName}>
                      {zone.schoolName}
                    </span>
                  </div>
                ))}
              </div>

              {/* Paywall Overlay for Free Users */}
              {!isPro && (
                <button
                  onClick={() => alert('Redirecting to Checkout...')}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 backdrop-blur-sm rounded-xl border border-emerald-500/30 hover:bg-zinc-900/95 transition-all cursor-pointer group"
                >
                  <Lock className="w-6 h-6 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-emerald-400 uppercase tracking-wide">
                    {language === 'en' ? 'Pro Feature' : '专业版功能'}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* LGA SAFETY CARD */}
          {crimeStats && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 relative">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <h3 className="text-white text-sm font-semibold uppercase tracking-wide">
                  {language === 'en' ? 'LGA Safety' : '地方政府区域安全'}
                </h3>
              </div>
              <div className={`flex flex-col gap-3 ${userTier === 'free' ? 'blur-sm' : ''}`}>
                <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                  <span className="text-zinc-400 text-xs font-semibold">
                    {language === 'en' ? 'Incidents (YE Mar 2026)' : '事件数（截至2026年3月）'}
                  </span>
                  <span className="text-white text-sm font-medium">
                    {crimeStats.incidents.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-zinc-400 text-xs font-semibold">
                    {language === 'en' ? 'Rate per 100,000' : '每10万人比率'}
                  </span>
                  <span className="text-emerald-400 text-sm font-bold">
                    {crimeStats.ratePer100k.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </span>
                </div>
              </div>

              {/* Paywall Overlay for Free Users */}
              {!isPro && (
                <button
                  onClick={() => alert('Redirecting to Checkout...')}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 backdrop-blur-sm rounded-xl border border-emerald-500/30 hover:bg-zinc-900/95 transition-all cursor-pointer group"
                >
                  <Lock className="w-6 h-6 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-emerald-400 uppercase tracking-wide">
                    {language === 'en' ? 'Pro Feature' : '专业版功能'}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* DYNAMIC SCENARIO RULES CARD */}
          {activeScenario && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <h3 className="text-white text-sm font-semibold uppercase tracking-wide">
                  {activeScenario === 'ssd'
                    ? (language === 'en' ? 'SSD Requirements' : 'SSD 要求')
                    : (language === 'en' ? 'Development Rules' : '开发规则')}
                </h3>
              </div>

              <div className="flex flex-col gap-3">
                {activeScenario === 'ssd' && (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                      <span className="text-zinc-400 text-xs font-semibold">
                        {language === 'en' ? 'Max Height' : '最大高度'}
                      </span>
                      <span className="text-white text-sm font-medium">5.0 meters</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                      <span className="text-zinc-400 text-xs font-semibold">
                        {language === 'en' ? 'Min Garden Area' : '最小花园面积'}
                      </span>
                      <span className="text-white text-sm font-medium">35%</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-zinc-400 text-xs font-semibold">
                        {language === 'en' ? 'Permit Required' : '需要许可'}
                      </span>
                      <span className="text-green-400 text-sm font-bold">
                        {language === 'en' ? 'No' : '否'}
                      </span>
                    </div>
                  </>
                )}
                {activeScenario === 'dual_occ' && (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                      <span className="text-zinc-400 text-xs font-semibold">
                        {language === 'en' ? 'Max Units' : '最大单位'}
                      </span>
                      <span className="text-white text-sm font-medium">2 Dwellings</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                      <span className="text-zinc-400 text-xs font-semibold">
                        {language === 'en' ? 'Min Lot Size' : '最小地块面积'}
                      </span>
                      <span className="text-white text-sm font-medium">400m²</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-zinc-400 text-xs font-semibold">
                        {language === 'en' ? 'Permit Required' : '需要许可'}
                      </span>
                      <span className="text-amber-400 text-sm font-bold">
                        {language === 'en' ? 'Yes' : '是'}
                      </span>
                    </div>
                  </>
                )}
                {activeScenario === 'townhouse' && (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                      <span className="text-zinc-400 text-xs font-semibold">
                        {language === 'en' ? 'Min Frontage' : '最小临街面'}
                      </span>
                      <span className="text-white text-sm font-medium">15.0m</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                      <span className="text-zinc-400 text-xs font-semibold">
                        {language === 'en' ? 'Site Coverage' : '场地覆盖率'}
                      </span>
                      <span className="text-white text-sm font-medium">60% max</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-zinc-400 text-xs font-semibold">
                        {language === 'en' ? 'Permit Required' : '需要许可'}
                      </span>
                      <span className="text-amber-400 text-sm font-bold">
                        {language === 'en' ? 'Yes' : '是'}
                      </span>
                    </div>
                  </>
                )}
                {activeScenario === 'current' && (
                  <p className="text-zinc-500 text-sm italic">
                    {language === 'en'
                      ? 'Select a development scenario to view specific requirements.'
                      : '选择开发场景以查看具体要求。'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statutory Data Section */}
      <div className="p-6 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">
          Statutory Planning Data
        </h2>

        {/* Planning Overlays Accordion */}
        <div className="bg-[#05060E]/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
          <button
            onClick={() => setOverlaysExpanded(!overlaysExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Planning Overlays</span>
              {planData?.overlayRaw && planData.overlayRaw.length > 0 && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded">
                  {planData.overlayRaw.length}
                </span>
              )}
            </div>
            {overlaysExpanded ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </button>
          {overlaysExpanded && (
            <div className="px-4 pb-4">
              {planData?.overlayRaw && planData.overlayRaw.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {planData.overlayRaw.map((overlay, index) => (
                    <div
                      key={index}
                      className="px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs font-mono font-semibold text-white hover:border-lime/50 transition-colors"
                    >
                      {overlay}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-zinc-500">
                  No planning overlays detected
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map Layers Section */}
        <div className="bg-[#05060E]/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">Map Layers</h3>
          </div>
          <div className="px-4 py-3 space-y-3">
            {/* Easements Toggle */}
            {onToggleEasements && (
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-red-500 rounded" style={{ borderTop: '2px dashed' }}></div>
                  <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                    Easements
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={showEasements}
                  onChange={(e) => onToggleEasements(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-[#E9E778] focus:ring-2 focus:ring-[#E9E778] focus:ring-offset-0"
                />
              </label>
            )}

            {/* Development Applications Toggle */}
            {onToggleDAs && (
              <>
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    </div>
                    <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                      Local DAs (1km)
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showDAs}
                    onChange={(e) => onToggleDAs(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-[#E9E778] focus:ring-2 focus:ring-[#E9E778] focus:ring-offset-0"
                  />
                </label>

                {/* DA Statistics Panel */}
                {showDAs && daStats && (
                  <div className="ml-6 mt-2 p-3 bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-lg">
                    {/* Status Breakdown */}
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-zinc-400">Total:</span>
                      <span className="font-semibold text-white">{daStats.total}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs mb-3">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-zinc-400">{daStats.approved}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span className="text-zinc-400">{daStats.pending}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-zinc-400">{daStats.refused}</span>
                      </div>
                    </div>

                    {/* Proximity Breakdown */}
                    {propertyLat && propertyLng && (
                      <div className="pt-2 border-t border-zinc-800">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400">Within 500m:</span>
                          <span className="font-semibold text-blue-400">{daStats.within500m}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-zinc-400">500m–1km:</span>
                          <span className="font-semibold text-zinc-300">{daStats.between500and1km}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* 3D Massing Toggle */}
            {onToggle3DMassing && (
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-blue-500/30 border border-blue-500 rounded-sm"></div>
                  <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                    3D Building Envelope
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={show3DMassing}
                  onChange={(e) => onToggle3DMassing(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-[#E9E778] focus:ring-2 focus:ring-[#E9E778] focus:ring-offset-0"
                />
              </label>
            )}

            {/* Boundary Dimensions Toggle */}
            {onToggleBoundaryLabels && (
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-[#E9E778] rounded"></div>
                  <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                    Boundary Dimensions
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={showBoundaryLabels}
                  onChange={(e) => onToggleBoundaryLabels(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-[#E9E778] focus:ring-2 focus:ring-[#E9E778] focus:ring-offset-0"
                />
              </label>
            )}

            {/* Topography Contours Toggle */}
            {onToggleContours && (
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#E9E778]" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4 Q8 2 14 4" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M2 8 Q8 6 14 8" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M2 12 Q8 10 14 12" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                    Topography Contours
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={showContours}
                  onChange={(e) => onToggleContours(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-[#E9E778] focus:ring-2 focus:ring-[#E9E778] focus:ring-offset-0"
                />
              </label>
            )}
          </div>
        </div>

      </div>
      {/* End hidden old content */}
    </div>
  );
}
