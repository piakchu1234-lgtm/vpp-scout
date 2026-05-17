/**
 * Feasibility scenario — derived ROI, payback, gross yield from user inputs.
 *
 * No hardcoded financial claims. Every number returned is computed from the
 * three inputs the user provides; the narrative is a hedged, professional
 * description of what those numbers mean — never a "this site is favourable"
 * judgement.
 */

export type FeasibilityScenarioInputs = {
  /** Total build cost in AUD (excl. land). */
  buildCostAud: number;
  /** Expected weekly rent per dwelling in AUD. */
  expectedWeeklyRentAud: number;
  /** Number of dwellings achievable on the lot (1 = SSD only, 2 = dual occ). */
  dwellings: number;
};

export type FeasibilityScenarioResult = {
  annualRentPerDwellingAud: number;
  totalAnnualRentAud: number;
  simplePaybackYears: number | null;
  grossYieldPct: number | null;
  narrative: { en: string; zh: string };
};

function fmtAud(value: number): string {
  return `$${Math.round(value).toLocaleString('en-AU')}`;
}

export function computeScenario(
  inputs: FeasibilityScenarioInputs,
): FeasibilityScenarioResult | null {
  const { buildCostAud, expectedWeeklyRentAud, dwellings } = inputs;
  if (
    !Number.isFinite(buildCostAud) ||
    !Number.isFinite(expectedWeeklyRentAud) ||
    !Number.isFinite(dwellings) ||
    buildCostAud <= 0 ||
    expectedWeeklyRentAud <= 0 ||
    dwellings <= 0
  ) {
    return null;
  }

  const annualRentPerDwellingAud = expectedWeeklyRentAud * 52;
  const totalAnnualRentAud = annualRentPerDwellingAud * dwellings;
  const simplePaybackYears =
    totalAnnualRentAud > 0 ? buildCostAud / totalAnnualRentAud : null;
  const grossYieldPct =
    buildCostAud > 0 ? (totalAnnualRentAud / buildCostAud) * 100 : null;

  const paybackStr =
    simplePaybackYears !== null ? simplePaybackYears.toFixed(1) : '—';
  const yieldStr =
    grossYieldPct !== null ? grossYieldPct.toFixed(1) : '—';
  const dwellingNoun = dwellings === 1 ? 'dwelling' : 'dwellings';
  const dwellingNounZh = '住宅';

  return {
    annualRentPerDwellingAud,
    totalAnnualRentAud,
    simplePaybackYears,
    grossYieldPct,
    narrative: {
      en: `At the stated build cost of ${fmtAud(
        buildCostAud,
      )} and a weekly rent of ${fmtAud(
        expectedWeeklyRentAud,
      )} per dwelling across ${dwellings} ${dwellingNoun}, gross annual income is ${fmtAud(
        totalAnnualRentAud,
      )}. Simple payback resolves to ${paybackStr} years and gross yield to ${yieldStr}%. These figures exclude land cost, financing, vacancy, holding and maintenance — verify against an independent feasibility study before commitment.`,
      zh: `按建造成本 ${fmtAud(
        buildCostAud,
      )}、每周租金 ${fmtAud(
        expectedWeeklyRentAud,
      )} 计算,${dwellings} 套${dwellingNounZh}的年总租金为 ${fmtAud(
        totalAnnualRentAud,
      )}。简单回本期 ${paybackStr} 年,毛收益率 ${yieldStr}%。以上数据未计入土地成本、融资、空置、持有及维修费用,作出投资决策前请核以独立可行性评估。`,
    },
  };
}
