/**
 * RIGHT SIDEBAR COMPONENT
 *
 * Sliding panel for statutory and development parameters.
 * Premium glassmorphic design with brand colors.
 * Displays zoning, overlays, ResCode constraints, and feasibility analysis.
 */

'use client';

import React from 'react';
import { X, FileText, AlertTriangle, CheckCircle, Layers, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PropertyAnalysisData } from '@/hooks/usePropertyAnalysis';

type RightSidebarProps = {
  /** Property analysis data from unified API */
  propertyData: PropertyAnalysisData | null;

  /** Is sidebar open */
  isOpen: boolean;

  /** Close sidebar callback */
  onClose: () => void;

  /** Language preference */
  lang?: 'en' | 'zh';
};

export default function RightSidebar({
  propertyData,
  isOpen,
  onClose,
  lang = 'en',
}: RightSidebarProps) {

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 w-[400px] z-50',
          'bg-brand-dark/95 backdrop-blur-xl',
          'border-l border-white/10',
          'shadow-2xl',
          'transform transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="relative px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                {lang === 'en' ? 'Statutory Analysis' : '法规分析'}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {lang === 'en' ? 'Zoning & Development Controls' : '分区与开发控制'}
              </p>
            </div>
            <button
              onClick={onClose}
              className={cn(
                'p-2 rounded-lg',
                'hover:bg-white/5',
                'transition-colors'
              )}
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Top accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand-lime to-transparent" />
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100vh-80px)] px-6 py-4 space-y-6">

          {!propertyData ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText className="w-12 h-12 text-zinc-600 mb-3" />
              <p className="text-zinc-400">
                {lang === 'en' ? 'Select a property to view statutory analysis' : '选择房产以查看法规分析'}
              </p>
            </div>
          ) : (
            <>
              {/* Zoning Section */}
              <Section
                icon={Layers}
                title={lang === 'en' ? 'Zoning' : '分区'}
                iconColor="brand-lime"
              >
                <DataRow
                  label={lang === 'en' ? 'Zone Code' : '分区代码'}
                  value={propertyData.statutory.zoneCode}
                />
              </Section>

              {/* Overlays Section */}
              <Section
                icon={AlertTriangle}
                title={lang === 'en' ? 'Overlays' : '叠加层'}
                iconColor={propertyData.statutory.overlays.length > 0 ? 'yellow-500' : 'zinc-500'}
              >
                {propertyData.statutory.overlays.length > 0 ? (
                  <div className="space-y-2">
                    {propertyData.statutory.overlays.map((overlay, index) => (
                      <div
                        key={index}
                        className={cn(
                          'px-3 py-2 rounded-lg',
                          'bg-yellow-500/10 border border-yellow-500/20',
                          'text-xs text-yellow-200'
                        )}
                      >
                        {overlay}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400">
                    {lang === 'en' ? 'No overlays detected' : '未检测到叠加层'}
                  </p>
                )}
              </Section>

              {/* LGA Section */}
              <Section
                icon={Scale}
                title={lang === 'en' ? 'Local Government' : '地方政府'}
                iconColor="brand-lime"
              >
                <DataRow
                  label={lang === 'en' ? 'LGA' : '地方政府区域'}
                  value={propertyData.lga || 'N/A'}
                />
              </Section>

              {/* SSD Feasibility Section */}
              <Section
                icon={propertyData.feasibility.ssdEligible ? CheckCircle : AlertTriangle}
                title={lang === 'en' ? 'SSD Feasibility' : 'SSD可行性'}
                iconColor={propertyData.feasibility.ssdEligible ? 'brand-lime' : 'red-500'}
              >
                <div className={cn(
                  'px-4 py-3 rounded-lg border',
                  propertyData.feasibility.ssdEligible
                    ? 'bg-brand-lime/10 border-brand-lime/20'
                    : 'bg-red-500/10 border-red-500/20'
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    {propertyData.feasibility.ssdEligible ? (
                      <CheckCircle className="w-4 h-4 text-brand-lime" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                    <span className={cn(
                      'font-semibold text-sm',
                      propertyData.feasibility.ssdEligible ? 'text-brand-lime' : 'text-red-400'
                    )}>
                      {propertyData.feasibility.ssdEligible
                        ? (lang === 'en' ? 'Eligible for SSD' : '符合SSD条件')
                        : (lang === 'en' ? 'Not Eligible' : '不符合条件')
                      }
                    </span>
                  </div>
                  {propertyData.feasibility.highestBestUse && (
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {propertyData.feasibility.highestBestUse}
                    </p>
                  )}
                  {propertyData.feasibility.riskFactors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {propertyData.feasibility.riskFactors.map((risk, idx) => (
                        <div key={idx} className="text-xs text-zinc-400">
                          • {risk}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Section>

              {/* Property Specifications */}
              {propertyData.specifications.bedrooms !== null && (
                <Section
                  icon={FileText}
                  title={lang === 'en' ? 'Property Specifications' : '房产规格'}
                  iconColor="brand-lime"
                >
                  <DataRow
                    label={lang === 'en' ? 'Bedrooms' : '卧室'}
                    value={propertyData.specifications.bedrooms?.toString() || 'N/A'}
                  />
                  <DataRow
                    label={lang === 'en' ? 'Bathrooms' : '浴室'}
                    value={propertyData.specifications.bathrooms?.toString() || 'N/A'}
                  />
                  <DataRow
                    label={lang === 'en' ? 'Car Spaces' : '车位'}
                    value={propertyData.specifications.carSpaces?.toString() || 'N/A'}
                  />
                  <DataRow
                    label={lang === 'en' ? 'Year Built' : '建造年份'}
                    value={propertyData.specifications.yearBuilt?.toString() || 'N/A'}
                  />
                  {propertyData.specifications.roofMaterial && (
                    <DataRow
                      label={lang === 'en' ? 'Roof Material' : '屋顶材料'}
                      value={propertyData.specifications.roofMaterial}
                    />
                  )}
                  {propertyData.specifications.wallMaterial && (
                    <DataRow
                      label={lang === 'en' ? 'Wall Material' : '墙体材料'}
                      value={propertyData.specifications.wallMaterial}
                    />
                  )}
                </Section>
              )}

              {/* Data Source Badge */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">
                    {lang === 'en' ? 'Data Source' : '数据来源'}
                  </span>
                  <span className="px-2 py-1 rounded bg-brand-lime/10 text-brand-lime font-mono">
                    property_parcels
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/** Section Component */
function Section({
  icon: Icon,
  title,
  iconColor,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={cn(
          'p-1.5 rounded-lg',
          `bg-${iconColor}/10 border border-${iconColor}/20`
        )}>
          <Icon className={cn('w-4 h-4', `text-${iconColor}`)} />
        </div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

/** Data Row Component */
function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-white/5">
      <span className="text-xs text-zinc-400">{label}</span>
      <span className="text-sm text-white font-medium text-right">{value}</span>
    </div>
  );
}
