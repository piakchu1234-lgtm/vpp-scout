import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';
import type { FillExtrusionLayer } from 'mapbox-gl';

export type ZoneCode = string;

export type HeightCalculationResult = {
  /** Extrusion height in meters */
  heightMeters: number;
  /** Source of height limit (zone code, overlay, or fallback) */
  source: 'zone' | 'overlay' | 'fallback';
  /** Description of the statutory basis */
  description: string;
};

/**
 * Victorian Planning Zone Color Mapping
 * Maps standardized planning zones to hex colors for dynamic Mapbox fills
 */
export const ZONE_COLOR_MAP: Record<string, string> = {
  // Commercial Zones - Rich Crimson Red
  C1Z: '#E63946',
  C2Z: '#E63946',
  CCZ: '#E63946', // Capital City Zone (commercial)

  // Mixed Use Zone - Warm Terracotta
  MUZ: '#D68C45',

  // Residential Growth & General Zones - Vibrant Magenta/Pink
  RGZ: '#E07A5F',
  GRZ: '#E07A5F',
  NRZ: '#E07A5F', // Neighbourhood Residential

  // Public Use & Parks - Forest Green
  PUZ: '#2A9D8F',
  PCRZ: '#2A9D8F', // Public Conservation & Resource Zone
  PPRZ: '#2A9D8F', // Public Park & Recreation Zone

  // Low Density Residential - Soft Coral
  LDRZ: '#F4A261',

  // Township Zone - Warm Sand
  TZ: '#E9C46A',

  // Industrial - Steel Grey
  IN1Z: '#6C757D',
  IN2Z: '#6C757D',
  IN3Z: '#6C757D',

  // Default fallback - Neutral Grey
  DEFAULT: '#95A3B3',
};

/**
 * Get fill color for a given zone code
 * Handles both exact matches and prefix matches (e.g., C1Z-3 → C1Z)
 */
export function getZoneColor(zoneCode: string): string {
  if (!zoneCode) return ZONE_COLOR_MAP.DEFAULT;

  const normalized = zoneCode.trim().toUpperCase();

  // Exact match
  if (ZONE_COLOR_MAP[normalized]) {
    return ZONE_COLOR_MAP[normalized];
  }

  // Prefix match (e.g., C1Z-3 → C1Z)
  for (const [key, color] of Object.entries(ZONE_COLOR_MAP)) {
    if (normalized.startsWith(key)) {
      return color;
    }
  }

  return ZONE_COLOR_MAP.DEFAULT;
}

/**
 * Parcel with zoning metadata
 */
export type ZonedParcel = {
  geometry: Polygon | MultiPolygon;
  zoneCode: string;
  parcelId?: string;
};

/**
 * Build GeoJSON FeatureCollection for dynamic Mapbox fill layers
 *
 * Translates parcel zoning attribute arrays into Mapbox-compatible GeoJSON
 * with zone-based color properties.
 *
 * @param parcels - Array of parcels with geometry and zone metadata
 * @returns GeoJSON FeatureCollection with zone color properties
 */
