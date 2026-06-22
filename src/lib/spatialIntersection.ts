/**
 * Spatial Intersection Engine — Automated Overlay Risk Detection
 *
 * Uses Turf.js to perform geometric intersection analysis between proposed
 * building footprints and Victorian planning overlays. Automatically detects
 * statutory constraints that void permit exemptions.
 *
 * Critical Use Cases:
 * 1. SSD permit exemption validation (BMO, LSIO, HO void exemptions)
 * 2. Multi-dwelling development risk assessment
 * 3. 3D massing constraint detection
 *
 * Legislative Context:
 * Even if a site meets all dimensional requirements (lot size, garden area,
 * GFA cap), certain overlays OVERRIDE permit exemptions and trigger mandatory
 * planning approval. This engine automates that critical check.
 */

import * as turf from '@turf/turf';
import type { Polygon, Feature } from 'geojson';
import type { OverlayGeometry } from './overlayService';

export type IntersectionResult = {
  intersects: boolean;
  overlayCode: string;
  overlayName: string;
  risk: 'high' | 'medium' | 'low';
  intersectionAreaM2: number;
  /** Percentage of building footprint affected by overlay */
  footprintAffectedPercent: number;
};

export type SpatialRiskAssessment = {
  hasHighRiskIntersections: boolean;
  hasMediumRiskIntersections: boolean;
  /** All detected intersections */
  intersections: IntersectionResult[];
  /** High-risk overlays that void permit exemptions */
  criticalOverlays: IntersectionResult[];
  /** Overall risk verdict */
  verdict: 'clear' | 'review_required' | 'permit_mandatory';
  /** Bilingual warning messages */
  warnings: {
    en: string[];
    zh: string[];
  };
};

/**
 * Check if a building footprint intersects with any planning overlays.
 *
 * @param buildingFootprint - GeoJSON Polygon of proposed building
 * @param overlays - Array of overlay geometries from Vicmap
 * @returns Detailed intersection analysis
 */
export function detectOverlayIntersections(
  buildingFootprint: Polygon,
  overlays: OverlayGeometry[],
): SpatialRiskAssessment {
  const intersections: IntersectionResult[] = [];
  const criticalOverlays: IntersectionResult[] = [];

  // Calculate building footprint area for percentage calculations
  const buildingFeature = turf.polygon(buildingFootprint.coordinates);
  const buildingAreaM2 = turf.area(buildingFeature);

  for (const overlay of overlays) {
    try {
      const overlayFeature = turf.polygon(overlay.geometry.coordinates);

      // Check for intersection
      const intersects = turf.booleanIntersects(buildingFeature, overlayFeature);

      if (intersects) {
        // Calculate intersection area
        let intersectionAreaM2 = 0;
        let footprintAffectedPercent = 0;

        try {
          const intersection = turf.intersect(
            turf.featureCollection([buildingFeature, overlayFeature]),
          );

          if (intersection) {
            intersectionAreaM2 = turf.area(intersection);
            footprintAffectedPercent =
              buildingAreaM2 > 0 ? (intersectionAreaM2 / buildingAreaM2) * 100 : 0;
          }
        } catch (err) {
          // Intersection calculation failed (complex polygons), but boolean check passed
          console.warn('[spatialIntersection] Intersection area calculation failed:', err);
          // Assume full footprint affected if we can't calculate exact area
          intersectionAreaM2 = buildingAreaM2;
          footprintAffectedPercent = 100;
        }

        const result: IntersectionResult = {
          intersects: true,
          overlayCode: overlay.code,
          overlayName: overlay.name,
          risk: overlay.risk,
          intersectionAreaM2,
          footprintAffectedPercent,
        };

        intersections.push(result);

        // Track critical overlays (high risk = voids permit exemptions)
        if (overlay.risk === 'high') {
          criticalOverlays.push(result);
        }
      }
    } catch (err) {
      console.warn(
        `[spatialIntersection] Failed to check intersection with overlay ${overlay.code}:`,
        err,
      );
      continue;
    }
  }

  // Determine overall verdict
  const hasHighRiskIntersections = criticalOverlays.length > 0;
  const hasMediumRiskIntersections = intersections.some((i) => i.risk === 'medium');

  let verdict: SpatialRiskAssessment['verdict'] = 'clear';
  if (hasHighRiskIntersections) {
    verdict = 'permit_mandatory';
  } else if (hasMediumRiskIntersections) {
    verdict = 'review_required';
  }

  // Generate bilingual warnings
  const warningsEn: string[] = [];
  const warningsZh: string[] = [];

  for (const critical of criticalOverlays) {
    const affectedPct = critical.footprintAffectedPercent.toFixed(1);

    // Generate specific warnings based on overlay type
    const code = critical.overlayCode.toUpperCase();

    if (code.startsWith('BMO') || code.startsWith('WMO')) {
      warningsEn.push(
        `CRITICAL: Proposed footprint intersects with ${critical.overlayName} (${critical.overlayCode}). ${affectedPct}% of building affected. Bushfire risk assessment and defendable space plan required. Planning permit MANDATORY.`,
      );
      warningsZh.push(
        `严重警告:拟建建筑与${critical.overlayName} (${critical.overlayCode})相交。建筑物 ${affectedPct}% 受影响。需进行山火风险评估和可防御空间规划。强制要求规划许可。`,
      );
    } else if (code.startsWith('LSIO') || code.startsWith('FO')) {
      warningsEn.push(
        `CRITICAL: Proposed footprint intersects with ${critical.overlayName} (${critical.overlayCode}). ${affectedPct}% of building affected. Flood risk assessment and minimum floor level approval required. Planning permit MANDATORY.`,
      );
      warningsZh.push(
        `严重警告:拟建建筑与${critical.overlayName} (${critical.overlayCode})相交。建筑物 ${affectedPct}% 受影响。需进行洪水风险评估和最低地板标高审批。强制要求规划许可。`,
      );
    } else if (code.startsWith('SBO')) {
      warningsEn.push(
        `CRITICAL: Proposed footprint intersects with ${critical.overlayName} (${critical.overlayCode}). ${affectedPct}% of building affected. Overland flow and drainage management plan required. Planning permit MANDATORY.`,
      );
      warningsZh.push(
        `严重警告:拟建建筑与${critical.overlayName} (${critical.overlayCode})相交。建筑物 ${affectedPct}% 受影响。需要地表径流和排水管理计划。强制要求规划许可。`,
      );
    } else if (code.startsWith('HO')) {
      warningsEn.push(
        `CRITICAL: Proposed footprint intersects with ${critical.overlayName} (${critical.overlayCode}). ${affectedPct}% of building affected. Heritage impact assessment and design review required. Planning permit MANDATORY.`,
      );
      warningsZh.push(
        `严重警告:拟建建筑与${critical.overlayName} (${critical.overlayCode})相交。建筑物 ${affectedPct}% 受影响。需要遗产影响评估和设计审查。强制要求规划许可。`,
      );
    } else {
      // Generic high-risk overlay warning
      warningsEn.push(
        `CRITICAL: Proposed footprint intersects with ${critical.overlayName} (${critical.overlayCode}). ${affectedPct}% of building affected. Statutory permit exemptions VOIDED. Planning permit MANDATORY.`,
      );
      warningsZh.push(
        `严重警告:拟建建筑与${critical.overlayName} (${critical.overlayCode})相交。建筑物 ${affectedPct}% 受影响。法定豁免失效。强制要求规划许可。`,
      );
    }
  }

  return {
    hasHighRiskIntersections,
    hasMediumRiskIntersections,
    intersections,
    criticalOverlays,
    verdict,
    warnings: {
      en: warningsEn,
      zh: warningsZh,
    },
  };
}

