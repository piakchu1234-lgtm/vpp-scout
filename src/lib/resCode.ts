/**
 * ResCode Intelligence Layer — pure-function evaluation of the four
 * Victorian ResCode standards that bind a Small Second Dwelling proposal
 * at the lot scale. Each check returns a status, a numeric basis, and
 * bilingual text so the UI can render a Compliance Checklist without
 * branching on language.
 *
 * Standards referenced (Clause 54 — single dwelling on a lot):
 *   A5  Site Coverage           ≤ 60% of site area
 *   A6  Permeability            ≥ 20% of site area pervious
 *   A10 Side & Rear Setbacks    1 m minimum to walls ≤ 3.6 m height
 *   A17 Private Open Space      ≥ 80 m² with one part ≥ 25 m² (5 m min dim.)
 *
 * The default new-dwelling footprint is 60 m² — the SSD reform's exempt
 * envelope. Pave/driveway area is unknown at this point in the workflow,
 * so permeability is computed on the building-only basis with a warning
 * that paving has not been included.
 */

import area from '@turf/area';

import type { ParcelPolygon } from './vicPlanApi';

export type ResCodeStatus = 'pass' | 'fail' | 'warn';

export type ResCodeCheck = {
  id: 'coverage' | 'permeability' | 'pos' | 'setback' | 'wallsOnBoundary';
  clause: string;
  label: { en: string; zh: string };
  status: ResCodeStatus;
  detail: { en: string; zh: string };
};

export type ResCodeInput = {
  lotSizeM2: number;
  /** Footprint of the proposed SSD in m². Defaults to the 60 m² SSD cap. */
  newDwellingFootprintM2?: number;
  /** Parcel polygon — used to filter Vicmap building footprints by centroid. */
  parcel: ParcelPolygon | null;
  /** Vicmap building polygons in the surrounding bbox. */
  buildings: ParcelPolygon[];
  /** Non-null when a 1 m setback envelope has been computed for the parcel. */
  envelope: ParcelPolygon | null;
  /** Length of the proposed wall sitting on or within 200 mm of a boundary (m). */
  wallOnBoundaryM?: number;
  /** Vicmap zone code (GRZ, NRZ, RGZ, …). VC282 (2026) lifts the
   *  Site Coverage A5 threshold from 60% to 65% in GRZ — caller passes the
   *  zone so the gate threshold tracks the schedule. */
  zoneCode?: string | null;
};

const COVERAGE_MAX_PCT_DEFAULT = 60;
// VC282 (2026) — General Residential Zone schedules raise the
// Standard A5 site-coverage cap to 65%. Other zones (NRZ, RGZ) retain 60%
// at the time of writing; widen this map as state schedules amend.
const COVERAGE_MAX_PCT_BY_ZONE: Record<string, number> = {
  GRZ: 65,
};
const PERMEABILITY_MIN_PCT = 20;
const POS_MIN_M2 = 80;
const SSD_DEFAULT_FOOTPRINT_M2 = 60;

/**
 * Standard ray-cast point-in-polygon (outer ring only). Adequate for
 * cadastral parcels where holes are rare and the building centroid is
 * either clearly inside or clearly outside the lot.
 */
