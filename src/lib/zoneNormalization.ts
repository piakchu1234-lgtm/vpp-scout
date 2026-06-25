/**
 * ZONE CODE NORMALIZATION UTILITY
 *
 * Victorian Planning Provisions (VPP) have evolved over time, and legacy zone codes
 * from older planning schemes need to be translated to current equivalents for
 * accurate compliance routing and SSD eligibility determination.
 *
 * This utility normalizes legacy codes to their modern VPP counterparts.
 */

/**
 * Normalize a zone code by:
 * 1. Extracting the first 3 characters (base code)
 * 2. Translating legacy codes to modern equivalents
 * 3. Returning the standardized code for compliance evaluation
 *
 * @param rawCode - Raw zone code from Vicmap (e.g., "GRZ15", "R1Z", "B3Z")
 * @returns Normalized zone code (e.g., "GRZ", "C1Z")
 *
 * @example
 * normalizeZoneCode("GRZ15") // → "GRZ"
 * normalizeZoneCode("R1Z")   // → "GRZ" (legacy residential)
 * normalizeZoneCode("B3Z")   // → "C1Z" (legacy business)
 * normalizeZoneCode("NRZ2")  // → "NRZ"
 */
export function normalizeZoneCode(rawCode: string): string {
  if (!rawCode || typeof rawCode !== 'string') {
    return '';
  }

  // Extract first 3 characters as base code
  const baseCode = rawCode.trim().substring(0, 3).toUpperCase();

  // Translate Legacy Residential zones (pre-2014 VPP)
  // R1Z (General Residential) → GRZ
  // R2Z (Low Density Residential) → NRZ
  // R3Z (Medium Density Residential) → GRZ
  if (baseCode === 'R1Z' || baseCode === 'R3Z') {
    return 'GRZ';
  }
  if (baseCode === 'R2Z') {
    return 'NRZ';
  }

  // Translate Legacy Commercial/Business zones (pre-2014 VPP)
  // B1Z (Business 1) → C1Z (Commercial 1)
  // B2Z (Business 2) → C2Z (Commercial 2)
  // B3Z (Business 3) → C1Z (Commercial 1)
  // B4Z (Business 4) → C2Z (Commercial 2)
  // B5Z (Business 5) → C1Z (Commercial 1)
  if (['B1Z', 'B3Z', 'B5Z'].includes(baseCode)) {
    return 'C1Z';
  }
  if (['B2Z', 'B4Z'].includes(baseCode)) {
    return 'C2Z';
  }

  // Otherwise, return the sliced 3-character code
  // This handles modern codes like:
  // - "GRZ15" → "GRZ"
  // - "NRZ2" → "NRZ"
  // - "C1Z" → "C1Z"
  return baseCode;
}

/**
 * Batch normalize an array of zone codes
 *
 * @param zoneCodes - Array of raw zone codes
 * @returns Array of normalized zone codes (duplicates removed)
 */
export function normalizeZoneCodes(zoneCodes: string[]): string[] {
  if (!Array.isArray(zoneCodes)) {
    return [];
  }

  // Normalize each code and remove duplicates
  const normalized = zoneCodes
    .map(code => normalizeZoneCode(code))
    .filter(Boolean);

  return [...new Set(normalized)];
}

/**
 * Legacy zone code mapping reference
 *
 * This table documents the translation from pre-2014 VPP codes to current codes.
 * Useful for understanding historical planning scheme amendments.
 */
export const LEGACY_ZONE_MAP: Record<string, string> = {
  // Legacy Residential
  R1Z: 'GRZ', // General Residential Zone
  R2Z: 'NRZ', // Neighbourhood Residential Zone
  R3Z: 'GRZ', // Medium Density Residential → General Residential

  // Legacy Business/Commercial
  B1Z: 'C1Z', // Business 1 → Commercial 1
  B2Z: 'C2Z', // Business 2 → Commercial 2
  B3Z: 'C1Z', // Business 3 → Commercial 1
  B4Z: 'C2Z', // Business 4 → Commercial 2
  B5Z: 'C1Z', // Business 5 → Commercial 1
};

/**
 * Check if a zone code is a legacy code that needs translation
 *
 * @param zoneCode - Zone code to check
 * @returns true if the code is a legacy code
 */
export function isLegacyZoneCode(zoneCode: string): boolean {
  if (!zoneCode) return false;
  const baseCode = zoneCode.trim().substring(0, 3).toUpperCase();
  return baseCode in LEGACY_ZONE_MAP;
}