/**
 * Check if a building footprint is clear of all high-risk overlays.
 * Simplified version for quick permit exemption validation.
 *
 * @param buildingFootprint - GeoJSON Polygon of proposed building
 * @param overlays - Array of overlay geometries from Vicmap
 * @returns True if clear of high-risk overlays, false if intersects
 */
export function isFootprintClearOfCriticalOverlays(
  buildingFootprint: Polygon,
  overlays: OverlayGeometry[],
): boolean {
  const assessment = detectOverlayIntersections(buildingFootprint, overlays);
  return !assessment.hasHighRiskIntersections;
}

/**
 * Generate a consolidated risk report for display in UI or PDF.
 *
 * @param assessment - Spatial risk assessment result
 * @param language - Language for report ('en' or 'zh')
 * @returns Formatted risk report string
 */
export function generateRiskReport(
  assessment: SpatialRiskAssessment,
  language: 'en' | 'zh',
): string {
  if (assessment.verdict === 'clear') {
    return language === 'zh'
      ? '✅ 空间分析:拟建建筑未与任何高风险规划覆盖区相交。法定豁免维持有效。'
      : '✅ Spatial Analysis: Proposed building does not intersect with any high-risk planning overlays. Statutory exemptions remain valid.';
  }

  const warnings = assessment.warnings[language];

  if (assessment.verdict === 'permit_mandatory') {
    const header =
      language === 'zh'
        ? `⛔ 空间冲突检测:拟建建筑与 ${assessment.criticalOverlays.length} 个高风险覆盖区相交。法定豁免失效,强制要求规划许可。\n\n`
        : `⛔ Spatial Conflict Detected: Proposed building intersects with ${assessment.criticalOverlays.length} high-risk overlay(s). Statutory exemptions VOIDED. Planning permit MANDATORY.\n\n`;

    return header + warnings.join('\n\n');
  }

  if (assessment.verdict === 'review_required') {
    const header =
      language === 'zh'
        ? `⚠️ 覆盖区检测:拟建建筑与中等风险覆盖区相交。建议进一步审查。\n\n`
        : `⚠️ Overlay Detected: Proposed building intersects with medium-risk overlays. Further review recommended.\n\n`;

    return header + warnings.join('\n\n');
  }

  return '';
}
