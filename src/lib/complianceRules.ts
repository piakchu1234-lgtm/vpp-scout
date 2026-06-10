/**
 * VPP VC282 小型第二住宅 (Small Second Dwelling / SSD) fast-track compliance
 * evaluation utility.
 *
 * Determines whether a property qualifies for the deemed-to-comply pathway based on:
 * - Zone eligibility (GRZ, NRZ, RGZ, MUZ, TZ)
 * - Minimum lot size (≥300m²)
 * - Absence of restrictive overlays (HO, BMO, LSIO, SBO)
 * - Frontage requirements (≥9m for existing dwellings)
 * - Land vacancy status
 */

import { SSD_MIN_LOT_SIZE_M2 } from './feasibility';

// ---------- Types ----------

/**
 * Result of fast-track eligibility evaluation with detailed reasoning.
 */
export type ComplianceResult = {
  /** Overall compliance status */
  status: 'eligible' | 'permit-required';
  /** Human-readable explanation of the assessment outcome */
  reasoning: string;
  /** Factors that completely block deemed-to-comply eligibility */
  blockingFactors: string[];
  /** Conditions that would trigger a planning permit requirement */
  permitTriggers: string[];
};

/**
 * Input parameters for compliance evaluation.
 */
export type ComplianceInput = {
  landSizeM2: number | null;
  zoneCode: string | null;
  overlays: string[];
  frontageM: number | null;
  isVacantLand: boolean;
};

// ---------- Constants ----------

/**
 * Zones that permit Small Second Dwellings under VC282.
 * Handles both bare codes (e.g., "GRZ") and schedule-suffixed codes (e.g., "GRZ1").
 */
const ELIGIBLE_ZONES = ['GRZ', 'NRZ', 'RGZ', 'MUZ', 'TZ'];

/**
 * Overlay prefixes that disqualify a property from the fast-track pathway.
 * - HO: Heritage Overlay
 * - BMO: Bushfire Management Overlay
 * - LSIO: Land Subject to Inundation Overlay (legacy code for FO)
 * - SBO: Special Building Overlay
 */
const RESTRICTIVE_OVERLAY_PREFIXES = ['HO', 'BMO', 'LSIO', 'SBO'];

/**
 * Minimum frontage requirement for lots with existing dwellings (metres).
 */
const MIN_FRONTAGE_EXISTING_M = 9;

// ---------- Helper Functions ----------

/**
 * Extract the base zone code from a zone string that may include a schedule suffix.
 * @example "GRZ1" → "GRZ", "grz" → "GRZ", "MUZ" → "MUZ"
 */
function extractBaseZone(zoneCode: string | null | undefined): string | null {
  if (!zoneCode) return null;
  const upper = zoneCode.toUpperCase().trim();
  if (upper.length === 0) return null;

  // Match letters only at the start (stops at first digit or end)
  const match = upper.match(/^[A-Z]+/);
  return match ? match[0] : null;
}

/**
 * Find all restrictive overlays in the provided overlay list.
 * Matches by prefix (e.g., "HO123" matches "HO", "BMO" matches "BMO").
 */
function findRestrictiveOverlays(overlays: string[]): string[] {
  const restrictive: string[] = [];
  for (const overlay of overlays) {
    const upper = overlay.toUpperCase().trim();
    if (upper.length === 0) continue;

    for (const prefix of RESTRICTIVE_OVERLAY_PREFIXES) {
      if (upper.startsWith(prefix)) {
        restrictive.push(overlay);
        break; // Don't double-count if multiple prefixes match
      }
    }
  }
  return restrictive;
}

/**
 * Generate human-readable zone name from code.
 */
function describeZone(baseZone: string | null): string {
  if (!baseZone) return 'Unknown Zone';
  const zoneMap: Record<string, string> = {
    GRZ: 'General Residential Zone',
    NRZ: 'Neighbourhood Residential Zone',
    RGZ: 'Residential Growth Zone',
    MUZ: 'Mixed Use Zone',
    TZ: 'Township Zone',
  };
  return zoneMap[baseZone] || baseZone;
}

