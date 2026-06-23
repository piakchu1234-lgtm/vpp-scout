/**
 * VICTORIAN PLANNING SCHEME OVERLAY DICTIONARY
 *
 * Maps overlay codes to human-readable descriptions.
 * Source: Victoria Planning Provisions (VPP)
 * Updated: 2026
 */

export const OVERLAY_DICTIONARY: Record<string, string> = {
  // Design and Built Form
  DDO: 'Design and Development Overlay',
  DDO1: 'Design and Development Overlay - Schedule 1',
  DDO2: 'Design and Development Overlay - Schedule 2',
  DDO3: 'Design and Development Overlay - Schedule 3',
  DDO4: 'Design and Development Overlay - Schedule 4',
  DDO5: 'Design and Development Overlay - Schedule 5',
  DDO6: 'Design and Development Overlay - Schedule 6',
  DDO7: 'Design and Development Overlay - Schedule 7',
  DDO8: 'Design and Development Overlay - Schedule 8',
  DDO9: 'Design and Development Overlay - Schedule 9',
  DDO10: 'Design and Development Overlay - Schedule 10',

  // Heritage
  HO: 'Heritage Overlay',
  HO1: 'Heritage Overlay - Schedule 1',
  HO2: 'Heritage Overlay - Schedule 2',
  HO3: 'Heritage Overlay - Schedule 3',
  HO4: 'Heritage Overlay - Schedule 4',
  HO5: 'Heritage Overlay - Schedule 5',

  // Environmental
  ESO: 'Environmental Significance Overlay',
  ESO1: 'Environmental Significance Overlay - Schedule 1',
  ESO2: 'Environmental Significance Overlay - Schedule 2',
  ESO3: 'Environmental Significance Overlay - Schedule 3',
  VPO: 'Vegetation Protection Overlay',
  VPO1: 'Vegetation Protection Overlay - Schedule 1',
  VPO2: 'Vegetation Protection Overlay - Schedule 2',
  SLO: 'Significant Landscape Overlay',
  SLO1: 'Significant Landscape Overlay - Schedule 1',
  SLO2: 'Significant Landscape Overlay - Schedule 2',
  SLO3: 'Significant Landscape Overlay - Schedule 3',

  // Land Management
  LSIO: 'Land Subject to Inundation Overlay',
  LSIO1: 'Land Subject to Inundation Overlay - Schedule 1',
  FO: 'Floodway Overlay',
  BMO: 'Bushfire Management Overlay',
  BMO1: 'Bushfire Management Overlay - Schedule 1',
  EAO: 'Environmental Audit Overlay',
  EMO: 'Erosion Management Overlay',
  SMO: 'Salinity Management Overlay',

  // Development
  SBO: 'Special Building Overlay',
  SBO1: 'Special Building Overlay - Schedule 1',
  SBO2: 'Special Building Overlay - Schedule 2',
  DPO: 'Development Plan Overlay',
  DPO1: 'Development Plan Overlay - Schedule 1',
  DPO2: 'Development Plan Overlay - Schedule 2',
  DPO3: 'Development Plan Overlay - Schedule 3',
  DPO4: 'Development Plan Overlay - Schedule 4',

  // Infrastructure
  PO: 'Parking Overlay',
  PO1: 'Parking Overlay - Schedule 1',
  AEO: 'Airport Environs Overlay',
  PAO: 'Public Acquisition Overlay',
  PAO1: 'Public Acquisition Overlay - Schedule 1',
  PAO2: 'Public Acquisition Overlay - Schedule 2',
  RXO: 'Road Zone',

  // Neighbourhood Character
  NCO: 'Neighbourhood Character Overlay',
  NCO1: 'Neighbourhood Character Overlay - Schedule 1',
  NCO2: 'Neighbourhood Character Overlay - Schedule 2',
  NCO3: 'Neighbourhood Character Overlay - Schedule 3',
  NCO4: 'Neighbourhood Character Overlay - Schedule 4',
  NCO5: 'Neighbourhood Character Overlay - Schedule 5',

  // Other Common Overlays
  DCPO: 'Development Contributions Plan Overlay',
  DCPO1: 'Development Contributions Plan Overlay - Schedule 1',
  DCPO2: 'Development Contributions Plan Overlay - Schedule 2',
  IPO: 'Incorporated Plan Overlay',
  IPO1: 'Incorporated Plan Overlay - Schedule 1',
  IPO2: 'Incorporated Plan Overlay - Schedule 2',
  LSO: 'Land Subject to Inundation Overlay',
  LDRZ: 'Low Density Residential Zone',
  MUZ: 'Mixed Use Zone',
  RLZ: 'Rural Living Zone',
};

/**
 * Get human-readable description for an overlay code
 * @param code - Overlay code (e.g., 'DDO', 'HO1', 'LSIO')
 * @returns Human-readable description or the code itself if not found
 */
export function getOverlayDescription(code: string): string {
  // Try exact match first
  if (OVERLAY_DICTIONARY[code]) {
    return OVERLAY_DICTIONARY[code];
  }

  // Try base code without schedule number (e.g., DDO15 -> DDO)
  const baseCode = code.replace(/\d+$/, '');
  if (OVERLAY_DICTIONARY[baseCode]) {
    // Extract schedule number if present
    const scheduleMatch = code.match(/\d+$/);
    const scheduleNumber = scheduleMatch ? scheduleMatch[0] : null;

    if (scheduleNumber) {
      return `${OVERLAY_DICTIONARY[baseCode]} - Schedule ${scheduleNumber}`;
    }
    return OVERLAY_DICTIONARY[baseCode];
  }

  // Return the code itself if no match found
  return code;
}

/**
 * Check if an overlay code exists in the dictionary
 */
export function isKnownOverlay(code: string): boolean {
  return code in OVERLAY_DICTIONARY || code.replace(/\d+$/, '') in OVERLAY_DICTIONARY;
}
