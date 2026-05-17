/**
 * Tree Protection Zone (TPZ) radius per AS 4970-2009, clause 3.2.
 *
 * TPZ radius (m) = DBH (mm) × 12 / 1000, clamped to [2, 15] m.
 */

export function tpzRadiusM(dbhMm: number): number {
  if (dbhMm <= 0) return 0;
  const raw = (dbhMm * 12) / 1000;
  return Math.min(15, Math.max(2, raw));
}
