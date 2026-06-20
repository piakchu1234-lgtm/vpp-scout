/**
 * Project Persistence Utility
 *
 * Helper functions for saving and loading project state
 */

import type { MassingResult } from './massingEngine';
import type { FinancialAnalysis } from './massingEngine';

export interface ProjectState {
  // Property identifiers
  address: string;
  pfi?: string;

  // Planning data
  zoneCode: string;
  zoneDescription?: string;
  lotArea: number;
  overlays: string[];

  // Coordinates
  coordinates: {
    lat: number;
    lng: number;
  };

  // Market data
  estimatedValue?: number;
  marketDataSource?: 'domain' | 'agent' | 'manual';

  // Financial analysis
  roiData: {
    constructionCost: number;
    costPerSqm: number;
    endValue?: number;
    profit?: number;
    roi?: number;
    floorArea: number;
    isViable: boolean;
  };

  // 3D Massing geometry
  massingGeometry?: any; // GeoJSON Polygon
  floorArea?: number;
  buildingHeight?: number;

  // Map state
  mapState: {
    center: [number, number]; // [lng, lat]
    zoom: number;
    bearing: number;
    pitch: number;
  };

  // Metadata
  projectName?: string;
  notes?: string;
  tags?: string[];

  // PDF snapshot
  mapSnapshot?: string; // Base64 data URL
}

export interface SavedProjectData extends ProjectState {
  id: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Prepare current state for saving
 */
export function prepareProjectState(params: {
  address: string;
  pfi?: string;
  zoneCode: string;
  zoneDescription?: string;
  lotArea: number;
  overlays: string[];
  lat: number;
  lng: number;
  estimatedValue?: number;
  marketDataSource?: string;
  generatedMassing?: MassingResult | null;
  financialAnalysis?: FinancialAnalysis | null;
  mapCenter: [number, number];
  mapZoom: number;
  mapBearing: number;
  mapPitch: number;
  mapSnapshot?: string;
  projectName?: string;
  notes?: string;
  tags?: string[];
}): ProjectState {
  const {
    address,
    pfi,
    zoneCode,
    zoneDescription,
    lotArea,
    overlays,
    lat,
    lng,
    estimatedValue,
    marketDataSource,
    generatedMassing,
    financialAnalysis,
    mapCenter,
    mapZoom,
    mapBearing,
    mapPitch,
    mapSnapshot,
    projectName,
    notes,
    tags,
  } = params;

  // Extract financial data
  const roiData = {
    constructionCost: financialAnalysis?.constructionCost || 0,
    costPerSqm: financialAnalysis?.costPerSqm || 2500,
    endValue: financialAnalysis?.endValue,
    profit: financialAnalysis?.profit,
    roi: financialAnalysis?.roi,
    floorArea: generatedMassing?.floorArea || 0,
    isViable: financialAnalysis?.isViable || false,
  };

  return {
    address,
    pfi,
    zoneCode,
    zoneDescription,
    lotArea,
    overlays,
    coordinates: { lat, lng },
    estimatedValue,
    marketDataSource: marketDataSource as any,
    roiData,
    massingGeometry: generatedMassing?.envelope,
    floorArea: generatedMassing?.floorArea,
    buildingHeight: generatedMassing?.height,
    mapState: {
      center: mapCenter,
      zoom: mapZoom,
      bearing: mapBearing,
      pitch: mapPitch,
    },
    projectName,
    notes,
    tags,
    mapSnapshot,
  };
}

/**
 * Validate project state before saving
 */
export function validateProjectState(state: ProjectState): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!state.address || state.address.trim().length === 0) {
    errors.push('Address is required');
  }

  if (!state.zoneCode || state.zoneCode.trim().length === 0) {
    errors.push('Zone code is required');
  }

  if (!state.lotArea || state.lotArea <= 0) {
    errors.push('Lot area must be greater than 0');
  }

  if (!state.coordinates || !state.coordinates.lat || !state.coordinates.lng) {
    errors.push('Coordinates are required');
  }

  if (!state.mapState || !state.mapState.center || !state.mapState.zoom) {
    errors.push('Map state is required');
  }

  if (!state.roiData) {
    errors.push('ROI data is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format project for display
 */
export function formatProjectForDisplay(project: SavedProjectData): {
  title: string;
  subtitle: string;
  summary: string;
  viability: 'high' | 'medium' | 'low';
} {
  const title = project.projectName || project.address;
  const subtitle = `${project.zoneCode} • ${project.lotArea.toFixed(0)}m²`;

  const roi = project.roiData.roi;
  let viability: 'high' | 'medium' | 'low' = 'low';
  if (roi !== undefined) {
    if (roi >= 20) viability = 'high';
    else if (roi >= 10) viability = 'medium';
  }

  const roiText = roi !== undefined ? `ROI: ${roi.toFixed(1)}%` : 'ROI: N/A';
  const profitText =
    project.roiData.profit !== undefined
      ? `Profit: $${(project.roiData.profit / 1000).toFixed(0)}k`
      : '';

  const summary = `${roiText}${profitText ? ' • ' + profitText : ''}`;

  return {
    title,
    subtitle,
    summary,
    viability,
  };
}

/**
 * Generate default project name
 */
export function generateProjectName(address: string, zoneCode: string): string {
  const date = new Date().toLocaleDateString('en-AU', {
    month: 'short',
    day: 'numeric',
  });
  const shortAddress = address.split(',')[0]; // Just street address
  return `${shortAddress} ${zoneCode} - ${date}`;
}