/**
 * Generate human-readable overlay description.
 */
function describeOverlay(code: string): string {
  const upper = code.toUpperCase();
  if (upper.startsWith('HO')) return `Heritage Overlay (${code})`;
  if (upper.startsWith('BMO')) return `Bushfire Management Overlay (${code})`;
  if (upper.startsWith('LSIO')) return `Land Subject to Inundation Overlay (${code})`;
  if (upper.startsWith('SBO')) return `Special Building Overlay (${code})`;
  return code;
}

// ---------- Main Function ----------

/**
 * Evaluate whether a property qualifies for the VPP VC282 SSD deemed-to-comply pathway.
 *
 * @param input - Property characteristics and planning constraints
 * @returns ComplianceResult with status, reasoning, and detailed factors
 */
export function evaluateFastTrack(input: ComplianceInput): ComplianceResult {
  const { landSizeM2, zoneCode, overlays, frontageM, isVacantLand } = input;

  const blockingFactors: string[] = [];
  const permitTriggers: string[] = [];

  // Step 1: Check zone eligibility
  const baseZone = extractBaseZone(zoneCode);
  const ssdEligible = baseZone !== null && ELIGIBLE_ZONES.includes(baseZone);

  if (!ssdEligible) {
    if (!baseZone) {
      blockingFactors.push('Zone data unavailable — cannot assess SSD eligibility');
    } else {
      blockingFactors.push(
        `Zone ${describeZone(baseZone)} does not permit Small Second Dwellings under VC282`,
      );
    }
  }

  // Step 2: Check lot size
  if (landSizeM2 === null) {
    blockingFactors.push('Lot size data unavailable — cannot confirm minimum 300m² requirement');
  } else if (landSizeM2 < SSD_MIN_LOT_SIZE_M2) {
    blockingFactors.push(
      `Lot size ${Math.round(landSizeM2)}m² is below the 300m² minimum for SSD eligibility`,
    );
  }

  // Step 3: Check for restrictive overlays
  const restrictiveOverlays = findRestrictiveOverlays(overlays);
  if (restrictiveOverlays.length > 0) {
    blockingFactors.push(
      `Restrictive overlay detected: ${restrictiveOverlays.map(describeOverlay).join(', ')}`,
    );
  }

  // Step 4: Check frontage (for lots with existing dwellings)
  if (!isVacantLand) {
    if (frontageM === null) {
      permitTriggers.push(
        'Frontage data unavailable — if frontage < 9m, planning permit required',
      );
    } else if (frontageM < MIN_FRONTAGE_EXISTING_M) {
      permitTriggers.push(
        `Frontage ${frontageM.toFixed(1)}m is below the 9m minimum for deemed-to-comply (existing dwelling lot)`,
      );
    }
  }

  // Step 5: Determine overall status
  const hasHardBlockers = blockingFactors.length > 0;
  const hasSoftTriggers = permitTriggers.length > 0;

  const status: 'eligible' | 'permit-required' =
    hasHardBlockers || hasSoftTriggers ? 'permit-required' : 'eligible';

  // Step 6: Generate reasoning
  let reasoning: string;
  if (status === 'eligible') {
    reasoning = `Property qualifies for the deemed-to-comply pathway under VC282: ${describeZone(baseZone)}, lot size ${landSizeM2 ? Math.round(landSizeM2) : '—'}m², no restrictive overlays detected.`;
  } else if (hasHardBlockers) {
    reasoning = `Property does not meet SSD eligibility criteria. Planning permit required.`;
  } else {
    reasoning = `Property meets basic SSD criteria but triggers planning permit requirements.`;
  }

  return {
    status,
    reasoning,
    blockingFactors,
    permitTriggers,
  };
}
