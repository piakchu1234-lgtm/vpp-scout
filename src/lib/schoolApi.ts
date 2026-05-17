/**
 * School proximity helper — mirrors the Victorian "Find My School"
 * (findmyschool.vic.gov.au) pattern by returning the three closest
 * government primary and secondary schools by straight-line distance.
 *
 * Live mode is not wired in this build — the public Find My School
 * tile/feature service requires a per-session token, so we emit a
 * deterministic seeded result keyed on the request coordinates so
 * the same address always renders the same nearest-schools list
 * during demos. Replace `fetchNearestSchools` with the live endpoint
 * once a key is available; the return shape is intentionally the
 * minimum surface a UI card needs.
 */

export type School = {
  name: string;
  distanceM: number;
  sector: 'Government' | 'Catholic' | 'Independent';
};

export type NearestSchools = {
  primary: School[];
  secondary: School[];
  isDemoData: boolean;
};

// A small curated pool of real Victorian schools. The picker selects
// three primary and three secondary deterministically from the seed,
// so the rendering is stable per-address and avoids inventing names.
const PRIMARY_POOL: string[] = [
  'Noble Park Primary School',
  'Wallarano Primary School',
  'Heatherhill Primary School',
  'Coomoora Primary School',
  'Athol Road Primary School',
  'Springvale Rise Primary School',
  'Harrisfield Primary School',
  'Yarraman Oaks Primary School',
  'Killester College Primary',
  'Brentwood Primary School',
  'Lyndale Greens Primary School',
  'Silverton Primary School',
  'Carwatha College P-9',
  'Spring Parks Primary School',
  'Wedge Park Primary School',
];

const SECONDARY_POOL: string[] = [
  'Noble Park Secondary College',
  'Keysborough Secondary College',
  'Lyndale Secondary College',
  'Springvale Secondary College',
  'Killester College',
  'Haileybury College',
  'Wellington Secondary College',
  'Dandenong High School',
  'Cleeland Secondary College',
  'Westall Secondary College',
  'Mount Waverley Secondary College',
];

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded(seed: number) {
  let s = seed || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 1 | s);
    s ^= s + Math.imul(s ^ (s >>> 7), 61 | s);
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}

function pickThree(
  pool: string[],
  rand: () => number,
  baseDistanceM: number,
): School[] {
  const indices = new Set<number>();
  while (indices.size < 3) {
    indices.add(Math.floor(rand() * pool.length));
  }
  const picks = Array.from(indices);
  const schools: School[] = picks.map((i, idx) => ({
    name: pool[i],
    distanceM: Math.round(baseDistanceM + idx * (180 + rand() * 220) + rand() * 80),
    sector: 'Government' as const,
  }));
  return schools.sort((a, b) => a.distanceM - b.distanceM);
}

export async function fetchNearestSchools(
  lat: number,
  lon: number,
): Promise<NearestSchools> {
  const rand = seeded(hash(`${lat.toFixed(4)},${lon.toFixed(4)}`));
  const primary = pickThree(PRIMARY_POOL, rand, 320 + Math.floor(rand() * 220));
  const secondary = pickThree(
    SECONDARY_POOL,
    rand,
    520 + Math.floor(rand() * 380),
  );
  return { primary, secondary, isDemoData: true };
}
