import type { ParcelPolygon } from '@/lib/vicPlanApi';

export type ParcelFeature = {
  type: 'Feature';
  properties: {
    source: 'mock';
    approxAreaM2: number;
  };
  geometry: ParcelPolygon;
};

const FRONTAGE_M = 19.36;
const DEPTH_M = 36.72;

const M_PER_DEG_LAT = 111_320;

export function getMockParcelPolygon(lat: number, lon: number): ParcelFeature {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const halfFrontageDeg = FRONTAGE_M / 2 / (M_PER_DEG_LAT * cosLat);
  const halfDepthDeg = DEPTH_M / 2 / M_PER_DEG_LAT;

  const west = lon - halfFrontageDeg;
  const east = lon + halfFrontageDeg;
  const south = lat - halfDepthDeg;
  const north = lat + halfDepthDeg;

  const ring: number[][] = [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ];

  return {
    type: 'Feature',
    properties: {
      source: 'mock',
      approxAreaM2: Math.round(FRONTAGE_M * DEPTH_M),
    },
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
  };
}
