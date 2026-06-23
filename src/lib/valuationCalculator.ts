/**
 * DYNAMIC PROPERTY VALUATION CALCULATOR
 *
 * Rough commercial valuation multipliers based on Victorian planning zones.
 * Uses per-square-meter rates adjusted for zone type.
 *
 * DISCLAIMER: These are rough estimates for feasibility analysis only.
 * Not a substitute for professional property valuation.
 */

/**
 * Calculate estimated property value based on lot size and zoning
 *
 * @param lotSizeM2 - Lot size in square meters
 * @param zoneCode - Planning zone code (e.g., 'CCZ2', 'GRZ1', 'C1Z')
 * @returns Estimated value in AUD
 */
export function calculateEstimatedValue(
  lotSizeM2: number,
  zoneCode: string | null
): number {
  if (!lotSizeM2 || lotSizeM2 <= 0) {
    return 0;
  }

  const zone = (zoneCode || '').toUpperCase();

  // Capital City Zone (highest value - CBD/inner city commercial)
  if (zone.startsWith('CCZ')) {
    return lotSizeM2 * 12000;
  }

  // Commercial Zones (C1Z, C2Z - Commercial 1 & 2 Zone)
  if (zone.startsWith('C1Z') || zone.startsWith('C2Z')) {
    return lotSizeM2 * 4500;
  }

  // Mixed Use Zone (MUZ - high-density mixed residential/commercial)
  if (zone.startsWith('MUZ')) {
    return lotSizeM2 * 3500;
  }

  // Industrial Zones (IN1Z, IN2Z, IN3Z)
  if (zone.startsWith('IN')) {
    return lotSizeM2 * 2000;
  }

  // Residential Growth Zone (RGZ - medium-high density)
  if (zone.startsWith('RGZ')) {
    return lotSizeM2 * 1800;
  }

  // General Residential Zone (GRZ - standard suburban)
  if (zone.startsWith('GRZ')) {
    return lotSizeM2 * 1500;
  }

  // Neighbourhood Residential Zone (NRZ - low-medium density)
  if (zone.startsWith('NRZ')) {
    return lotSizeM2 * 1400;
  }

  // Township Zone (TZ - regional townships)
  if (zone.startsWith('TZ')) {
    return lotSizeM2 * 1200;
  }

  // Low Density Residential Zone (LDRZ - large lots)
  if (zone.startsWith('LDRZ')) {
    return lotSizeM2 * 800;
  }

  // Rural Living Zone (RLZ - lifestyle blocks)
  if (zone.startsWith('RLZ')) {
    return lotSizeM2 * 500;
  }

  // Farming Zone (FZ - agricultural)
  if (zone.startsWith('FZ')) {
    return lotSizeM2 * 100;
  }

  // Rural Conservation Zone (RCZ - conservation priority)
  if (zone.startsWith('RCZ')) {
    return lotSizeM2 * 80;
  }

  // Public Land Zones (PPRZ, PUZ, etc.)
  if (zone.startsWith('PPRZ') || zone.startsWith('PUZ') || zone.startsWith('PCRZ')) {
    return lotSizeM2 * 500;
  }

  // Default fallback for unknown zones
  return lotSizeM2 * 1000;
}

/**
 * Format currency value for display
 *
 * @param value - Value in AUD
 * @returns Formatted string (e.g., "$12.5M", "$850K", "$45,000")
 */
export function formatEstimatedValue(value: number): string {
  if (value === 0) {
    return '$0';
  }

  // Millions
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    // If clean millions (e.g., 12000000), show as "$12M"
    if (millions % 1 === 0) {
      return `$${millions.toFixed(0)}M`;
    }
    // Otherwise show one decimal (e.g., "$12.5M")
    return `$${millions.toFixed(1)}M`;
  }

  // Thousands
  if (value >= 1_000) {
    const thousands = value / 1_000;
    // If clean thousands (e.g., 850000), show as "$850K"
    if (thousands % 1 === 0) {
      return `$${thousands.toFixed(0)}K`;
    }
    // Otherwise show one decimal (e.g., "$12.5K")
    return `$${thousands.toFixed(1)}K`;
  }

  // Under 1000, show full value with commas
  return `$${value.toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;
}

/**
 * Get the per-square-meter rate for a given zone
 * Useful for displaying "$/m²" in UI
 */
export function getZoneRate(zoneCode: string | null): number {
  const zone = (zoneCode || '').toUpperCase();

  if (zone.startsWith('CCZ')) return 12000;
  if (zone.startsWith('C1Z') || zone.startsWith('C2Z')) return 4500;
  if (zone.startsWith('MUZ')) return 3500;
  if (zone.startsWith('IN')) return 2000;
  if (zone.startsWith('RGZ')) return 1800;
  if (zone.startsWith('GRZ')) return 1500;
  if (zone.startsWith('NRZ')) return 1400;
  if (zone.startsWith('TZ')) return 1200;
  if (zone.startsWith('LDRZ')) return 800;
  if (zone.startsWith('RLZ')) return 500;
  if (zone.startsWith('FZ')) return 100;
  if (zone.startsWith('RCZ')) return 80;
  if (zone.startsWith('PPRZ') || zone.startsWith('PUZ') || zone.startsWith('PCRZ')) return 500;

  return 1000; // Default
}
