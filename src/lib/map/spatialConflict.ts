/**
 * Spatial Conflict Detection Utilities
 *
 * Detects conflicts between drawn SSD footprints and easement geometries.
 */

import * as turf from '@turf/turf';
import type { Feature, Polygon } from 'geojson';
import type { EasementData } from '@/lib/easementApi';

export interface SpatialConflict {
  /** Whether a conflict exists */
  hasConflict: boolean;

  /** Type of easement causing conflict */
  conflictingEasementType?: string;

  /** Warning message for user display */
  warningMessage?: string;

  /** Intersection area in square meters (if applicable) */
  intersectionArea?: number;
}

/**
 * Check if a drawn polygon intersects with any easements
 *
 * @param drawnPolygon - User-drawn SSD footprint
 * @param easements - Array of easement data from Vicmap
 * @returns Conflict detection result
 */
export function detectEasementConflict(
  drawnPolygon: Feature<Polygon>,
  easements: EasementData[]
): SpatialConflict {
  if (!easements || easements.length === 0) {
    return { hasConflict: false };
  }

  for (const easement of easements) {
    try {
      const easementFeature: Feature<Polygon> = {
        type: 'Feature',
        geometry: easement.polygon,
        properties: {},
      };

      // Check for intersection
      const intersects = turf.booleanIntersects(drawnPolygon, easementFeature);

      if (intersects) {
        // Calculate intersection area
        const intersection = turf.intersect(
          turf.featureCollection([drawnPolygon, easementFeature])
        );

        const intersectionArea = intersection ? turf.area(intersection) : 0;

        return {
          hasConflict: true,
          conflictingEasementType: easement.type,
          warningMessage: `⚠️ Spatial Conflict: Proposed dwelling overlaps a ${easement.type.toLowerCase()} easement`,
          intersectionArea,
        };
      }
    } catch (error) {
      console.error('[spatialConflict] Error checking easement:', error);
      // Continue checking other easements
    }
  }

  return { hasConflict: false };
}

/**
 * Get severity level of conflict based on easement type
 */
export function getConflictSeverity(easementType: string): 'critical' | 'warning' | 'info' {
  const typeUpper = easementType.toUpperCase();

  // Critical: Cannot build over these
  if (typeUpper.includes('SEWER') || typeUpper.includes('MAIN')) {
    return 'critical';
  }

  // Warning: May require special approval
  if (
    typeUpper.includes('DRAIN') ||
    typeUpper.includes('UTILITY') ||
    typeUpper.includes('ACCESS')
  ) {
    return 'warning';
  }

  // Info: Less restrictive
  return 'info';
}

/**
 * Format conflict message for user display
 */
export function formatConflictMessage(
  conflict: SpatialConflict,
  language: 'en' | 'zh' = 'en'
): string {
  if (!conflict.hasConflict) {
    return language === 'en'
      ? '✓ No easement conflicts detected'
      : '✓ 未检测到地役权冲突';
  }

  const type = conflict.conflictingEasementType || 'unknown';
  const severity = getConflictSeverity(type);

  if (language === 'zh') {
    return `⚠️ 空间冲突：拟建建筑与${type}重叠`;
  }

  if (severity === 'critical') {
    return `🚫 Critical Conflict: Building over ${type} easement is prohibited`;
  }

  return conflict.warningMessage || '⚠️ Easement conflict detected';
}
