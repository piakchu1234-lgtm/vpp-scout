/**
 * SSD (Small Second Dwelling) Eligibility Checker
 *
 * Victorian Planning Provisions Clause 52.06 - Small Second Dwellings
 * Checks if a property is eligible for the streamlined approval pathway
 */

export type SSDCriteria = {
  id: string;
  label: { en: string; zh: string };
  isPassing: boolean;
  reasoning?: string;
};

export type SSDEligibility = {
  isEligible: boolean;
  criteria: SSDCriteria[];
  summary: { en: string; zh: string };
};

/**
 * Evaluate SSD eligibility based on zone, lot size, and existing dwelling
 */
export function evaluateSSDEligibility(
  zoneCode: string | null,
  lotSizeM2: number | null,
  hasExistingDwelling: boolean = true
): SSDEligibility {
  const criteria: SSDCriteria[] = [];

  // Criterion 1: Must be in eligible zone (GRZ, NRZ, RGZ)
  const eligibleZones = ['GRZ', 'NRZ', 'RGZ'];
  const zoneType = zoneCode?.slice(0, 3).toUpperCase() || '';
  const isEligibleZone = eligibleZones.includes(zoneType);

  criteria.push({
    id: 'zone',
    label: {
      en: 'Located in eligible residential zone',
      zh: '位于符合条件的住宅区',
    },
    isPassing: isEligibleZone,
    reasoning: isEligibleZone
      ? `${zoneCode} is eligible`
      : `${zoneCode} is not eligible (must be GRZ, NRZ, or RGZ)`,
  });

  // Criterion 2: Lot size minimum 300m²
  const meetsMinLotSize = lotSizeM2 !== null && lotSizeM2 >= 300;

  criteria.push({
    id: 'lotSize',
    label: {
      en: 'Lot size at least 300m²',
      zh: '地块面积至少300平方米',
    },
    isPassing: meetsMinLotSize,
    reasoning: lotSizeM2
      ? `Lot is ${lotSizeM2.toFixed(0)}m² ${meetsMinLotSize ? '(meets minimum)' : '(below minimum)'}`
      : 'Lot size unknown',
  });

  // Criterion 3: Must have existing dwelling on lot
  criteria.push({
    id: 'existingDwelling',
    label: {
      en: 'Existing dwelling on the lot',
      zh: '地块上有现有住宅',
    },
    isPassing: hasExistingDwelling,
    reasoning: hasExistingDwelling
      ? 'Primary dwelling present'
      : 'No existing dwelling detected',
  });

  // Criterion 4: Maximum floor area 60m²
  criteria.push({
    id: 'floorArea',
    label: {
      en: 'SSD floor area not exceeding 60m²',
      zh: 'SSD建筑面积不超过60平方米',
    },
    isPassing: true, // Always pass for now (design stage)
    reasoning: 'Design constraint - verify in plans',
  });

  // Criterion 5: Maximum building height 3.6m
  criteria.push({
    id: 'height',
    label: {
      en: 'Maximum building height 3.6m',
      zh: '最大建筑高度3.6米',
    },
    isPassing: true, // Always pass for now (design stage)
    reasoning: 'Design constraint - verify in plans',
  });

  // Criterion 6: Minimum 1m setback from boundaries
  criteria.push({
    id: 'setback',
    label: {
      en: 'Minimum 1m setback from side and rear boundaries',
      zh: '距离侧边和后边界至少1米',
    },
    isPassing: true, // Always pass for now (design stage)
    reasoning: 'Design constraint - verify in plans',
  });

  // Overall eligibility
  const isEligible = criteria.every((c) => c.isPassing);

  const summary = isEligible
    ? {
        en: 'Property is eligible for Small Second Dwelling under Clause 52.06',
        zh: '该房产符合条款52.06的小型第二住宅资格',
      }
    : {
        en: 'Property does not meet all SSD eligibility criteria',
        zh: '该房产不符合所有SSD资格标准',
      };

  return {
    isEligible,
    criteria,
    summary,
  };
}
