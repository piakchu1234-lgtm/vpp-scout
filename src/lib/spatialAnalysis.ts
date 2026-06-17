/**
 * Spatial analysis utilities for multi-parcel feasibility calculations.
 * Merges cadastral parcels using Turf.js polygon union operations to support
 * multi-lot acquisition scenarios where developers need combined site metrics.
 */

import union from '@turf/union';
import area from '@turf/area';
import centroid from '@turf/centroid';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import type { ParcelFeature } from './vicPlanApi';
import { fetchVicPlanForPoint, type VicPlanData } from './vicPlanApi';

export type UnifiedSiteGeometry = {
  /** Merged polygon (may be MultiPolygon if parcels are non-contiguous). */
  geometry: Polygon | MultiPolygon;
  /** Total site area in square meters. */
  areaM2: number;
};

export type AggregatedOverlayData = {
  /** Deduplicated array of all overlay codes affecting the multi-parcel site. */
  overlayCodes: string[];
  /** Deduplicated raw scheme codes from all parcels. */
  overlayRaw: string[];
};

/**
 * Merge multiple parcel geometries into a unified site polygon for
 * multi-parcel feasibility analysis. Uses @turf/union to combine
 * geometries, handling both contiguous and non-contiguous parcels.
 *
 * @param parcels - Array of cadastral parcel features from Vicmap
 * @returns Unified geometry with total area, or null if merge fails
 *
 * @example
 * ```ts
 * const parcels = [parcel1, parcel2, parcel3];
 * const site = mergeParcelGeometries(parcels);
 * console.log(`Combined site: ${site.areaM2.toFixed(0)} m²`);
 * ```
 */
export function mergeParcelGeometries(
  parcels: ParcelFeature[],
): UnifiedSiteGeometry | null {
  if (parcels.length === 0) return null;

  // Single parcel - return as-is with computed area
  if (parcels.length === 1) {
    const geom = parcels[0].geometry;
    try {
      const m2 = area({ type: 'Feature', properties: {}, geometry: geom });
      return {
        geometry: geom,
        areaM2: Number.isFinite(m2) && m2 > 0 ? m2 : 0,
      };
    } catch (error) {
      console.error('[spatialAnalysis] Area calculation failed:', error);
      return null;
    }
  }

  // Multiple parcels - perform union
  try {
    // Start with the first parcel as a Feature (non-nullable because we
    // initialize it with a concrete geometry and only assign non-null results)
    let combined: Feature<Polygon | MultiPolygon> = {
      type: 'Feature',
      properties: {},
      geometry: parcels[0].geometry,
    };

    // Iteratively union each subsequent parcel
    for (let i = 1; i < parcels.length; i++) {
      const nextFeature: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: parcels[i].geometry,
      };

      // union() expects two features and returns a feature or null
      // Type assertion needed because @turf/union has inconsistent type definitions
      const unionResult = union(
        combined as any,
        nextFeature as any,
      ) as Feature<Polygon | MultiPolygon> | null;

      if (!unionResult) {
        console.warn('[spatialAnalysis] Union operation returned null at parcel', i);
        return null;
      }

      combined = unionResult;
    }

    const m2 = area(combined);
    return {
      geometry: combined.geometry,
      areaM2: Number.isFinite(m2) && m2 > 0 ? m2 : 0,
    };
  } catch (error) {
    console.error('[spatialAnalysis] Parcel union failed:', error);
    return null;
  }
}

/**
 * Aggregate planning overlays from multiple parcels by querying each parcel's
 * centroid against Vicmap Planning layers. Returns deduplicated overlay codes.
 *
 * For multi-parcel acquisitions, each lot may have different overlays (e.g.,
 * Lot A has HO, Lot B has SBO). This function fires concurrent queries to
 * VicPlan for each parcel's centroid and merges the results into a single
 * unique overlay array for compliance evaluation.
 *
 * @param parcels - Array of cadastral parcel features from Vicmap
 * @param timeoutMs - Query timeout per parcel (default 15s)
 * @returns Deduplicated array of overlay codes affecting the site
 *
 * @example
 * ```ts
 * const parcels = [parcel1, parcel2];
 * const overlays = await aggregateOverlaysFromParcels(parcels);
 * // overlays = ['HO', 'SBO'] (deduplicated)
 * ```
 */
export async function aggregateOverlaysFromParcels(
  parcels: ParcelFeature[],
  timeoutMs = 15000,
): Promise<string[]> {
  if (parcels.length === 0) return [];

  // Dynamically import to avoid circular dependency issues
  const { fetchVicPlanForPoint } = await import('./vicPlanApi');
  const centroid = (await import('@turf/centroid')).default;

  // Calculate centroid for each parcel and fetch overlays concurrently
  const overlayPromises = parcels.map(async (parcel) => {
    try {
      // Calculate parcel centroid (Turf.js returns [lon, lat])
      const centroidFeature = centroid({
        type: 'Feature',
        properties: {},
        geometry: parcel.geometry,
      });
      const [lon, lat] = centroidFeature.geometry.coordinates;

      // Query Vicmap Planning layers for this centroid
      const planData = await fetchVicPlanForPoint(lon, lat, timeoutMs);
      return planData.overlayRaw;
    } catch (error) {
      console.warn('[spatialAnalysis] Overlay fetch failed for parcel', parcel.properties.PARCEL_PFI, error);
      return [];
    }
  });

  // Wait for all queries to complete
  const results = await Promise.all(overlayPromises);

  // Flatten array of arrays and deduplicate using Set
  const allOverlays = results.flat();
  const uniqueOverlays = Array.from(new Set(allOverlays));

  return uniqueOverlays;
}
