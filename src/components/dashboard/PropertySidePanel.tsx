/**
 * Property Side Panel - Comprehensive Planning Intelligence Dashboard
 *
 * Left-anchored scrollable panel displaying statutory planning data,
 * market intelligence, and development assessment in a dense, hierarchical layout.
 *
 * UX Pattern: Archistar-style information architecture with accordion sections.
 */

'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileDown, Loader2 } from 'lucide-react';
import { SsdBadge } from '@/components/ui/SsdBadge';
import { DataSourceBadge } from '@/components/ui/DataSourceBadge';
import { RegulatoryRadarChart } from '@/components/charts/RegulatoryRadarChart';
import { SpatialPieChart } from '@/components/charts/SpatialPieChart';
import type { MergedMarketData } from '@/lib/agentMarketIntegration';
import type { VicPlanData } from '@/lib/vicPlanApi';
import type { YieldData } from '@/lib/yieldEngine';

type PropertySidePanelProps = {
  address: string | null;
  language: 'en' | 'zh';
  zoneCode: string | null;
  zoneDescription: string | null;
  landSizeM2: number | null;
  effectiveLandSizeM2: number | null;
  mergedMarketData: MergedMarketData;
  isLoadingAgent: boolean;
  isLoadingMarket: boolean;
  planData: VicPlanData | null;
  yieldData: YieldData | null;
  onExportPDF: () => void;
  isGeneratingPDF: boolean;
};

type AccordionSection = 'market' | 'planning' | 'assessment' | 'overlays';

export default function PropertySidePanel({
  address,
  language,
  zoneCode,
  zoneDescription,
  landSizeM2,
  effectiveLandSizeM2,
  mergedMarketData,
  isLoadingAgent,
  isLoadingMarket,
  planData,
  yieldData,
  onExportPDF,
  isGeneratingPDF,
}: PropertySidePanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<AccordionSection>>(
    new Set(['market', 'assessment'])
  );

  const toggleSection = (section: AccordionSection) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const isSSDEligible =
    landSizeM2 &&
    landSizeM2 >= 300 &&
    ['GRZ', 'NRZ', 'RGZ', 'MUZ', 'TZ'].some((zone) => zoneCode?.toUpperCase().startsWith(zone)) &&
    !planData?.overlayRaw?.some((o) =>
      ['HO', 'BMO', 'LSIO', 'SBO', 'BFO'].some((prefix) => o.toUpperCase().startsWith(prefix))
    );

  const ssdReason = landSizeM2 && landSizeM2 < 300
    ? 'Lot size below 300m² minimum'
    : planData?.overlayRaw?.some((o) =>
        ['HO', 'BMO', 'LSIO', 'SBO', 'BFO'].some((prefix) => o.toUpperCase().startsWith(prefix))
      )
    ? 'Restrictive overlays present'
    : 'SSD fast-track pathway available';

  return (
    <div className="fixed left-0 top-0 h-screen w-[400px] bg-[#0A0A0A] border-r border-zinc-800 overflow-y-auto z-50">
      {/* Header */}
      <div className="sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-zinc-800 p-6 z-10">
        <h1 className="text-lg font-bold text-white mb-2 line-clamp-2">
          {address || 'No address selected'}
        </h1>
        {zoneCode && (
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-[#E9E778]/20 text-[#E9E778] text-xs font-mono font-bold rounded">
              {zoneCode}
            </span>
            {zoneDescription && (
              <span className="text-xs text-zinc-400 line-clamp-1">{zoneDescription}</span>
            )}
          </div>
        )}

        {/* Export PDF Button */}
        <button
          onClick={onExportPDF}
          disabled={isGeneratingPDF}
          className="w-full px-4 py-2.5 bg-[#E9E778] hover:bg-[#E9E778]/90 disabled:bg-zinc-700 disabled:cursor-not-allowed text-[#05060E] font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          {isGeneratingPDF ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <FileDown className="w-4 h-4" />
              Export PDF Report
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Visual Assessment Charts */}
        <div className="space-y-4">
          {/* Development Assessment */}
          <div className="bg-[#05060E]/80 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold tracking-wider uppercase text-zinc-400">
                Development Assessment
              </h3>
              {planData && landSizeM2 && (
                <SsdBadge eligible={isSSDEligible || false} reason={ssdReason} />
              )}
            </div>
            {yieldData ? (
              <RegulatoryRadarChart yieldData={yieldData} />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-zinc-500">
                Processing compliance data...
              </div>
            )}
          </div>

          {/* Site Parameters */}
          <div className="bg-[#05060E]/80 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-zinc-400 mb-3">
              Site Parameters
            </h3>
            {landSizeM2 ? (
              <SpatialPieChart landSize={landSizeM2} effectiveLandSize={effectiveLandSizeM2} />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-zinc-500">
                Loading spatial data...
              </div>
            )}
          </div>
        </div>

        {/* Accordion Sections */}
        <div className="space-y-2">
          {/* Market Performance Section */}
          <AccordionItem
            title="Market Performance"
            isExpanded={expandedSections.has('market')}
            onToggle={() => toggleSection('market')}
            badge={
              mergedMarketData.source !== 'none' && !isLoadingAgent && !isLoadingMarket ? (
                <DataSourceBadge source={mergedMarketData.source} language={language} />
              ) : null
            }
          >
            {isLoadingAgent || isLoadingMarket ? (
              <div className="py-8 flex items-center justify-center text-sm text-zinc-500">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Aggregating market data...
              </div>
            ) : mergedMarketData.bedrooms !== null || mergedMarketData.estimatedValue !== null ? (
              <div className="space-y-3">
                {mergedMarketData.bedrooms !== null && (
                  <DataRow
                    label="Bedrooms / Bathrooms"
                    value={`${mergedMarketData.bedrooms} / ${mergedMarketData.bathrooms ?? 0}`}
                  />
                )}
                {mergedMarketData.estimatedValue && (
                  <DataRow
                    label={language === 'en' ? 'Estimated Value' : '估计价值'}
                    value={`$${mergedMarketData.estimatedValue.toLocaleString('en-AU')}`}
                  />
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-zinc-500">
                No market data available for this address
              </div>
            )}
          </AccordionItem>

          {/* Planning Overlays Section */}
          <AccordionItem
            title="Planning Overlays"
            isExpanded={expandedSections.has('overlays')}
            onToggle={() => toggleSection('overlays')}
            badge={
              planData?.overlayRaw && planData.overlayRaw.length > 0 ? (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded">
                  {planData.overlayRaw.length}
                </span>
              ) : null
            }
          >
            {planData?.overlayRaw && planData.overlayRaw.length > 0 ? (
              <div className="space-y-2">
                {planData.overlayRaw.map((overlay, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded text-xs text-zinc-300"
                  >
                    <span className="font-mono font-bold text-[#E9E778]">{overlay}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-zinc-500">
                No planning overlays detected
              </div>
            )}
          </AccordionItem>
        </div>
      </div>
    </div>
  );
}

// Accordion Item Component
function AccordionItem({
  title,
  isExpanded,
  onToggle,
  badge,
  children,
}: {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#05060E]/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{title}</span>
          {badge}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        )}
      </button>
      {isExpanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// Data Row Component
function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0">
      <span className="text-xs text-zinc-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}
