/**
 * Shared types for the bilingual feasibility-report pipeline.
 *
 * The client packages the current site metrics into a `ReportRequest`,
 * POSTs to `/api/report`, and renders the returned `FeasibilityReport`
 * side-by-side. Statutory English terms (ResCode, HO/BMO/FO/SBO/DDO,
 * zone codes like GRZ/NRZ, NCC 2026, Clause 54.x / 55.x) must remain
 * untranslated in both `en` and `zh` strings — see CLAUDE.md.
 */

export type BilingualString = {
  en: string;
  zh: string;
};

export type ReportSiteMetrics = {
  address: string;
  lat: number;
  lon: number;
  spi: string | null;
  council: string | null;
  zoneCode: string | null;
  zoneDescription: string | null;
  overlayCodes: string[];
  overlayRaw: string[];
  lotAreaM2: number | null;
  frontageM: number | null;
  siteCoveragePct: number | null;
  setbackFrontM: number | null;
  setbackSideMinM: number | null;
  setbackRearM: number | null;
};

export type ReportRequest = {
  metrics: ReportSiteMetrics;
};

export type FeasibilityReport = {
  verdict: BilingualString;
  summary: BilingualString;
  developmentCapacity: BilingualString;
  zoningAnalysis: BilingualString;
  rescodeConsiderations: BilingualString;
  risks: BilingualString;
  recommendation: BilingualString;
};

export type ReportResponse =
  | { ok: true; report: FeasibilityReport }
  | { ok: false; error: string };
