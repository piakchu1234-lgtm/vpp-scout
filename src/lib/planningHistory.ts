/**
 * Mock planning-permit history feed.
 *
 * Seeds a deterministic set of realistic council application records
 * keyed on the parcel's lat/lon and the active LGA. Replaces the
 * council-portal scrape we would hit in production (each Victorian
 * council exposes its register via a different ePathway-style UI;
 * scraping is brittle and per-council, so the live integration is
 * sequenced after Phase 1).
 *
 * The shape mirrors what a normalised council-permit ingest would
 * surface: reference number, lodgement / decision dates, description,
 * status, and applicant. Everything below is fabricated — never
 * present it to a client as a verified history.
 */

export type PermitStatus =
  | 'Approved'
  | 'Under Review'
  | 'Refused'
  | 'Withdrawn'
  | 'Lapsed';

export type PlanningPermit = {
  reference: string;
  lodgedDate: string; // ISO yyyy-mm-dd
  decisionDate: string | null;
  status: PermitStatus;
  description: string;
  applicant: string;
  council: string | null;
};

export type PlanningHistory = {
  permits: PlanningPermit[];
  council: string | null;
  isDemoData: boolean;
};

const APPLICANT_POOL = [
  'Hawthorn Designs Pty Ltd',
  'Studio Linnet Architects',
  'Westbrook Development Group',
  'Pinnacle Property Holdings',
  'Owner-Builder Application',
  'Coastline Architects',
  'Greenview Construction Co',
  'Atlas Town Planning',
];

const DESCRIPTION_POOL: { desc: string; status: PermitStatus }[] = [
  {
    desc: 'Construction of two double-storey townhouses with associated car parking and landscaping',
    status: 'Approved',
  },
  {
    desc: 'Single dwelling extension — rear ground-floor addition and first-floor master bedroom',
    status: 'Approved',
  },
  {
    desc: 'Three-lot subdivision (PS) of existing residential allotment',
    status: 'Under Review',
  },
  {
    desc: 'Removal of one significant tree subject to VPO',
    status: 'Approved',
  },
  {
    desc: 'Demolition of existing dwelling and construction of four townhouses',
    status: 'Refused',
  },
  {
    desc: 'Construction of a Small Second Dwelling (SSD) under VC282 reforms',
    status: 'Approved',
  },
  {
    desc: 'Two double-storey dwellings on common lot with shared driveway',
    status: 'Withdrawn',
  },
  {
    desc: 'Variation of approved permit to amend setback and overlooking treatment',
    status: 'Approved',
  },
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

function councilPrefix(council: string | null): string {
  if (!council) return 'TP';
  const slug = council
    .replace(/CITY|SHIRE|COUNCIL/gi, '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase();
  return slug.slice(0, 3) || 'TP';
}

function shiftDate(baseYear: number, daysOffset: number): string {
  const d = new Date(Date.UTC(baseYear, 0, 1));
  d.setUTCDate(d.getUTCDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}

/**
 * Deterministic mock — returns the same five-ish records for the
 * same (lat, lon, council) tuple so the UI is stable across reloads.
 * Decision dates are omitted for "Under Review" rows.
 */
export async function fetchPlanningPermits(
  lat: number,
  lon: number,
  council: string | null = null,
): Promise<PlanningHistory> {
  const rand = seeded(
    hash(`${lat.toFixed(4)},${lon.toFixed(4)},${council ?? ''}`),
  );
  const prefix = councilPrefix(council);
  const baseYear = 2022 + Math.floor(rand() * 3); // 2022 – 2024

  const count = 3 + Math.floor(rand() * 3); // 3 – 5 records
  const permits: PlanningPermit[] = [];

  for (let i = 0; i < count; i++) {
    const tpl = DESCRIPTION_POOL[Math.floor(rand() * DESCRIPTION_POOL.length)];
    const lodgedOffset = Math.floor(rand() * 700); // within ~2 yrs
    const decisionLag = 60 + Math.floor(rand() * 180); // 60 – 240 days
    const refNum = 100 + Math.floor(rand() * 8999);

    const lodgedDate = shiftDate(baseYear, lodgedOffset);
    const decisionDate =
      tpl.status === 'Under Review'
        ? null
        : shiftDate(baseYear, lodgedOffset + decisionLag);

    permits.push({
      reference: `${prefix}/${baseYear}/${refNum}`,
      lodgedDate,
      decisionDate,
      status: tpl.status,
      description: tpl.desc,
      applicant: APPLICANT_POOL[Math.floor(rand() * APPLICANT_POOL.length)],
      council: council ?? null,
    });
  }

  // Sort newest first by lodgedDate descending.
  permits.sort((a, b) => (a.lodgedDate < b.lodgedDate ? 1 : -1));

  return {
    permits,
    council,
    isDemoData: true,
  };
}
