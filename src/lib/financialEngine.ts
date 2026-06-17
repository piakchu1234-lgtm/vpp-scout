/**
 * Financial Proforma Engine
 *
 * Automated feasibility calculator for Victorian property development.
 * Calculates Total Development Cost (TDC), Gross Realization Value (GRV),
 * and Developer Profit Margin in real-time.
 *
 * Used by developers to instantly assess deal viability before acquisition.
 */

export type DevelopmentTypology =
  | 'Apartment'
  | 'Townhouse'
  | 'House'
  | 'Mixed-Use'
  | 'Commercial';

export type FinancialAssumptions = {
  /** Construction cost per sqm (varies by typology) */
  constructionCostPerSqm: number;
  /** Soft costs as percentage of construction (consultants, council, marketing) */
  softCostPercentage: number;
  /** End sale value per sqm of Net Sellable Area (NSA) */
  endSaleValuePerSqm: number;
  /** Stamp duty rate (Victorian rate ~5.5%) */
  stampDutyRate: number;
  /** Finance costs as percentage of TDC (holding costs, interest) */
  financeCostPercentage: number;
  /** Contingency as percentage of construction (risk buffer) */
  contingencyPercentage: number;
};

export type FeasibilityResult = {
  /** Land acquisition cost */
  landCost: number;
  /** Stamp duty on land purchase */
  stampDuty: number;
  /** Total construction cost (hard costs) */
  constructionCost: number;
  /** Soft costs (consultants, council fees, marketing) */
  softCosts: number;
  /** Contingency buffer */
  contingency: number;
  /** Finance costs (interest, holding costs) */
  financeCosts: number;
  /** Total Development Cost (all-in cost) */
  tdc: number;
  /** Gross Realization Value (total sale proceeds) */
  grv: number;
  /** Selling costs (agent fees, legal) */
  sellingCosts: number;
  /** Net Realization Value (GRV - selling costs) */
  nrv: number;
  /** Developer profit (NRV - TDC) */
  profit: number;
  /** Profit margin as percentage of TDC */
  profitMarginPercent: number;
  /** Return on Cost (profit / TDC) */
  returnOnCost: number;
};

/**
 * Victorian construction cost assumptions (2026 rates).
 * Source: Australian Construction Cost Index, Rawlinson's Construction Handbook.
 */
const CONSTRUCTION_COST_MATRIX: Record<DevelopmentTypology, number> = {
  Apartment: 3500, // $/sqm - Multi-residential with lift, basement car park
  Townhouse: 2500, // $/sqm - Double-storey, standard finishes
  House: 2200, // $/sqm - Single dwelling, standard finishes
  'Mixed-Use': 3800, // $/sqm - Ground retail + residential above
  Commercial: 3200, // $/sqm - Office/retail fitout
};

/**
 * Victorian end sale values (2026 market rates).
 * These are conservative estimates - adjust based on suburb premium.
 */
const END_SALE_VALUE_MATRIX: Record<DevelopmentTypology, number> = {
  Apartment: 10000, // $/sqm NSA - Inner/middle ring Melbourne
  Townhouse: 9000, // $/sqm NSA - Suburban premium townhouse
  House: 8500, // $/sqm NSA - New house & land package
  'Mixed-Use': 11000, // $/sqm NSA - Commercial + residential premium
  Commercial: 9500, // $/sqm NSA - Office/retail lease capitalization
};

/**
 * Default financial assumptions for Victorian developments.
 * Conservative rates suitable for feasibility screening.
 */
const DEFAULT_ASSUMPTIONS: FinancialAssumptions = {
  constructionCostPerSqm: 2500, // Will be overridden by typology matrix
  softCostPercentage: 0.15, // 15% - Consultants, council, marketing
  endSaleValuePerSqm: 10000, // Will be overridden by typology matrix
  stampDutyRate: 0.055, // 5.5% - Victorian stamp duty rate
  financeCostPercentage: 0.08, // 8% - Interest + holding costs
  contingencyPercentage: 0.05, // 5% - Construction risk buffer
};

/**
 * Calculate development feasibility for a Victorian property.
 *
 * METHODOLOGY:
 * 1. Land Costs: Acquisition price + stamp duty
 * 2. Hard Costs: Construction at typology-specific $/sqm rate
 * 3. Soft Costs: Consultants (architect, engineer, surveyor), council fees, marketing
 * 4. Finance Costs: Interest on debt + holding costs during construction
 * 5. Contingency: Risk buffer for cost overruns
 * 6. TDC: Sum of all above (Total Development Cost)
 * 7. GRV: End sale value at $/sqm NSA rate × total NSA
 * 8. NRV: GRV minus selling costs (agent fees, legal)
 * 9. Profit: NRV - TDC
 * 10. Margin: Profit / TDC as percentage
 *
 * @param landCost - Land acquisition cost (excluding stamp duty)
 * @param totalGFA - Gross Floor Area in sqm (total building footprint)
 * @param typology - Development type (Apartment, Townhouse, etc.)
 * @param customAssumptions - Optional overrides for default assumptions
 * @returns Complete feasibility breakdown with TDC, GRV, profit margin
 *
 * @example
 * ```ts
 * const result = calculateFeasibility(850000, 450, 'Townhouse');
 * console.log(`TDC: $${formatMoney(result.tdc)}`);
 * console.log(`Profit Margin: ${result.profitMarginPercent.toFixed(1)}%`);
 * ```
 */
