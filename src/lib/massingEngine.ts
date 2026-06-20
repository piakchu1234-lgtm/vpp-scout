/**
 * Generative 3D Massing Engine
 *
 * Automatically generates maximum allowable building envelopes based on:
 * - Property boundaries
 * - VPP statutory setbacks
 * - Zone-specific requirements
 * - SSD size limits (60m² max)
 *
 * Archistar parity: Automated envelope generation + 3D visualization
 */

import * as turf from '@turf/turf';
import type { Feature, Polygon } from 'geojson';
import type { ParcelPolygon } from '@/lib/vicPlanApi';

export interface SetbackRequirements {
  /** Front setback in meters */
  front: number;

  /** Side setback in meters (both sides) */
  side: number;

  /** Rear setback in meters */
  rear: number;

  /** Minimum garden area required (percentage of lot) */
  gardenPercentage: number;
}

export interface MassingResult {
  /** Generated building envelope polygon */
  envelope: Feature<Polygon>;

  /** Floor area in square meters */
  floorArea: number;

  /** Building height in meters */
  height: number;

  /** Whether envelope was scaled down to meet limits */
  wasScaled: boolean;

  /** Original envelope area before scaling */
  originalArea?: number;

  /** Setbacks applied */
  setbacks: SetbackRequirements;
}

export interface FinancialAnalysis {
  /** Construction cost estimate */
  constructionCost: number;

  /** Construction cost per sqm */
  costPerSqm: number;

  /** Estimated end value (from market data) */
  endValue?: number;

  /** Estimated profit */
  profit?: number;

  /** ROI percentage */
  roi?: number;

  /** Is financially viable? (ROI > threshold) */
  isViable: boolean;
}

/**
 * Get standard setback requirements for zone
 */
export function getStandardSetbacks(zoneCode: string): SetbackRequirements {
  const zonePrefix = zoneCode.replace(/\d+/g, '');

  // Standard setbacks for residential zones (VPP Clause 55/56)
  switch (zonePrefix) {
    case 'GRZ': // General Residential Zone
      return {
        front: 9.0, // Standard street setback
        side: 1.0, // Minimum side boundary
        rear: 5.0, // Rear boundary
        gardenPercentage: 25, // 25% of lot must be permeable
      };

    case 'NRZ': // Neighborhood Residential Zone
      return {
        front: 9.0,
        side: 1.5, // Slightly larger for character preservation
        rear: 6.0,
        gardenPercentage: 30,
      };

    case 'RGZ': // Residential Growth Zone
      return {
        front: 6.0, // Reduced for density
        side: 1.0,
        rear: 4.0,
        gardenPercentage: 20,
      };

    case 'MUZ': // Mixed Use Zone
      return {
        front: 3.0, // Minimal setback for street activation
        side: 0.0, // Zero lot line possible
        rear: 3.0,
        gardenPercentage: 10,
      };

    default:
      // Conservative defaults
      return {
        front: 9.0,
        side: 1.0,
        rear: 5.0,
        gardenPercentage: 25,
      };
  }
}

/**
 * Calculate building envelope using setback buffering
 *
 * @param parcelBoundary - Property boundary polygon
 * @param setbacks - Setback requirements
 * @param maxFloorArea - Maximum allowed floor area (e.g., 60m² for SSD)
 * @returns Generated building envelope
 */
export function generateBuildingEnvelope(
  parcelBoundary: ParcelPolygon,
  setbacks: SetbackRequirements,
  maxFloorArea: number = 60
): MassingResult | null {
  try {
    // Convert to Turf.js feature
    const parcelFeature: Feature<Polygon> = {
      type: 'Feature',
      geometry: parcelBoundary,
      properties: {},
    };

    // Calculate average setback (simplified approach)
    // In production, would apply different setbacks to each side
    const avgSetback = (setbacks.front + setbacks.side * 2 + setbacks.rear) / 4;

    // Apply negative buffer to create envelope
    // Negative value shrinks polygon inward by setback distance
    const buffered = turf.buffer(parcelFeature, -avgSetback / 1000, {
      units: 'kilometers',
    });

    if (!buffered || !buffered.geometry) {
      console.warn('[massingEngine] Buffer resulted in null geometry');
      return null;
    }

    // turf.buffer returns a Feature<Polygon | MultiPolygon>
    if (buffered.geometry.type !== 'Polygon') {
      console.warn('[massingEngine] Buffer resulted in non-Polygon geometry');
      return null;
    }

    const bufferFeature: Feature<Polygon> = buffered as Feature<Polygon>;

    // Calculate area of buffered envelope
    let envelopeArea = turf.area(bufferFeature);

    let wasScaled = false;
    let originalArea: number | undefined;
    let envelope = bufferFeature;

    // If envelope exceeds max floor area, scale it down
    if (envelopeArea > maxFloorArea) {
      originalArea = envelopeArea;
      wasScaled = true;

      // Calculate scale factor to achieve target area
      const scaleFactor = Math.sqrt(maxFloorArea / envelopeArea);

      // Get centroid for scaling origin
      const centroid = turf.centroid(bufferFeature);

      // Scale polygon down around centroid
      const scaled = turf.transformScale(bufferFeature, scaleFactor, {
        origin: centroid,
      });

      envelope = scaled;
      envelopeArea = turf.area(scaled);
    }

    // Standard single-story height for SSD
    const height = 5.0; // meters (typical 3m ceiling + roof)

    return {
      envelope,
      floorArea: envelopeArea,
      height,
      wasScaled,
      originalArea,
      setbacks,
    };
  } catch (error) {
    console.error('[massingEngine] Error generating envelope:', error);
    return null;
  }
}

/**
 * Calculate financial analysis for generated envelope
 *
 * @param floorArea - Building floor area in sqm
 * @param costPerSqm - Construction cost per square meter
 * @param estimatedEndValue - Estimated property value after construction
 * @param viabilityThreshold - Minimum ROI percentage for viability
 * @returns Financial analysis
 */
export function calculateFinancialAnalysis(
  floorArea: number,
  costPerSqm: number = 2500,
  estimatedEndValue?: number,
  viabilityThreshold: number = 15
): FinancialAnalysis {
  const constructionCost = floorArea * costPerSqm;

  let profit: number | undefined;
  let roi: number | undefined;
  let isViable = false;

  if (estimatedEndValue !== undefined) {
    profit = estimatedEndValue - constructionCost;
    roi = (profit / constructionCost) * 100;
    isViable = roi >= viabilityThreshold;
  }

  return {
    constructionCost,
    costPerSqm,
    endValue: estimatedEndValue,
    profit,
    roi,
    isViable,
  };
}

/**
 * Advanced envelope generation with garden area constraint
 *
 * Ensures garden area percentage requirement is met
 */
export function generateEnvelopeWithGardenConstraint(
  parcelBoundary: ParcelPolygon,
  setbacks: SetbackRequirements,
  maxFloorArea: number = 60
): MassingResult | null {
  const parcelFeature: Feature<Polygon> = {
    type: 'Feature',
    geometry: parcelBoundary,
    properties: {},
  };

  const parcelArea = turf.area(parcelFeature);
  const maxBuildingArea = parcelArea * (1 - setbacks.gardenPercentage / 100);

  // Use the more restrictive of the two limits
  const effectiveMaxArea = Math.min(maxFloorArea, maxBuildingArea);

  return generateBuildingEnvelope(parcelBoundary, setbacks, effectiveMaxArea);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format ROI percentage for display
 */
export function formatROI(roi: number): string {
  return `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`;
}
