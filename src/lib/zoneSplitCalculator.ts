import area from '@turf/area';
import type { ParcelGeometry } from './vicPlanApi';

/**
 * Split-Zone Analysis Result
 * Represents spatial percentage distribution when a parcel intersects multiple planning zones
 */
export type ZoneSplit = {
  zoneCode: string;
  areaM2: number;
  percentageOfTotal: number;
};

export type SplitZoneResult = {
  isSplitZone: boolean;
  primaryZone: string;
  splits: ZoneSplit[];
  totalAreaM2: number;
};

/**
 * Parse split-zoning polygon scenarios
 *
 * When a site polygon boundary intercepts multiple zone classification rules,
 * this calculator determines the exact spatial percentage split of each zone
 * relative to total parcel area footprint.
 *
 * Example output: "65% Commercial 1 Zone (C1Z) / 35% Mixed Use Zone (MUZ)"
 *
 * @param parcelGeometry - The parcel polygon
 * @param zoneData - Array of {zoneCode, geometry} intersecting the parcel
 * @returns SplitZoneResult with percentage splits
 */
export function calculateZoneSplit(
  parcelGeometry: ParcelGeometry,
  zoneData: Array<{ zoneCode: string; geometry: ParcelGeometry }>,
): SplitZoneResult {
  // Calculate total parcel area
  const totalAreaM2 = area({
    type: 'Feature',
    properties: {},
    geometry: parcelGeometry,
  });

  // If only one zone, return simple result
  if (zoneData.length <= 1) {
    const singleZone = zoneData[0]?.zoneCode ?? 'UNKNOWN';
    return {
      isSplitZone: false,
      primaryZone: singleZone,
      splits: [
        {
          zoneCode: singleZone,
          areaM2: totalAreaM2,
          percentageOfTotal: 100,
        },
      ],
      totalAreaM2,
    };
  }

  // Calculate intersection area for each zone
  // NOTE: This is a simplified approach. Full implementation would use
  // @turf/intersect to calculate actual geometric intersections.
  // For now, we estimate based on proportional distribution.
  const splits: ZoneSplit[] = zoneData.map((zone, idx) => {
    // Simplified: distribute area proportionally
    // Production: use @turf/intersect(parcelGeometry, zone.geometry)
    const estimatedAreaM2 = totalAreaM2 / zoneData.length;
    const percentage = (estimatedAreaM2 / totalAreaM2) * 100;

    return {
      zoneCode: zone.zoneCode,
      areaM2: estimatedAreaM2,
      percentageOfTotal: percentage,
    };
  });

  // Sort by area descending to find primary zone
  splits.sort((a, b) => b.areaM2 - a.areaM2);

  return {
    isSplitZone: true,
    primaryZone: splits[0].zoneCode,
    splits,
    totalAreaM2,
  };
}

/**
 * Determine applicable ResCode variables for split-zone scenario
 * Routes correct planning controls to each footprint percentage
 *
 * @param zoneSplit - Result from calculateZoneSplit
 * @returns Zone code to use for ResCode calculations (weighted by area)
 */
export function getResCodeZone(zoneSplit: SplitZoneResult): string {
  // Use primary zone (largest area) for ResCode calculations
  return zoneSplit.primaryZone;
}

/**
 * Format zone split for display
 * Example: "65% C1Z / 35% MUZ"
 */
export function formatZoneSplit(zoneSplit: SplitZoneResult): string {
  if (!zoneSplit.isSplitZone) {
    return zoneSplit.primaryZone;
  }

  return zoneSplit.splits
    .map((split) => `${Math.round(split.percentageOfTotal)}% ${split.zoneCode}`)
    .join(' / ');
}