function pointInRing(point: [number, number], ring: number[][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function ringCentroid(ring: number[][]): [number, number] {
  if (ring.length === 0) return [0, 0];
  const closed =
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring
      : [...ring, ring[0]];
  let cx = 0;
  let cy = 0;
  let signed = 0;
  for (let i = 0; i < closed.length - 1; i++) {
    const [x0, y0] = closed[i];
    const [x1, y1] = closed[i + 1];
    const cross = x0 * y1 - x1 * y0;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
    signed += cross;
  }
  if (signed === 0) return [closed[0][0], closed[0][1]];
  return [cx / (3 * signed), cy / (3 * signed)];
}

/**
 * Sum the areas of building footprints whose centroid lies inside the parcel.
 * Returns 0 if the parcel polygon is missing — caller should treat that as
 * "existing footprint unknown" and downgrade the coverage check to a warning.
 */
export function existingFootprintM2(
  parcel: ParcelPolygon | null,
  buildings: ParcelPolygon[],
): number {
  if (!parcel || parcel.coordinates.length === 0) return 0;
  const outer = parcel.coordinates[0];
  let total = 0;
  for (const b of buildings) {
    if (b.coordinates.length === 0) continue;
    const c = ringCentroid(b.coordinates[0]);
    if (!pointInRing(c, outer)) continue;
    total += area({ type: 'Polygon', coordinates: b.coordinates });
  }
  return total;
}

function fmt(n: number): string {
  return n.toFixed(1);
}

function longestBoundaryM(parcel: ParcelPolygon | null): number {
  if (!parcel || parcel.coordinates.length === 0) return 0;
  const ring = parcel.coordinates[0];
  if (ring.length < 2) return 0;
  const midLat =
    ring.reduce((sum, p) => sum + p[1], 0) / ring.length;
  const mLat = 111320;
  const mLon = 111320 * Math.cos((midLat * Math.PI) / 180);
  let longest = 0;
  for (let i = 1; i < ring.length; i++) {
    const dx = (ring[i][0] - ring[i - 1][0]) * mLon;
    const dy = (ring[i][1] - ring[i - 1][1]) * mLat;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > longest) longest = len;
  }
  return longest;
}

export function evaluateResCode(input: ResCodeInput): ResCodeCheck[] {
  const {
    lotSizeM2,
    newDwellingFootprintM2 = SSD_DEFAULT_FOOTPRINT_M2,
    parcel,
    buildings,
    envelope,
    wallOnBoundaryM = 0,
    zoneCode = null,
  } = input;

  const zoneKey = zoneCode ? zoneCode.toUpperCase() : null;
  const COVERAGE_MAX_PCT: number =
    (zoneKey !== null && COVERAGE_MAX_PCT_BY_ZONE[zoneKey] !== undefined
      ? COVERAGE_MAX_PCT_BY_ZONE[zoneKey]
      : COVERAGE_MAX_PCT_DEFAULT);

  const existing = existingFootprintM2(parcel, buildings);
  const totalFootprint = existing + newDwellingFootprintM2;
  const coveragePct = lotSizeM2 > 0 ? (totalFootprint / lotSizeM2) * 100 : 0;
  const permPct = Math.max(0, 100 - coveragePct);
  const remainingYardM2 = Math.max(0, lotSizeM2 - totalFootprint);
  const parcelKnown = parcel !== null;

  const coverage: ResCodeCheck = {
    id: 'coverage',
    clause: 'Clause 54.03-3 · Standard A5',
    label: {
      en: `Site Coverage ≤ ${COVERAGE_MAX_PCT}%`,
      zh: `场地覆盖率 ≤ ${COVERAGE_MAX_PCT}%`,
    },
    status: !parcelKnown
      ? 'warn'
      : coveragePct > COVERAGE_MAX_PCT
        ? 'fail'
        : 'pass',
    detail: {
      en: parcelKnown
        ? `Existing footprint ${fmt(existing)} m² + ${newDwellingFootprintM2} m² SSD = ${fmt(
            totalFootprint,
          )} m² (${fmt(coveragePct)}% of ${lotSizeM2} m²). Limit ${COVERAGE_MAX_PCT}%.`
        : `Parcel boundary unavailable — coverage cannot be computed. Verify on title plan.`,
      zh: parcelKnown
        ? `现有建筑面积 ${fmt(existing)} m² + 小型第二住宅 ${newDwellingFootprintM2} m² = ${fmt(
            totalFootprint,
          )} m²(占 ${lotSizeM2} m² 的 ${fmt(coveragePct)}%)。上限 ${COVERAGE_MAX_PCT}%。`
        : `地块边界数据不可用 — 无法计算覆盖率。请以产权图核对。`,
    },
  };

  const permeability: ResCodeCheck = {
    id: 'permeability',
    clause: 'Clause 54.03-4 · Standard A6',
    label: {
      en: 'Permeability ≥ 20%',
      zh: '透水率 ≥ 20%',
    },
    status: !parcelKnown
      ? 'warn'
      : permPct < PERMEABILITY_MIN_PCT
        ? 'fail'
        : 'warn',
    detail: {
      en: parcelKnown
        ? `Pervious balance ≈ ${fmt(permPct)}% on building-only basis. Driveway, paths and paving are not yet counted — confirm true pervious area at design stage. Minimum ${PERMEABILITY_MIN_PCT}%.`
        : `Parcel boundary unavailable — permeability cannot be computed.`,
      zh: parcelKnown
        ? `仅按建筑覆盖估算的透水比例约 ${fmt(permPct)}%。车道、铺装等尚未计入,需在设计阶段核实实际透水面积。最低 ${PERMEABILITY_MIN_PCT}%。`
        : `地块边界数据不可用 — 无法计算透水率。`,
    },
  };

  const pos: ResCodeCheck = {
    id: 'pos',
    clause: 'Clause 54.05-4 · Standard A17',
    label: {
      en: `Private Open Space ≥ ${POS_MIN_M2} m²`,
      zh: `私人户外空间 ≥ ${POS_MIN_M2} m²`,
    },
    status: !parcelKnown
      ? 'warn'
      : remainingYardM2 < POS_MIN_M2
        ? 'fail'
        : 'pass',
    detail: {
      en: parcelKnown
        ? `Yard remaining after combined footprint: ${fmt(remainingYardM2)} m². Minimum ${POS_MIN_M2} m² with one part ≥ 25 m² and 5 m minimum dimension — verify shape, not just total. Architect's note: please verify that the remaining yard includes a 25 m² area with a minimum dimension of 3 m (Standard A17).`
        : `Parcel boundary unavailable — yard area cannot be computed.`,
      zh: parcelKnown
        ? `扣除全部建筑后剩余庭院:${fmt(remainingYardM2)} m²。最低 ${POS_MIN_M2} m²,其中一处需 ≥ 25 m² 且最短边 5 m — 形状须另行核对,非仅总面积。建筑师备注:请核实剩余院落是否包含一个最小尺寸为 3 米的 25 平方米区域(标准 A17)。`
        : `地块边界数据不可用 — 无法计算庭院面积。`,
    },
  };

  const setback: ResCodeCheck = {
    id: 'setback',
    clause: 'Clause 54.04-1 · Standard A10',
    label: {
      en: '1 m Side & Rear Setback Envelope',
      zh: '侧界与后界 1 m 退界',
    },
    status: envelope ? 'pass' : 'warn',
    detail: {
      en: envelope
        ? `1 m minimum setback applied as the buildable envelope (walls ≤ 3.6 m height). Greater setbacks may be required for taller walls or under an overlay schedule.`
        : `Buildable envelope not yet derived — typically requires the parcel polygon. Apply 1 m default and refine against any overlay schedule.`,
      zh: envelope
        ? `已按可建造范围套用 1 m 最小退界(墙高 ≤ 3.6 m)。墙体更高或受覆盖区附表约束时,可能需更大退界。`
        : `尚未生成可建造范围 — 一般需先取得地块边界。先按 1 m 默认值,再按覆盖区附表细化。`,
    },
  };

  const boundaryM = longestBoundaryM(parcel);
  const remainingBoundaryM = Math.max(0, boundaryM - wallOnBoundaryM);
  const allowedWallM = 10 + 0.25 * remainingBoundaryM;
  let wallStatus: ResCodeStatus;
  if (!parcelKnown) {
    wallStatus = 'warn';
  } else if (wallOnBoundaryM <= 0) {
    wallStatus = 'warn';
  } else if (wallOnBoundaryM > allowedWallM) {
    wallStatus = 'fail';
  } else {
    wallStatus = 'pass';
  }

  const walls: ResCodeCheck = {
    id: 'wallsOnBoundary',
    clause: 'Clause 54.04-2 · Standard A11',
    label: {
      en: 'Walls on Boundaries',
      zh: '侧界墙体',
    },
    detail: {
      en: !parcelKnown
        ? `Parcel boundary unavailable — A11 cannot be evaluated against actual boundary length.`
        : wallOnBoundaryM <= 0
          ? `No wall-on-boundary length entered. Standard A11 caps the wall length on or within 200 mm of a boundary at 10 m + 25% of the remaining boundary. Longest boundary detected: ${fmt(boundaryM)} m.`
          : `Proposed wall on boundary ${fmt(wallOnBoundaryM)} m vs allowed ${fmt(allowedWallM)} m (10 m + 25% of remaining ${fmt(remainingBoundaryM)} m on a ${fmt(boundaryM)} m boundary).`,
      zh: !parcelKnown
        ? `地块边界数据不可用 — 无法以实际边界长度评估 A11。`
        : wallOnBoundaryM <= 0
          ? `尚未输入侧界墙体长度。标准 A11 规定:位于边界或距边界 200 mm 以内的墙体长度上限为 10 m + 剩余边界长度的 25%。检测到的最长边界:${fmt(boundaryM)} m。`
          : `拟建侧界墙体 ${fmt(wallOnBoundaryM)} m,上限 ${fmt(allowedWallM)} m(10 m + 剩余边界 ${fmt(remainingBoundaryM)} m × 25%,边界全长 ${fmt(boundaryM)} m)。`,
    },
    status: wallStatus,
  };

  return [coverage, permeability, pos, setback, walls];
}

export type ResCodeVerdict = {
  status: 'compliant' | 'refinement';
  label: { en: string; zh: string };
};

/**
 * Master verdict — PROVISIONALLY COMPLIANT only if every critical check
 * (Site Coverage A5, Permeability A6, Setback A10) reaches `pass`. A11
 * and A17 inform the architect but do not gate the headline verdict at
 * this concept stage. Any fail or warn on the gated three downgrades to
 * REFINEMENT REQUIRED.
 */
export function deriveVerdict(checks: ResCodeCheck[]): ResCodeVerdict {
  const gated = checks.filter(
    (c) => c.id === 'coverage' || c.id === 'permeability' || c.id === 'setback',
  );
  const allPass = gated.length > 0 && gated.every((c) => c.status === 'pass');
  return allPass
    ? {
        status: 'compliant',
        label: {
          en: 'Provisionally Compliant',
          zh: '初步合规',
        },
      }
    : {
        status: 'refinement',
        label: {
          en: 'Refinement Required',
          zh: '需进一步细化',
        },
      };
}
