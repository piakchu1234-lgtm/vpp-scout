/**
 * MAP CLICK-EVENT PIPELINE
 *
 * Intelligent spatial query system that captures click events, queries custom
 * Mapbox Studio vector layers, extracts zone codes and overlay data, and routes
 * to VPP compliance evaluation.
 *
 * Flow:
 * 1. User clicks map → queryRenderedFeatures() at click point
 * 2. Extract zone code from custom layer properties
 * 3. Normalize legacy zone codes (R1Z→GRZ, B1Z→C1Z, etc.)
 * 4. Route to compliance engine based on zone classification
 * 5. Trigger UI sidebars / feasibility calculations
 */

import type mapboxgl from 'mapbox-gl';
import { normalizeZoneCode } from './zoneNormalization';

/**
 * Properties extracted from clicked map features
 */
export type ClickedFeatureProperties = {
  zoneCode: string | null;
  overlays: string[];
  spi?: string; // Standard Parcel Identifier
  lotNumber?: string;
  planNumber?: string;
  councilName?: string;
  [key: string]: any; // Allow additional properties from your tileset
};

/**
 * Result of spatial click query
 */
export type MapClickResult = {
  success: boolean;
  properties: ClickedFeatureProperties | null;
  coordinates: [number, number];
  layerId?: string;
  error?: string;
};

/**
 * Query the map at a click point and extract zoning/overlay data
 *
 * @param map - Mapbox GL map instance
 * @param point - Click point {x, y} in screen coordinates
 * @param customLayerIds - Array of your custom layer IDs to query (e.g., ['your-zoning-layer', 'your-overlay-layer'])
 * @returns MapClickResult with extracted zone data
 */
