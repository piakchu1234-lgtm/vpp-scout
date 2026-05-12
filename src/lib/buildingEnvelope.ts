/**
 * Building Envelope — compute the 1 m inset "buildable zone" polygon from a
 * parcel boundary using Turf.js negative buffer. ResCode side/rear setbacks
 * are typically 1 m for SSDs; this visualisation shows the architect the
 * maximum footprint available after applying those constraints.
 */

import { buffer } from '@turf/buffer';
import { area } from '@turf/area';
import type { Polygon, Feature } from 'geojson';

import type { ParcelPolygon } from './vicPlanApi';

export type EnvelopeResult = {
  /** The inset polygon (GeoJSON Polygon geometry), or null if the buffer
   *  operation failed (e.g. the parcel is too narrow and the 1 m inset
   *  collapses to nothing). */
  polygon: ParcelPolygon | null;
  /** Area of the envelope polygon in m², or 0 if the polygon is null. */
  areaM2: number;
};

/**
 * Compute a 1 m inset building envelope from the parcel boundary. Returns
 * the inset polygon and its area in m². If the parcel is too narrow (< 2 m
 * wide) and the buffer collapses, returns `{ polygon: null, areaM2: 0 }`.
 */
export function computeBuildingEnvelope(
  parcel: ParcelPolygon,
): EnvelopeResult {
  try {
    // Turf expects a Feature wrapper; the parcel geometry is already a Polygon.
    const feature: Feature<Polygon> = {
      type: 'Feature',
      properties: {},
      geometry: parcel,
    };

    // Negative buffer of 1 m (inset). Turf interprets the distance in the
    // units of the input CRS; our parcels are EPSG:4326 (degrees), so we
    // convert 1 m to degrees at Melbourne's latitude (~37.8°S) where
    // 1° longitude ≈ 88.8 km → 1 m ≈ 0.0000113°. This is approximate but
    // sufficient for visualisation at cadastral scales.
    const bufferDegrees = -1 / 88800;
    const buffered = buffer(feature, bufferDegrees, { units: 'degrees' });

    if (!buffered || buffered.geometry.type !== 'Polygon') {
      // Buffer collapsed (parcel too narrow) or returned a non-Polygon.
      return { polygon: null, areaM2: 0 };
    }

    const envelopePolygon = buffered.geometry as Polygon;
    // Turf area() returns m² when the input is in EPSG:4326.
    const areaM2 = area(buffered);

    return { polygon: envelopePolygon, areaM2: Math.round(areaM2) };
  } catch (e) {
    console.warn('[buildingEnvelope] buffer failed', e);
    return { polygon: null, areaM2: 0 };
  }
}
