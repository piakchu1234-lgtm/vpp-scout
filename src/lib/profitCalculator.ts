/**
 * Develop-and-sell profit / ROI model for Victorian townhouse projects.
 *
 * Indicative only — every figure surfaced here is a planner-side
 * sanity check, not a substitute for a quantity surveyor's cost plan
 * or a registered valuer's comparable-sales appraisal. The sliders in
 * the Profit & ROI tab let users override every default.
 *
 * Model:
 *
 *   GRV  = dwellings × salePricePerUnit
 *   TDC  = sitePurchaseCost + (dwellings × constructionCostPerUnit) × (1 + softCostFraction)
 *   Net  = GRV − TDC
 *   ROI% = Net / TDC × 100
 *
 * Soft costs (design, council fees, planning permits, finance, sales
 * commission) sit at a 15% industry rule-of-thumb default. GST and
 * margin scheme treatment are deliberately out of scope at this tier —
 * a developer's tax adviser owns those calculations.
 */

export type ProfitInput = {
  dwellings: number;
  constructionCostPerUnit: number;
  salePricePerUnit: number;
  sitePurchaseCost: number;
  /** Soft costs as a fraction of total construction (default 0.15). */
  softCostFraction: number;
};

export type ProfitMetrics = {
  /** Gross Realization Value — total sale proceeds across all units. */
  grossRealizationValue: number;
  /** Total Development Cost — site + construction + soft costs. */
  totalDevelopmentCost: number;
  /** Soft costs component of TDC (broken out for the ledger view). */
  softCostsTotal: number;
  /** Net profit before tax (GRV − TDC). */
  netProfit: number;
  /** Project ROI as a percentage. Null if TDC is zero. */
  roiPct: number | null;
};

export const PROFIT_DEFAULTS = {
  /** Per-dwelling fixed-price construction baseline (2026 Victorian
   * townhouse, typical 150–180 m² × $2.5–3k/m² ≈ $375–540k). */
  constructionCostPerUnit: 450_000,
  /** Soft costs as a fraction of construction — industry 12–18% band. */
  softCostFraction: 0.15,
  /** Site purchase fallback when no Domain/VG figure is available. */
  sitePurchaseCost: 1_200_000,
} as const;

/**
 * LGA-aware default resale baselines.
 *
 * NOTE on Greater Dandenong $950k: this is at the very top of the
 * current submarket band. Realistic 2026 medians for new-build 3BR
 * townhouses in Noble Park / Springvale / Dandenong North sit closer
 * to $720–820k (CoreLogic / Domain). The slider in the UI lets users
 * override; the default here reflects the spec the product owner
 * provided rather than the conservative midpoint. Stonnington $1.65M
 * and the $1.1M state-wide fallback are defensible.
 */
export function defaultSalePriceForLga(
  lgaName: string | null | undefined,
): number {
  if (!lgaName) return 1_100_000;
  const upper = lgaName.toUpperCase();
  if (upper.includes('STONNINGTON')) return 1_650_000;
  if (upper.includes('DANDENONG')) return 950_000;
  return 1_100_000;
}

export function computeProfitMetrics(input: ProfitInput): ProfitMetrics {
  const dwellings = Math.max(0, input.dwellings);
  const construction = dwellings * Math.max(0, input.constructionCostPerUnit);
  const softCosts = construction * Math.max(0, input.softCostFraction);
  const tdc = Math.max(0, input.sitePurchaseCost) + construction + softCosts;
  const grv = dwellings * Math.max(0, input.salePricePerUnit);
  const netProfit = grv - tdc;
  const roiPct = tdc > 0 ? (netProfit / tdc) * 100 : null;

  return {
    grossRealizationValue: grv,
    totalDevelopmentCost: tdc,
    softCostsTotal: softCosts,
    netProfit,
    roiPct,
  };
}
