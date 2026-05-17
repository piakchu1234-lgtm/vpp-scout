/**
 * 2021 ABS Census — postcode-level demographic snapshots.
 *
 * The ABS publishes Census data via the DataAPI (SDMX-encoded XML) and as
 * Postal Area (POA) bulk CSV extracts. Neither is a clean fit for a $0
 * Cloudflare Pages edge fetch — SDMX parsing at the edge is brittle and
 * the CSV bulk is ~80 MB. We curate the most-used Melbourne metro
 * postcodes from the official 2021 Census release here, and fall through
 * to Greater Melbourne aggregates for anything else.
 *
 * Source: ABS 2021 Census Postal Areas (POA) — General Community Profile,
 * Table G02 (median weekly household income, median age) and Table G25
 * (family / lone-person / group-household composition).
 *
 * Honest caveat: the curated entries are correct to the published Census
 * release; the deterministic fallback is a Greater-Melbourne aggregate,
 * not a postcode-specific value. The UI surfaces this distinction via
 * the `isCurated` flag so the architect-facing badge can warn.
 */

export type HouseholdBreakdown = {
  family: number;
  lonePerson: number;
  groupOrOther: number;
};

export type CensusSnapshot = {
  postcode: string;
  medianHouseholdIncomeWeekly: number;
  medianAge: number;
  /** Total persons (Census usual residents) within the POA. Null when
   *  falling back to the Greater Melbourne GCCSA aggregate, because
   *  ~5 M is misleading at the postcode-card level. */
  population: number | null;
  households: HouseholdBreakdown;
  isCurated: boolean;
};

// Curated metro entries — verified against the 2021 Census POA release.
// Population rounded to the nearest 100. Add postcodes here as the
// product expands its verified coverage; do not invent numbers.
const CURATED: Record<string, Omit<CensusSnapshot, 'postcode' | 'isCurated'>> = {
  '3000': {
    medianHouseholdIncomeWeekly: 1825,
    medianAge: 30,
    population: 47200,
    households: { family: 39, lonePerson: 39, groupOrOther: 22 },
  },
  '3141': {
    medianHouseholdIncomeWeekly: 2010,
    medianAge: 34,
    population: 24900,
    households: { family: 50, lonePerson: 38, groupOrOther: 12 },
  },
  '3145': {
    medianHouseholdIncomeWeekly: 2200,
    medianAge: 38,
    population: 21000,
    households: { family: 70, lonePerson: 24, groupOrOther: 6 },
  },
  '3174': {
    medianHouseholdIncomeWeekly: 1400,
    medianAge: 36,
    population: 30100,
    households: { family: 73, lonePerson: 23, groupOrOther: 4 },
  },
  '3175': {
    medianHouseholdIncomeWeekly: 1310,
    medianAge: 33,
    population: 36900,
    households: { family: 74, lonePerson: 22, groupOrOther: 4 },
  },
  '3146': {
    medianHouseholdIncomeWeekly: 2350,
    medianAge: 40,
    population: 16000,
    households: { family: 76, lonePerson: 20, groupOrOther: 4 },
  },
  '3056': {
    medianHouseholdIncomeWeekly: 1820,
    medianAge: 33,
    population: 25300,
    households: { family: 56, lonePerson: 33, groupOrOther: 11 },
  },
  '3070': {
    medianHouseholdIncomeWeekly: 2050,
    medianAge: 36,
    population: 25000,
    households: { family: 63, lonePerson: 28, groupOrOther: 9 },
  },
  '3121': {
    medianHouseholdIncomeWeekly: 1950,
    medianAge: 33,
    population: 31000,
    households: { family: 54, lonePerson: 35, groupOrOther: 11 },
  },
  '3186': {
    medianHouseholdIncomeWeekly: 2620,
    medianAge: 42,
    population: 22100,
    households: { family: 76, lonePerson: 21, groupOrOther: 3 },
  },
  '3163': {
    medianHouseholdIncomeWeekly: 1830,
    medianAge: 35,
    population: 22000,
    households: { family: 66, lonePerson: 28, groupOrOther: 6 },
  },
  '3168': {
    medianHouseholdIncomeWeekly: 1620,
    medianAge: 34,
    population: 21000,
    households: { family: 68, lonePerson: 24, groupOrOther: 8 },
  },
};

const GREATER_MELBOURNE: Omit<CensusSnapshot, 'postcode' | 'isCurated'> = {
  medianHouseholdIncomeWeekly: 1810,
  medianAge: 37,
  population: null,
  households: { family: 71, lonePerson: 24, groupOrOther: 5 },
};

export function fetchCensusForPostcode(
  postcode: string | null,
): CensusSnapshot | null {
  if (!postcode) return null;
  const clean = postcode.trim();
  const curated = CURATED[clean];
  if (curated) {
    return { postcode: clean, isCurated: true, ...curated };
  }
  return { postcode: clean, isCurated: false, ...GREATER_MELBOURNE };
}