export function calculateFeasibility(
  landCost: number,
  totalGFA: number,
  typology: DevelopmentTypology = 'Townhouse',
  customAssumptions?: Partial<FinancialAssumptions>,
): FeasibilityResult {
  // Merge custom assumptions with defaults
  const assumptions: FinancialAssumptions = {
    ...DEFAULT_ASSUMPTIONS,
    constructionCostPerSqm: CONSTRUCTION_COST_MATRIX[typology],
    endSaleValuePerSqm: END_SALE_VALUE_MATRIX[typology],
    ...customAssumptions,
  };

  // STEP 1: Land Costs
  const stampDuty = landCost * assumptions.stampDutyRate;

  // STEP 2: Hard Costs (Construction)
  const constructionCost = totalGFA * assumptions.constructionCostPerSqm;

  // STEP 3: Soft Costs
  const softCosts = constructionCost * assumptions.softCostPercentage;

  // STEP 4: Contingency
  const contingency = constructionCost * assumptions.contingencyPercentage;

  // STEP 5: Subtotal before finance
  const subtotal = landCost + stampDuty + constructionCost + softCosts + contingency;

  // STEP 6: Finance Costs (calculated on subtotal)
  const financeCosts = subtotal * assumptions.financeCostPercentage;

  // STEP 7: Total Development Cost (TDC)
  const tdc = subtotal + financeCosts;

  // STEP 8: Gross Realization Value (GRV)
  // Assume NSA (Net Sellable Area) is 90% of GFA (10% lost to common areas)
  const nsaRatio = 0.9;
  const nsa = totalGFA * nsaRatio;
  const grv = nsa * assumptions.endSaleValuePerSqm;

  // STEP 9: Selling Costs (agent fees 2%, legal 0.5%)
  const sellingCosts = grv * 0.025;

  // STEP 10: Net Realization Value (NRV)
  const nrv = grv - sellingCosts;

  // STEP 11: Developer Profit
  const profit = nrv - tdc;

  // STEP 12: Profit Margin & Return on Cost
  const profitMarginPercent = (profit / tdc) * 100;
  const returnOnCost = profit / tdc;

  return {
    landCost,
    stampDuty,
    constructionCost,
    softCosts,
    contingency,
    financeCosts,
    tdc,
    grv,
    sellingCosts,
    nrv,
    profit,
    profitMarginPercent,
    returnOnCost,
  };
}

/**
 * Format currency for Australian market (no cents, thousands separator).
 *
 * @example formatMoney(4250000) → "$4,250,000"
 */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format currency in millions for executive dashboards.
 *
 * @example formatMoneyMillion(4250000) → "$4.25M"
 */
export function formatMoneyMillion(amount: number): string {
  const millions = amount / 1000000;
  return `$${millions.toFixed(2)}M`;
}

/**
 * Format percentage with one decimal place.
 *
 * @example formatPercent(0.185) → "18.5%"
 */
export function formatPercent(decimal: number): string {
  return `${(decimal * 100).toFixed(1)}%`;
}

/**
 * Parse last sold price string to number.
 * Handles formats: "$1,250,000", "$1.25M", "1250000"
 *
 * @returns Parsed number or null if invalid
 */
export function parseLastSoldPrice(priceStr: string | null): number | null {
  if (!priceStr || typeof priceStr !== 'string') return null;

  // Remove currency symbols, spaces, commas
  let cleaned = priceStr.replace(/[$,\s]/g, '');

  // Handle million suffix
  if (cleaned.toLowerCase().includes('m')) {
    cleaned = cleaned.toLowerCase().replace('m', '');
    const millions = parseFloat(cleaned);
    return Number.isFinite(millions) ? millions * 1000000 : null;
  }

  // Parse as direct number
  const amount = parseFloat(cleaned);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

/**
 * Assess feasibility viability based on profit margin thresholds.
 * Industry benchmarks:
 * - Negative: Loss-making, avoid
 * - 0-10%: High risk, marginal deal
 * - 10-20%: Acceptable for experienced developers
 * - 20-30%: Good margin, bankable project
 * - 30%+: Exceptional, rare opportunity
 */
export function assessFeasibilityViability(
  profitMarginPercent: number,
): 'loss' | 'marginal' | 'acceptable' | 'good' | 'exceptional' {
  if (profitMarginPercent < 0) return 'loss';
  if (profitMarginPercent < 10) return 'marginal';
  if (profitMarginPercent < 20) return 'acceptable';
  if (profitMarginPercent < 30) return 'good';
  return 'exceptional';
}
