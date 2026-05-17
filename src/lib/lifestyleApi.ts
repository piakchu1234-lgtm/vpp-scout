/**
 * Lifestyle & Safety helper — mirrors the RACV "Home insurance risk
 * by postcode" presentation pattern: a single ratio (e.g. "1 in 56
 * homes") representing the postcode's annual residential burglary
 * incidence as published in the Victorian Crime Statistics Agency
 * quarterly bulletin.
 *
 * Live mode is not wired here — the CSA dataset is published as
 * Excel, not a JSON endpoint, so we emit a deterministic seeded
 * value keyed on the postcode so the same suburb always renders
 * the same headline figure during demos.
 */

export type BurglaryStats = {
  postcode: string;
  ratioOneIn: number;
  category: 'Low' | 'Moderate' | 'Elevated' | 'High';
  isDemoData: boolean;
};

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

/**
 * Extract a 4-digit Australian postcode from a free-form address.
 * Returns null if no postcode is present in the string.
 */
export function extractPostcode(address: string): string | null {
  const m = address.match(/\b(3\d{3})\b/);
  return m ? m[1] : null;
}

function categorize(ratio: number): BurglaryStats['category'] {
  if (ratio >= 90) return 'Low';
  if (ratio >= 60) return 'Moderate';
  if (ratio >= 40) return 'Elevated';
  return 'High';
}

export function fetchBurglaryStats(postcode: string): BurglaryStats {
  const rand = seeded(hash(`pc:${postcode}`));
  // Distribution matches CSA-style quarterly figures: most Greater
  // Melbourne postcodes fall in the 40–110 band ("1 in N" homes).
  const ratioOneIn = Math.round(38 + rand() * 78);
  return {
    postcode,
    ratioOneIn,
    category: categorize(ratioOneIn),
    isDemoData: true,
  };
}
