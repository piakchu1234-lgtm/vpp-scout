/**
 * Save-to-Project portfolio — local-storage tracker for properties the
 * user has run through SimplySite. Pure functions; SSR-safe (the
 * `typeof window !== 'undefined'` guards keep the module importable
 * during Next.js server render without throwing).
 *
 * Capped at 20 entries — oldest pruned first when a 21st is saved —
 * to stay well under the 5 MB localStorage quota even if the user
 * loads 20 long-address records. The cap also bounds UI render cost.
 *
 * The record shape is intentionally load-bearing on `lon`/`lat`/`spi`:
 * restore re-runs the full applyVicPlan pipeline, which needs lon/lat
 * to fetch live planning data. SPI anchors the lot identity even if
 * the geocoded centroid drifts between sessions (Vicmap occasionally
 * reissues parcel centroids after revaluation).
 */

const STORAGE_KEY = 'simplysite.portfolio.v1';
const MAX_ENTRIES = 20;

export type SavedProperty = {
  id: string;
  address: string;
  /** Zone code at save time, e.g. "GRZ1" — null if VicPlan returned blank. */
  zone: string | null;
  /** Townhouse dwelling count snapshot at save time. */
  savedYield: number;
  /** Lot area in m² at save time. */
  lotSize: number;
  /** Longitude (codebase convention; not "lng"). */
  lon: number;
  lat: number;
  /** Standard Parcel Identifier — anchors lot identity. */
  spi: string | null;
  /** ISO timestamp when the record was saved. */
  savedAt: string;
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readAll(): SavedProperty[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive shape check — drop any entry that doesn't look like a
    // SavedProperty so a corrupted localStorage value can't crash the UI.
    return parsed.filter(
      (p): p is SavedProperty =>
        p &&
        typeof p === 'object' &&
        typeof p.id === 'string' &&
        typeof p.address === 'string' &&
        typeof p.lon === 'number' &&
        typeof p.lat === 'number' &&
        typeof p.savedAt === 'string',
    );
  } catch {
    return [];
  }
}

function writeAll(records: SavedProperty[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Quota exceeded or localStorage disabled (private browsing on some
    // platforms). Failing silently is preferable to crashing the page;
    // the in-memory UI state still reflects the user's intent.
  }
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older runtimes / SSR shadowing — a timestamp + random
  // suffix is sufficient for client-only IDs.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getSavedProperties(): SavedProperty[] {
  return readAll();
}

export function saveProperty(
  input: Omit<SavedProperty, 'id' | 'savedAt'>,
): SavedProperty {
  const record: SavedProperty = {
    ...input,
    id: makeId(),
    savedAt: new Date().toISOString(),
  };
  const existing = readAll();
  // Dedupe by SPI (preferred) or address — replace the older entry so
  // re-saving the same lot doesn't spawn duplicates.
  const dedupKey = (p: SavedProperty) =>
    (p.spi && p.spi.length > 0 ? `spi:${p.spi}` : `addr:${p.address.toLowerCase()}`);
  const newKey = dedupKey(record);
  const filtered = existing.filter((p) => dedupKey(p) !== newKey);
  // Newest first, then prune to MAX_ENTRIES.
  const next = [record, ...filtered].slice(0, MAX_ENTRIES);
  writeAll(next);
  return record;
}

export function deleteProperty(id: string): SavedProperty[] {
  const existing = readAll();
  const next = existing.filter((p) => p.id !== id);
  writeAll(next);
  return next;
}
