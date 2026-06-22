/**
 * Small Second Dwelling (SSD) Compliance Card — 2026 Victorian Reforms
 *
 * Interactive compliance checker for permit-exempt SSD pathway.
 * Features:
 * - Toggle to enable SSD mode (constrains 3D massing to 60 m²)
 * - Real-time validation against 2026 Victorian reforms
 * - Whole-allotment garden area calculation
 * - Zero car parking requirement (bypasses Clause 52.06)
 * - Bilingual compliance warnings (gas prohibition, NCC 2025, subdivision)
 */

'use client';

import React from 'react';
import { Home, AlertTriangle, CheckCircle, Info, XCircle, AlertCircle } from 'lucide-react';
import { assessSSDCompliance, calculateMaxSSDFootprint, type SSDComplianceResult } from '@/lib/ssdCompliance';
import type { OverlayGeometry } from '@/lib/overlayService';
import type { Polygon } from 'geojson';

interface SSDComplianceCardProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  lotSizeM2: number;
  existingDwellingFootprintM2: number;
  proposedSSDFootprintM2: number;
  zoneCode: string;
  overlays?: string[];
  frontageM?: number | null;
  slopePercent?: number | null;
  language: 'en' | 'zh';
  buildingFootprintGeometry?: Polygon;
  overlayGeometries?: OverlayGeometry[];
}