export function queryMapAtClick(
  map: mapboxgl.Map,
  point: { x: number; y: number },
  customLayerIds: string[] = []
): MapClickResult {
  try {
    // Query all rendered features at the click point
    // If customLayerIds provided, filter to those layers
    const features = customLayerIds.length > 0
      ? map.queryRenderedFeatures(point, { layers: customLayerIds })
      : map.queryRenderedFeatures(point);

    if (!features || features.length === 0) {
      console.log('[MapClickPipeline] No features found at click point');
      return {
        success: false,
        properties: null,
        coordinates: [0, 0],
        error: 'No features at click location',
      };
    }

    // Take the first (top-most) feature
    const feature = features[0];
    const props = feature.properties || {};

    // Extract zone code - try common property names from Vicmap Planning
    const rawZoneCode =
      props.ZONE_CODE ||
      props.zone_code ||
      props.ZONE ||
      props.zone ||
      props.ZoneCode ||
      null;

    // Normalize zone code to handle legacy codes (R1Z→GRZ, B1Z→C1Z, etc.)
    const zoneCode = rawZoneCode ? normalizeZoneCode(rawZoneCode) : null;

    // Extract overlays - may be comma-separated string or array
    let overlays: string[] = [];
    if (props.OVERLAY) {
      overlays = typeof props.OVERLAY === 'string'
        ? props.OVERLAY.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [props.OVERLAY];
    } else if (props.overlay) {
      overlays = typeof props.overlay === 'string'
        ? props.overlay.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [props.overlay];
    }

    // Extract coordinates from feature geometry
    let coordinates: [number, number] = [0, 0];
    if (feature.geometry.type === 'Point') {
      coordinates = feature.geometry.coordinates as [number, number];
    } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
      // Use centroid approximation (first coordinate of first ring)
      const coords = feature.geometry.type === 'Polygon'
        ? feature.geometry.coordinates[0][0]
        : feature.geometry.coordinates[0][0][0];
      coordinates = coords as [number, number];
    }

    const result: MapClickResult = {
      success: true,
      properties: {
        zoneCode,
        overlays,
        spi: props.SPI || props.PARCEL_SPI || props.parcel_spi || undefined,
        lotNumber: props.LOT_NUMBER || props.lot_number || undefined,
        planNumber: props.PLAN_NUMBER || props.plan_number || undefined,
        councilName: props.LGA_NAME || props.COUNCIL_NAME || undefined,
        ...props, // Include all raw properties for debugging
      },
      coordinates,
      layerId: feature.layer?.id,
    };

    console.log('[MapClickPipeline] Feature extracted:', {
      zoneCode: result.properties?.zoneCode,
      overlays: result.properties?.overlays,
      layerId: result.layerId,
    });

    return result;
  } catch (error) {
    console.error('[MapClickPipeline] Query failed:', error);
    return {
      success: false,
      properties: null,
      coordinates: [0, 0],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * VPP COMPLIANCE ROUTER
 *
 * Routes zone codes to appropriate planning pathway evaluations
 * Implements Victorian Planning Provisions (VPP) hierarchy
 */
export type CompliancePathway =
  | 'ssd-eligible'           // Small Second Dwelling pathway
  | 'residential-standard'   // Standard residential (ResCode Clause 54/55)
  | 'residential-special'    // Special residential overlays
  | 'commercial'             // Commercial zones
  | 'industrial'             // Industrial zones
  | 'mixed-use'              // Mixed-use zones
  | 'special-use'            // Special use zones
  | 'rural'                  // Rural zones
  | 'public-land'            // Public land zones
  | 'unknown';               // Zone not recognized

export type ComplianceEvaluation = {
  pathway: CompliancePathway;
  zoneCode: string;
  zoneDescription: string;
  isSSDEligible: boolean;
  requiresPlanningPermit: boolean | 'unknown';
  overlayRisks: string[];
  recommendedAction: string;
};

/**
 * Evaluate planning compliance pathway based on zone code
 *
 * This is the core routing logic that determines which feasibility
 * calculations and UI panels to trigger.
 */
export function evaluatePlanningCompliance(
  zoneCode: string | null,
  overlays: string[] = []
): ComplianceEvaluation {
  if (!zoneCode) {
    return {
      pathway: 'unknown',
      zoneCode: 'UNKNOWN',
      zoneDescription: 'Zone code not available',
      isSSDEligible: false,
      requiresPlanningPermit: 'unknown',
      overlayRisks: [],
      recommendedAction: 'Zone data unavailable - manual assessment required',
    };
  }

  const code = zoneCode.toUpperCase();

  // HIGH-RISK OVERLAYS that block SSD or require complex approval
  const highRiskOverlays = overlays.filter(o =>
    ['HO', 'BMO', 'LSIO', 'FO', 'SBO', 'VPO', 'ESO1', 'ESO2'].some(risk =>
      o.toUpperCase().includes(risk)
    )
  );

  // RESIDENTIAL ZONES - GRZ, NRZ, RGZ (SSD-eligible zones)
  if (code.startsWith('GRZ')) {
    return {
      pathway: highRiskOverlays.length > 0 ? 'residential-special' : 'ssd-eligible',
      zoneCode: code,
      zoneDescription: 'General Residential Zone',
      isSSDEligible: highRiskOverlays.length === 0,
      requiresPlanningPermit: highRiskOverlays.length > 0 ? true : false,
      overlayRisks: highRiskOverlays,
      recommendedAction: highRiskOverlays.length > 0
        ? 'Special overlays detected - assess overlay schedules before proceeding'
        : 'Proceed to SSD feasibility checks (lot size, frontage, garden area)',
    };
  }

  if (code.startsWith('NRZ')) {
    return {
      pathway: highRiskOverlays.length > 0 ? 'residential-special' : 'ssd-eligible',
      zoneCode: code,
      zoneDescription: 'Neighbourhood Residential Zone',
      isSSDEligible: highRiskOverlays.length === 0,
      requiresPlanningPermit: highRiskOverlays.length > 0 ? true : false,
      overlayRisks: highRiskOverlays,
      recommendedAction: highRiskOverlays.length > 0
        ? 'Special overlays detected - assess overlay schedules before proceeding'
        : 'Proceed to SSD feasibility checks (lot size, frontage, garden area)',
    };
  }

  if (code.startsWith('RGZ')) {
    return {
      pathway: 'residential-standard',
      zoneCode: code,
      zoneDescription: 'Residential Growth Zone',
      isSSDEligible: false, // RGZ typically for multi-dwelling, not SSD
      requiresPlanningPermit: true,
      overlayRisks: highRiskOverlays,
      recommendedAction: 'Multi-dwelling development zone - assess against schedule requirements',
    };
  }

  // MIXED-USE ZONES
  if (code.startsWith('MUZ') || code.startsWith('C1Z') || code.startsWith('C2Z')) {
    return {
      pathway: 'mixed-use',
      zoneCode: code,
      zoneDescription: code.startsWith('MUZ') ? 'Mixed Use Zone' : 'Commercial Zone',
      isSSDEligible: false,
      requiresPlanningPermit: true,
      overlayRisks: highRiskOverlays,
      recommendedAction: 'Mixed-use development - assess commercial/residential mix ratios',
    };
  }

  // COMMERCIAL ZONES
  if (code.startsWith('C1Z') || code.startsWith('C2Z') || code.startsWith('CCZ')) {
    return {
      pathway: 'commercial',
      zoneCode: code,
      zoneDescription: 'Commercial Zone',
      isSSDEligible: false,
      requiresPlanningPermit: true,
      overlayRisks: highRiskOverlays,
      recommendedAction: 'Commercial zone - residential use may require planning permit',
    };
  }

  // INDUSTRIAL ZONES
  if (code.startsWith('INZ') || code.startsWith('IN1Z') || code.startsWith('IN2Z') || code.startsWith('IN3Z')) {
    return {
      pathway: 'industrial',
      zoneCode: code,
      zoneDescription: 'Industrial Zone',
      isSSDEligible: false,
      requiresPlanningPermit: true,
      overlayRisks: highRiskOverlays,
      recommendedAction: 'Industrial zone - residential use typically prohibited',
    };
  }

  // RURAL ZONES
  if (code.startsWith('RLZ') || code.startsWith('FZ') || code.startsWith('RAZ')) {
    return {
      pathway: 'rural',
      zoneCode: code,
      zoneDescription: 'Rural Zone',
      isSSDEligible: false,
      requiresPlanningPermit: true,
      overlayRisks: highRiskOverlays,
      recommendedAction: 'Rural zone - dwellings subject to minimum lot size and special conditions',
    };
  }

  // PUBLIC LAND ZONES
  if (code.startsWith('PPRZ') || code.startsWith('PUZ') || code.startsWith('PCRZ')) {
    return {
      pathway: 'public-land',
      zoneCode: code,
      zoneDescription: 'Public Land Zone',
      isSSDEligible: false,
      requiresPlanningPermit: true,
      overlayRisks: highRiskOverlays,
      recommendedAction: 'Public land - development typically restricted',
    };
  }

  // UNKNOWN ZONE
  return {
    pathway: 'unknown',
    zoneCode: code,
    zoneDescription: 'Zone classification not recognized',
    isSSDEligible: false,
    requiresPlanningPermit: 'unknown',
    overlayRisks: highRiskOverlays,
    recommendedAction: 'Manual zone assessment required - consult planning scheme',
  };
}

/**
 * Combined click handler that queries map and evaluates compliance
 *
 * Use this as the main entry point for map click events
 */
export function handleMapClick(
  map: mapboxgl.Map,
  point: { x: number; y: number },
  customLayerIds: string[] = []
): {
  clickResult: MapClickResult;
  compliance: ComplianceEvaluation | null;
} {
  const clickResult = queryMapAtClick(map, point, customLayerIds);

  if (!clickResult.success || !clickResult.properties) {
    return {
      clickResult,
      compliance: null,
    };
  }

  const compliance = evaluatePlanningCompliance(
    clickResult.properties.zoneCode,
    clickResult.properties.overlays
  );

  console.log('[MapClickPipeline] Compliance evaluation:', {
    pathway: compliance.pathway,
    isSSDEligible: compliance.isSSDEligible,
    requiresPlanningPermit: compliance.requiresPlanningPermit,
  });

  return {
    clickResult,
    compliance,
  };
}
