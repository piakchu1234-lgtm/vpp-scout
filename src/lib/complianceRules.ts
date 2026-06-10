/**
 * VPP VC282 小型第二住宅 (Small Second Dwelling / SSD) fast-track compliance
 * evaluation utility.
 *
 * Determines whether a property qualifies for the fast-track pathway based on:
 * - Zone eligibility (GRZ, NRZ, RGZ, MUZ, TZ)
 * - Minimum lot size (≥300m²)
 * - Absence of restrictive overlays (HO, BMO, LSIO, SBO)
 */

import { SSD_MIN_LOT_SIZE_M2 } from './feasibility';

// ---------- Types ----------

/**
 * Result of fast-track eligibility evaluation.
 */
export type ComplianceResult = {
  /** True if the property's zone permits SSDs. */
  ssdEligible: boolean;
  /** True if any restrictive overlays are present. */
  hasRestrictiveOverlays: boolean;
  /** True if all fast-track criteria are met (zone + lot size + no restrictive overlays). */
  isFastTrackable: boolean;
  /** List of restrictive overlay codes found on the property. */
  restrictiveOverlays: string[];
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

// ---------- Main Function ----------

/**
 * Evaluate whether a property qualifies for the VPP VC282 SSD fast-track pathway.
 *
 * @param zoneCode - The planning zone code (e.g., "GRZ", "GRZ1", "NRZ")
 * @param lotSizeM2 - The lot size in square metres
 * @param overlays - Array of overlay codes (e.g., ["HO123", "PO1"])
 * @returns ComplianceResult with eligibility flags and restrictive overlay list
 */
export function evaluateFastTrack(
  zoneCode: string | null | undefined,
  lotSizeM2: number,
  overlays: string[],
): ComplianceResult {
  // Step 1: Check zone eligibility
  const baseZone = extractBaseZone(zoneCode);
  const ssdEligible = baseZone !== null && ELIGIBLE_ZONES.includes(baseZone);

  // Step 2: Check lot size
  const lotSizeQualifies = lotSizeM2 >= SSD_MIN_LOT_SIZE_M2;

  // Step 3: Check for restrictive overlays
  const restrictiveOverlays = findRestrictiveOverlays(overlays);
  const hasRestrictiveOverlays = restrictiveOverlays.length > 0;

  // Step 4: Determine fast-track eligibility
  const isFastTrackable =
    ssdEligible && lotSizeQualifies && !hasRestrictiveOverlays;

  return {
    ssdEligible,
    hasRestrictiveOverlays,
    isFastTrackable,
    restrictiveOverlays,
  };
}