export default function SSDComplianceCard({
  enabled,
  onToggle,
  lotSizeM2,
  existingDwellingFootprintM2,
  proposedSSDFootprintM2,
  zoneCode,
  overlays = [],
  frontageM = null,
  slopePercent = null,
  language,
  buildingFootprintGeometry,
  overlayGeometries = [],
}: SSDComplianceCardProps) {
  // Run compliance assessment when enabled
  const compliance: SSDComplianceResult | null = enabled
    ? assessSSDCompliance(
        lotSizeM2,
        existingDwellingFootprintM2,
        proposedSSDFootprintM2,
        zoneCode,
        overlays,
        frontageM,
        slopePercent,
        true, // hasSideAccess
        true, // hasTreeCanopySpace
        buildingFootprintGeometry,
        overlayGeometries,
      )
    : null;

  // Calculate max permissible SSD footprint
  const maxFootprint = calculateMaxSSDFootprint(lotSizeM2, existingDwellingFootprintM2);

  const getStatusIcon = (status: 'pass' | 'fail' | 'warning') => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'fail':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
    }
  };

  const getOverallStatusColor = (status: SSDComplianceResult['overallStatus']) => {
    switch (status) {
      case 'permit_exempt':
        return 'border-green-500/30 bg-green-500/10';
      case 'permit_required':
        return 'border-amber-500/30 bg-amber-500/10';
      case 'non_compliant':
        return 'border-red-500/30 bg-red-500/10';
    }
  };

  const getOverallStatusLabel = (status: SSDComplianceResult['overallStatus']) => {
    const labels = {
      permit_exempt: { en: 'Planning Permit Exempt', zh: '豁免规划许可 (Planning Permit Exempt)' },
      permit_required: { en: 'Planning Permit Required', zh: '需申请规划许可 (Planning Permit Required)' },
      non_compliant: { en: 'SSD Not Permitted', zh: '不允许建造 SSD (SSD Not Permitted)' },
    };
    return labels[status][language];
  };

  return (
    <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-lg p-4">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Home className="w-5 h-5 text-[#E9E778]" />
          <h3 className="text-lg font-bold text-white">
            {language === 'zh' ? 'Small Second Dwelling (小型第二住宅)' : 'Small Second Dwelling (SSD)'}
          </h3>
        </div>

        {/* Toggle Switch */}
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-zinc-400">
            {language === 'zh' ? '启用 SSD 模式' : 'Enable SSD Mode'}
          </span>
          <div className="relative">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#E9E778] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E9E778]"></div>
          </div>
        </label>
      </div>

      {!enabled && (
        <div className="p-4 bg-zinc-800/50 rounded border border-zinc-700 text-sm text-zinc-400">
          <p>
            {language === 'zh'
              ? '启用此模式以测试小型第二住宅(SSD)的可行性。SSD 最大建筑面积为 60 平方米,无需车位,但必须符合 ResCode 花园面积要求。'
              : 'Enable this mode to test Small Second Dwelling (SSD) feasibility. SSDs are capped at 60 m² with zero car parking requirement, but must meet ResCode garden area standards.'}
          </p>
        </div>
      )}

      {enabled && compliance && (
        <div className="space-y-4">
          {/* Overall Status Badge */}
          <div className={`p-4 rounded-lg border ${getOverallStatusColor(compliance.overallStatus)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-white">
                {language === 'zh' ? '合规状态' : 'Compliance Status'}
              </span>
              <span
                className={`text-sm font-bold ${
                  compliance.overallStatus === 'permit_exempt'
                    ? 'text-green-400'
                    : compliance.overallStatus === 'permit_required'
                      ? 'text-amber-400'
                      : 'text-red-400'
                }`}
              >
                {getOverallStatusLabel(compliance.overallStatus)}
              </span>
            </div>

            {/* Permit Status */}
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">
                  {language === 'zh' ? '规划许可 (Planning Permit)' : 'Planning Permit'}
                </span>
                <span className={compliance.isPlanningPermitExempt ? 'text-green-400' : 'text-amber-400'}>
                  {compliance.isPlanningPermitExempt
                    ? language === 'zh'
                      ? '豁免'
                      : 'Exempt'
                    : language === 'zh'
                      ? '需申请'
                      : 'Required'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">
                  {language === 'zh' ? '建筑许可 (Building Permit)' : 'Building Permit'}
                </span>
                <span className="text-amber-400">
                  {language === 'zh' ? '始终需要' : 'Always Required'}
                </span>
              </div>
            </div>
          </div>

          {/* Maximum SSD Footprint Info */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-300">
                <strong>{language === 'zh' ? '最大 SSD 建筑面积:' : 'Maximum SSD Footprint:'}</strong>{' '}
                {maxFootprint.maxFootprintM2.toFixed(1)} m²
                <br />
                <span className="text-blue-400/80">
                  {maxFootprint.limitingFactor === 'gfa_cap'
                    ? language === 'zh'
                      ? '(受 60 m² 上限限制)'
                      : '(Limited by 60 m² cap)'
                    : language === 'zh'
                      ? `(受花园面积要求限制)`
                      : `(Limited by garden area requirement)`}
                </span>
              </div>
            </div>
          </div>

          {/* Compliance Checks */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-zinc-300">
              {language === 'zh' ? '合规检查' : 'Compliance Checks'}
            </h4>
            {compliance.checks.map((check) => (
              <div
                key={check.id}
                className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded border border-zinc-700/50"
              >
                {getStatusIcon(check.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-white">{check.label[language]}</span>
                    <span className="text-xs text-zinc-500">{check.clause}</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{check.detail[language]}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Spatial Risk Assessment Section */}
          {compliance.spatialRisk && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                {compliance.spatialRisk.verdict === 'permit_mandatory' && (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
                {language === 'zh' ? '空间风险分析' : 'Spatial Risk Analysis'}
              </h4>

              {/* Overall Spatial Verdict */}
              <div
                className={`p-3 rounded border ${
                  compliance.spatialRisk.verdict === 'permit_mandatory'
                    ? 'bg-red-500/10 border-red-500/30'
                    : compliance.spatialRisk.verdict === 'review_required'
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-green-500/10 border-green-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-white">
                    {language === 'zh' ? '风险等级' : 'Risk Level'}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      compliance.spatialRisk.verdict === 'permit_mandatory'
                        ? 'text-red-400'
                        : compliance.spatialRisk.verdict === 'review_required'
                          ? 'text-amber-400'
                          : 'text-green-400'
                    }`}
                  >
                    {compliance.spatialRisk.verdict === 'permit_mandatory'
                      ? language === 'zh'
                        ? '强制许可'
                        : 'PERMIT MANDATORY'
                      : compliance.spatialRisk.verdict === 'review_required'
                        ? language === 'zh'
                          ? '需审查'
                          : 'REVIEW REQUIRED'
                        : language === 'zh'
                          ? '无风险'
                          : 'CLEAR'}
                  </span>
                </div>

                {compliance.spatialRisk.intersections.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <p className="text-xs text-zinc-400">
                      {language === 'zh'
                        ? `检测到 ${compliance.spatialRisk.intersections.length} 个覆盖区相交:`
                        : `${compliance.spatialRisk.intersections.length} overlay intersection(s) detected:`}
                    </p>
                    {compliance.spatialRisk.intersections.map((intersection, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded border text-xs ${
                          intersection.risk === 'high'
                            ? 'bg-red-500/10 border-red-500/20'
                            : intersection.risk === 'medium'
                              ? 'bg-amber-500/10 border-amber-500/20'
                              : 'bg-blue-500/10 border-blue-500/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-white">{intersection.overlayCode}</span>
                          <span
                            className={`text-xs ${
                              intersection.risk === 'high'
                                ? 'text-red-400'
                                : intersection.risk === 'medium'
                                  ? 'text-amber-400'
                                  : 'text-blue-400'
                            }`}
                          >
                            {intersection.footprintAffectedPercent.toFixed(1)}%{' '}
                            {language === 'zh' ? '受影响' : 'affected'}
                          </span>
                        </div>
                        <p className="text-zinc-400">{intersection.overlayName}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Spatial Risk Warnings */}
                {compliance.spatialRisk.warnings[language].length > 0 && (
                  <div className="mt-3 space-y-2">
                    {compliance.spatialRisk.warnings[language].map((warning, idx) => (
                      <p key={idx} className="text-xs text-zinc-300 leading-relaxed">
                        {warning}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Critical Warnings (NCC 2025, Gas, Subdivision) */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              {language === 'zh' ? '重要警告' : 'Critical Warnings'}
            </h4>

            <div className="space-y-2">
              {/* NCC 2025 Building Permit */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300">
                <strong className="text-amber-200">{language === 'zh' ? '建筑许可:' : 'Building Permit:'}</strong>{' '}
                {compliance.warnings.nccCompliance[language]}
              </div>

              {/* Gas Connection Prohibition */}
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-300">
                <strong className="text-red-200">{language === 'zh' ? '燃气连接:' : 'Gas Connection:'}</strong>{' '}
                {compliance.warnings.gasConnection[language]}
              </div>

              {/* Subdivision Prohibition */}
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-300">
                <strong className="text-red-200">{language === 'zh' ? '分割限制:' : 'Subdivision:'}</strong>{' '}
                {compliance.warnings.subdivisionProhibited[language]}
              </div>
            </div>
          </div>

          {/* Reference Note */}
          <div className="mt-4 p-3 bg-zinc-900/80 rounded text-xs text-zinc-400">
            <strong className="text-zinc-300">
              {language === 'zh' ? '法规参考:' : 'Legislative Reference:'}
            </strong>{' '}
            {language === 'zh'
              ? '2026 年维多利亚州小型第二住宅改革 (生效日期:2026 年 5 月 1 日)、NCC 2025、ResCode Clause 54.03-5'
              : '2026 Victorian Small Second Dwelling Reforms (effective 1 May 2026), NCC 2025, ResCode Clause 54.03-5'}
          </div>
        </div>
      )}
    </div>
  );
}