export function buildZoningFillLayer(parcels: ZonedParcel[]): FeatureCollection {
  const features: Feature[] = parcels.map((parcel, idx) => ({
    type: 'Feature',
    id: parcel.parcelId || `parcel-${idx}`,
    geometry: parcel.geometry,
    properties: {
      zoneCode: parcel.zoneCode,
      fillColor: getZoneColor(parcel.zoneCode),
      parcelId: parcel.parcelId || `parcel-${idx}`,
    },
  }));

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Split-zone parcel representation
 */
export type SplitZoneParcel = {
  geometry: Polygon | MultiPolygon;
  zones: Array<{
    code: string;
    percentage: number; // 0-100
  }>;
  parcelId?: string;
};

/**
 * Build GeoJSON FeatureCollection for split-zone parcels
 *
 * Handles multi-zone parcels with percentage breakdowns.
 * Fill color uses primary zone (highest percentage).
 * Label shows bilingual short-codes (e.g., "65% C1Z / 35% MUZ").
 *
 * @param parcels - Array of split-zone parcels
 * @returns GeoJSON FeatureCollection with zone metadata
 */
export function buildSplitZoneFillLayer(parcels: SplitZoneParcel[]): FeatureCollection {
  const features: Feature[] = parcels.map((parcel, idx) => {
    // Sort zones by percentage descending
    const sortedZones = [...parcel.zones].sort((a, b) => b.percentage - a.percentage);
    const primaryZone = sortedZones[0];

    // Build bilingual label: "65% C1Z / 35% MUZ"
    const label = sortedZones
      .map((z) => `${Math.round(z.percentage)}% ${z.code}`)
      .join(' / ');

    return {
      type: 'Feature',
      id: parcel.parcelId || `split-parcel-${idx}`,
      geometry: parcel.geometry,
      properties: {
        primaryZone: primaryZone.code,
        fillColor: getZoneColor(primaryZone.code),
        zoneLabel: label,
        zones: sortedZones,
        parcelId: parcel.parcelId || `split-parcel-${idx}`,
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Build consolidated super-lot boundary GeoJSON
 *
 * Calculates exterior bounding envelope of combined properties for
 * multi-parcel aggregation visualization.
 *
 * @param parcels - Array of parcels to consolidate
 * @returns GeoJSON Feature with envelope geometry
 */
export function buildConsolidatedEnvelope(
  parcels: Array<{ geometry: Polygon | MultiPolygon }>,
): Feature | null {
  if (parcels.length === 0) return null;

  // For simplicity, use the first parcel geometry as envelope
  // Production: use @turf/union or @turf/convex to calculate actual envelope
  const envelopeGeometry = parcels[0].geometry;

  return {
    type: 'Feature',
    id: 'consolidated-envelope',
    geometry: envelopeGeometry,
    properties: {
      type: 'consolidated-envelope',
      parcelCount: parcels.length,
    },
  };
}

/**
 * Mapbox layer style configurations
 */
export const ZONING_FILL_LAYER_STYLE = {
  id: 'zoning-fill',
  type: 'fill' as const,
  paint: {
    'fill-color': ['get', 'fillColor'],
    'fill-opacity': 0.35, // Prevents satellite map obscuration
  },
};

export const ZONING_LABEL_LAYER_STYLE = {
  id: 'zoning-label',
  type: 'symbol' as const,
  layout: {
    'text-field': ['get', 'zoneLabel'],
    'text-size': 12,
    'text-anchor': 'center',
    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
  },
  paint: {
    'text-color': '#FFFFFF',
    'text-halo-color': '#000000',
    'text-halo-width': 2,
  },
};

export const CONSOLIDATED_ENVELOPE_LAYER_STYLE = {
  id: 'consolidated-envelope',
  type: 'line' as const,
  paint: {
    'line-color': '#E9E778', // Neon lime
    'line-width': 4,
    'line-blur': 2,
    'line-opacity': 0.9,
  },
};

// ============================================================================
// 3D MASSING ENGINE
// ============================================================================

/**
 * Victorian Planning Provisions statutory height limits (2026).
 *
 * SOURCE: Victoria Planning Provisions (VPP) - Standard Height Controls
 * - Clause 32.08 (General Residential Zone - GRZ)
 * - Clause 32.09 (Neighbourhood Residential Zone - NRZ)
 * - Clause 55.03-1 (ResCode Height & Setback)
 */
const STATUTORY_HEIGHT_MATRIX: Record<string, number> = {
  // Residential Zones
  GRZ: 11.0, // General Residential - 3 storeys / 11m
  GRZ1: 11.0,
  GRZ2: 11.0,
  GRZ3: 11.0,
  NRZ: 9.0, // Neighbourhood Residential - 2 storeys / 9m
  NRZ1: 9.0,
  NRZ2: 9.0,
  NRZ3: 9.0,
  RGZ: 13.5, // Residential Growth - 4 storeys / 13.5m
  RGZ1: 13.5,
  RGZ2: 13.5,
  LDRZ: 9.0, // Low Density Residential - 2 storeys / 9m
  MUZ: 13.5, // Mixed Use - 4 storeys / 13.5m
  TRZ: 11.0, // Township - 3 storeys / 11m
  TZ: 11.0, // Township Zone

  // Commercial Zones
  C1Z: 14.0, // Commercial 1 - 4 storeys / 14m
  C2Z: 14.0, // Commercial 2 - 4 storeys / 14m
  CCZ: 16.0, // Capital City - higher density
  IN1Z: 15.0, // Industrial 1 - 15m
  IN3Z: 12.0, // Industrial 3 - 12m

  // Special Zones
  PUZ: 10.0, // Public Use - varies, default 10m
  PPRZ: 8.0, // Public Park - typically low-rise
};

/**
 * Parse overlay codes for height modifiers.
 * DDO (Design and Development Overlay) schedules often specify mandatory heights.
 */
function parseOverlayHeight(overlayCode: string): number | null {
  const upper = overlayCode.toUpperCase();

  // DDO with numeric suffix (e.g., DDO15 might mean 15m)
  if (upper.startsWith('DDO')) {
    const match = upper.match(/DDO(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 5 && num <= 30) return num;
    }
  }

  // BFO (Built Form Overlay)
  if (upper.startsWith('BFO')) {
    const match = upper.match(/BFO(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 5 && num <= 30) return num;
    }
  }

  return null;
}

/**
 * Calculate statutory building height for a Victorian property.
 *
 * PRIORITY ORDER:
 * 1. Overlay height limits (DDO, BFO) - most restrictive
 * 2. Zone-based height (GRZ, NRZ, C1Z, etc.)
 * 3. Fallback default (9m / 2 storeys)
 */
export function calculateStatutoryHeight(
  zoneCode: string | null,
  overlayCodes: string[] = [],
): HeightCalculationResult {
  // PRIORITY 1: Overlay height limits
  for (const overlay of overlayCodes) {
    const overlayHeight = parseOverlayHeight(overlay);
    if (overlayHeight !== null) {
      return {
        heightMeters: overlayHeight,
        source: 'overlay',
        description: `${overlay} height limit`,
      };
    }
  }

  // PRIORITY 2: Zone-based height
  if (zoneCode) {
    const baseZone = zoneCode.replace(/\d+$/, '');
    const zoneHeight = STATUTORY_HEIGHT_MATRIX[baseZone] || STATUTORY_HEIGHT_MATRIX[zoneCode];

    if (zoneHeight !== undefined) {
      return {
        heightMeters: zoneHeight,
        source: 'zone',
        description: `${zoneCode} statutory height`,
      };
    }
  }

  // PRIORITY 3: Fallback default
  return {
    heightMeters: 9.0,
    source: 'fallback',
    description: 'Default ResCode height (2 storeys)',
  };
}

/**
 * Create Mapbox fill-extrusion layer for 3D building massing.
 *
 * VISUAL DESIGN:
 * - Translucent cyan (#00E5FF) with 40% opacity
 * - Premium futuristic aesthetic
 * - Smooth vertical gradient
 */
export function create3DMassingLayer(
  sourceId: string,
  heightMeters: number,
): FillExtrusionLayer {
  return {
    id: `${sourceId}-3d-massing`,
    type: 'fill-extrusion',
    source: sourceId,
    paint: {
      'fill-extrusion-height': heightMeters,
      'fill-extrusion-base': 0,
      'fill-extrusion-color': '#00E5FF',
      'fill-extrusion-opacity': 0.4,
      'fill-extrusion-vertical-gradient': true,
    },
  };
}

/**
 * Generate camera animation config for smooth 3D flyover.
 *
 * Animates from 2D top-down to 60-degree angled 3D perspective.
 */
export function create3DCameraAnimation(
  center: [number, number],
  zoom: number = 18,
): {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  duration: number;
  essential: boolean;
} {
  return {
    center,
    zoom,
    pitch: 60, // 60-degree angled view
    bearing: 45, // 45-degree rotation
    duration: 1500, // 1.5 second animation
    essential: true,
  };
}

/**
 * Validate if browser supports Mapbox 3D features.
 */
export function supports3DExtrusion(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
}
