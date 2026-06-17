import type { SiteParameters, SSDAssessmentResult } from './types/ssd';

const PERMITTED_ZONES = ['NRZ', 'GRZ', 'TZ', 'MUZ'];

const PROHIBITED_ZONES = ['C1Z', 'C2Z', 'INZ', 'IN1Z', 'IN2Z', 'IN3Z'];

const RESTRICTIVE_OVERLAYS = ['HO', 'SBO', 'LSIO', 'BMO', 'EAO'];

const MIN_LOT_SIZE_FAST_TRACK = 300;

const SSD_MAX_FLOOR_AREA = 60;

const DEFAULT_SETBACKS = {
  street: 4.0,
  side: 1.0,
  rear: 4.0,
};

export function evaluateSSDFeasibility(site: SiteParameters): SSDAssessmentResult {
  const blockingFactors: string[] = [];
  let isFastTrackEligible = true;
  let permitRequired = false;

  // 1. ZONING LOGIC: Check zone compatibility
  const hasPermittedZone = site.zones.some((zone) =>
    PERMITTED_ZONES.some((permitted) => zone.toUpperCase().startsWith(permitted))
  );

  const hasProhibitedZone = site.zones.some((zone) =>
    PROHIBITED_ZONES.some((prohibited) => zone.toUpperCase().startsWith(prohibited))
  );

  if (hasProhibitedZone) {
    isFastTrackEligible = false;
    const prohibitedZone = site.zones.find((zone) =>
      PROHIBITED_ZONES.some((prohibited) => zone.toUpperCase().startsWith(prohibited))
    );
    blockingFactors.push(`Prohibited zone: ${prohibitedZone}`);
  }

  if (!hasPermittedZone && !hasProhibitedZone) {
    isFastTrackEligible = false;
    blockingFactors.push('Zone not in permitted list (NRZ, GRZ, TZ, MUZ)');
  }

  // 2. THRESHOLD LOGIC: Lot size minimum
  if (site.lotSize < MIN_LOT_SIZE_FAST_TRACK) {
    permitRequired = true;
    blockingFactors.push(`Lot size below 300m² threshold (${Math.round(site.lotSize)}m²)`);
  }

  // 3. OVERLAY CHECK: Scan for restrictive overlays
  const foundRestrictiveOverlays = site.overlays.filter((overlay) =>
    RESTRICTIVE_OVERLAYS.some((restrictive) => overlay.toUpperCase().startsWith(restrictive))
  );

  if (foundRestrictiveOverlays.length > 0) {
    permitRequired = true;
    isFastTrackEligible = false;
    foundRestrictiveOverlays.forEach((overlay) => {
      blockingFactors.push(`Restrictive overlay detected: ${overlay}`);
    });
  }

  // 4. EXISTING DWELLING CHECK: SSD requires primary dwelling
  if (!site.hasExistingDwelling) {
    isFastTrackEligible = false;
    permitRequired = true;
    blockingFactors.push('No existing primary dwelling on site');
  }

  // 5. FINAL ELIGIBILITY: Fast-track requires all criteria met
  if (blockingFactors.length > 0) {
    isFastTrackEligible = false;
  }

  return {
    isFastTrackEligible,
    permitRequired,
    maxFloorArea: SSD_MAX_FLOOR_AREA,
    blockingFactors,
    requiredSetbacks: DEFAULT_SETBACKS,
  };
}
