/**
 * Small Second Dwelling (SSD) Compliance Engine — 2026 Victorian Reforms
 *
 * Automates the strict legislative requirements for permit-exempt Small Second
 * Dwellings under the 2026 Victorian planning reforms. This module enforces:
 *
 * - 60 m² maximum gross floor area cap
 * - Zero car parking requirement (bypass Clause 52.06)
 * - Whole-allotment minimum garden area calculation
 * - NCC 2025 compliance requirements (effective 1 May 2026)
 * - Gas connection prohibition
 * - Subdivision prohibition
 *
 * CRITICAL: This is NOT a general feasibility calculator. This module ONLY
 * applies when the user explicitly selects "Small Second Dwelling" mode.
 */

import { getGardenRequirement, SSD_MIN_LOT_SIZE_M2, SSD_MAX_GFA_M2, type OverlayCode, OVERLAYS } from './feasibility';
import type { Polygon } from 'geojson';
import type { OverlayGeometry } from './overlayService';
import { detectOverlayIntersections, type SpatialRiskAssessment } from './spatialIntersection';

export const SSD_REFORMS_EFFECTIVE_DATE = '1 May 2026';
export const NCC_VERSION = 'NCC 2025';

export type SSDComplianceStatus = 'permit_exempt' | 'permit_required' | 'non_compliant';

export type SSDComplianceCheck = {
  id: string;
  clause: string;
  label: { en: string; zh: string };
  status: 'pass' | 'fail' | 'warning';
  detail: { en: string; zh: string };
};

export type SSDComplianceResult = {
  overallStatus: SSDComplianceStatus;
  isPlanningPermitExempt: boolean;
  isBuildingPermitRequired: boolean;
  checks: SSDComplianceCheck[];
  warnings: {
    gasConnection: { en: string; zh: string };
    subdivisionProhibited: { en: string; zh: string };
    nccCompliance: { en: string; zh: string };
  };
  /** Spatial intersection analysis (if building footprint provided) */
  spatialRisk?: SpatialRiskAssessment;
};

/**
 * Comprehensive SSD compliance assessment for 2026 Victorian reforms.
 *
 * @param lotSizeM2 - Total allotment area (Turf.js calculated from parcel boundary)
 * @param existingDwellingFootprintM2 - Existing primary dwelling footprint
 * @param proposedSSDFootprintM2 - Proposed SSD footprint (must be ≤60 m²)
 * @param zoneCode - Planning zone code (GRZ, NRZ, MUZ, TZ, RGZ)
 * @param overlays - Array of overlay codes applying to the property
 * @param frontageM - Street frontage in meters (≥5m required)
 * @param slopePercent - Site slope percentage (≤10% required)
 * @param hasSideAccess - Whether site has ≥1.5m clear side access
 * @param hasTreeCanopySpace - Whether site can accommodate 3m × 3m canopy tree (VC282)
 * @param buildingFootprintGeometry - Optional GeoJSON Polygon for spatial intersection analysis
 * @param overlayGeometries - Optional array of overlay polygon geometries for intersection checking
 * @returns Comprehensive SSD compliance assessment
 */
export function assessSSDCompliance(
  lotSizeM2: number,
  existingDwellingFootprintM2: number,
  proposedSSDFootprintM2: number,
  zoneCode: string,
  overlays: string[] = [],
  frontageM: number | null = null,
  slopePercent: number | null = null,
  hasSideAccess: boolean = true,
  hasTreeCanopySpace: boolean = true,
  buildingFootprintGeometry?: Polygon,
  overlayGeometries?: OverlayGeometry[],
): SSDComplianceResult {
  const checks: SSDComplianceCheck[] = [];
  let overallStatus: SSDComplianceStatus = 'permit_exempt';

  // 1. CRITICAL: 60 m² maximum gross floor area cap
  const gfaCheck: SSDComplianceCheck = {
    id: 'ssd_gfa_cap',
    clause: '2026 SSD Reforms — Maximum GFA',
    label: {
      en: `Gross Floor Area ≤ ${SSD_MAX_GFA_M2} m²`,
      zh: `总建筑面积 ≤ ${SSD_MAX_GFA_M2} 平方米`,
    },
    status: proposedSSDFootprintM2 <= SSD_MAX_GFA_M2 ? 'pass' : 'fail',
    detail: {
      en:
        proposedSSDFootprintM2 <= SSD_MAX_GFA_M2
          ? `Proposed SSD is ${proposedSSDFootprintM2.toFixed(1)} m², complies with ${SSD_MAX_GFA_M2} m² cap.`
          : `CRITICAL FAILURE: Proposed SSD is ${proposedSSDFootprintM2.toFixed(1)} m², exceeds ${SSD_MAX_GFA_M2} m² maximum. Planning permit required.`,
      zh:
        proposedSSDFootprintM2 <= SSD_MAX_GFA_M2
          ? `拟建小型第二住宅为 ${proposedSSDFootprintM2.toFixed(1)} 平方米,符合 ${SSD_MAX_GFA_M2} 平方米上限。`
          : `严重违规:拟建小型第二住宅为 ${proposedSSDFootprintM2.toFixed(1)} 平方米,超过 ${SSD_MAX_GFA_M2} 平方米上限。需申请规划许可。`,
    },
  };
  checks.push(gfaCheck);
  if (gfaCheck.status === 'fail') overallStatus = 'permit_required';

  // 2. Minimum lot size (300 m²)
  const lotSizeCheck: SSDComplianceCheck = {
    id: 'ssd_min_lot',
    clause: '2026 SSD Reforms — Minimum Lot Size',
    label: {
      en: `Lot Size ≥ ${SSD_MIN_LOT_SIZE_M2} m²`,
      zh: `地块面积 ≥ ${SSD_MIN_LOT_SIZE_M2} 平方米`,
    },
    status: lotSizeM2 >= SSD_MIN_LOT_SIZE_M2 ? 'pass' : 'fail',
    detail: {
      en:
        lotSizeM2 >= SSD_MIN_LOT_SIZE_M2
          ? `Lot is ${lotSizeM2.toFixed(1)} m², exceeds ${SSD_MIN_LOT_SIZE_M2} m² minimum.`
          : `Lot is ${lotSizeM2.toFixed(1)} m², below ${SSD_MIN_LOT_SIZE_M2} m² minimum. SSD not permitted.`,
      zh:
        lotSizeM2 >= SSD_MIN_LOT_SIZE_M2
          ? `地块为 ${lotSizeM2.toFixed(1)} 平方米,超过 ${SSD_MIN_LOT_SIZE_M2} 平方米最低要求。`
          : `地块为 ${lotSizeM2.toFixed(1)} 平方米,低于 ${SSD_MIN_LOT_SIZE_M2} 平方米最低要求。不允许建造小型第二住宅。`,
    },
  };
  checks.push(lotSizeCheck);
  if (lotSizeCheck.status === 'fail') overallStatus = 'non_compliant';

  // 3. Zone eligibility (GRZ, NRZ, MUZ, TZ, RGZ)
  const eligibleZones = ['GRZ', 'NRZ', 'MUZ', 'TZ', 'RGZ'];
  const zoneUpper = zoneCode.toUpperCase();
  const isZoneEligible = eligibleZones.some((z) => zoneUpper.startsWith(z));

  const zoneCheck: SSDComplianceCheck = {
    id: 'ssd_zone',
    clause: '2026 SSD Reforms — Eligible Zones',
    label: {
      en: 'Zone: GRZ/NRZ/MUZ/TZ/RGZ',
      zh: '分区: GRZ/NRZ/MUZ/TZ/RGZ',
    },
    status: isZoneEligible ? 'pass' : 'fail',
    detail: {
      en: isZoneEligible
        ? `Zone ${zoneCode} is eligible for permit-exempt SSD pathway.`
        : `Zone ${zoneCode} is NOT eligible. SSD pathway only applies to GRZ, NRZ, MUZ, TZ, and RGZ zones.`,
      zh: isZoneEligible
        ? `分区 ${zoneCode} 符合豁免规划许可的小型第二住宅路径。`
        : `分区 ${zoneCode} 不符合。小型第二住宅路径仅适用于 GRZ、NRZ、MUZ、TZ 和 RGZ 分区。`,
    },
  };
  checks.push(zoneCheck);
  if (zoneCheck.status === 'fail') overallStatus = 'non_compliant';

  // 4. Disqualifying overlays (HO, BMO, FO, SBO)
  const disqualifyingOverlays = overlays.filter((code) => {
    const overlayKey = code.toUpperCase().replace(/\d+$/, '') as OverlayCode;
    return OVERLAYS[overlayKey]?.disqualifiesSSD;
  });

  const overlayCheck: SSDComplianceCheck = {
    id: 'ssd_overlays',
    clause: '2026 SSD Reforms — Disqualifying Overlays',
    label: {
      en: 'No HO/BMO/FO/SBO Overlays',
      zh: '无 HO/BMO/FO/SBO 覆盖区',
    },
    status: disqualifyingOverlays.length === 0 ? 'pass' : 'fail',
    detail: {
      en:
        disqualifyingOverlays.length === 0
          ? 'No disqualifying overlays detected.'
          : `Disqualifying overlays present: ${disqualifyingOverlays.join(', ')}. Planning permit required.`,
      zh:
        disqualifyingOverlays.length === 0
          ? '未检测到禁止性覆盖区。'
          : `存在禁止性覆盖区:${disqualifyingOverlays.join(', ')}。需申请规划许可。`,
    },
  };
  checks.push(overlayCheck);
  if (overlayCheck.status === 'fail') overallStatus = 'permit_required';

  // 5. CRITICAL: Whole-allotment minimum garden area (ResCode Clause 54.03-5)
  const gardenReq = getGardenRequirement(lotSizeM2);
  let gardenCheck: SSDComplianceCheck;

  if (!gardenReq) {
    // Lot < 400 m² — exempt from garden area requirement
    gardenCheck = {
      id: 'ssd_garden',
      clause: 'ResCode Clause 54.03-5 — Minimum Garden Area',
      label: {
        en: 'Minimum Garden Area',
        zh: '最低花园面积',
      },
      status: 'pass',
      detail: {
        en: `Lot under 400 m² — exempt from minimum garden area requirement.`,
        zh: `地块小于 400 平方米 — 豁免最低花园面积要求。`,
      },
    };
  } else {
    const requiredGardenM2 = lotSizeM2 * gardenReq.fraction;
    const totalCoverageM2 = existingDwellingFootprintM2 + proposedSSDFootprintM2;
    const availableGardenM2 = Math.max(0, lotSizeM2 - totalCoverageM2);
    const requiredPct = Math.round(gardenReq.fraction * 100);

    gardenCheck = {
      id: 'ssd_garden',
      clause: 'ResCode Clause 54.03-5 — Minimum Garden Area',
      label: {
        en: `Minimum Garden Area ≥ ${requiredPct}%`,
        zh: `最低花园面积 ≥ ${requiredPct}%`,
      },
      status: availableGardenM2 >= requiredGardenM2 ? 'pass' : 'fail',
      detail: {
        en:
          availableGardenM2 >= requiredGardenM2
            ? `Garden area compliant: ${availableGardenM2.toFixed(1)} m² available vs ${requiredGardenM2.toFixed(1)} m² required (${requiredPct}% of ${gardenReq.bracketLabel} lot). Combined footprint (existing ${existingDwellingFootprintM2.toFixed(1)} m² + SSD ${proposedSSDFootprintM2.toFixed(1)} m²) = ${totalCoverageM2.toFixed(1)} m².`
            : `GARDEN AREA VIOLATION: Only ${availableGardenM2.toFixed(1)} m² garden remains after combined footprint (existing ${existingDwellingFootprintM2.toFixed(1)} m² + SSD ${proposedSSDFootprintM2.toFixed(1)} m² = ${totalCoverageM2.toFixed(1)} m²). Requires ${requiredGardenM2.toFixed(1)} m² (${requiredPct}% of ${gardenReq.bracketLabel} lot). Reduce footprints by ${(requiredGardenM2 - availableGardenM2).toFixed(1)} m².`,
        zh:
          availableGardenM2 >= requiredGardenM2
            ? `花园面积合规:可用 ${availableGardenM2.toFixed(1)} 平方米,要求 ${requiredGardenM2.toFixed(1)} 平方米(${gardenReq.bracketLabel} 地块的 ${requiredPct}%)。合并建筑面积(现有 ${existingDwellingFootprintM2.toFixed(1)} 平方米 + SSD ${proposedSSDFootprintM2.toFixed(1)} 平方米) = ${totalCoverageM2.toFixed(1)} 平方米。`
            : `花园面积违规:合并建筑面积后(现有 ${existingDwellingFootprintM2.toFixed(1)} 平方米 + SSD ${proposedSSDFootprintM2.toFixed(1)} 平方米 = ${totalCoverageM2.toFixed(1)} 平方米)仅剩 ${availableGardenM2.toFixed(1)} 平方米花园。需要 ${requiredGardenM2.toFixed(1)} 平方米(${gardenReq.bracketLabel} 地块的 ${requiredPct}%)。需减少建筑面积 ${(requiredGardenM2 - availableGardenM2).toFixed(1)} 平方米。`,
      },
    };
  }
  checks.push(gardenCheck);
  if (gardenCheck.status === 'fail') overallStatus = 'permit_required';

  // 6. Site condition checks (optional — only check if provided)
  if (frontageM !== null) {
    const frontageCheck: SSDComplianceCheck = {
      id: 'ssd_frontage',
      clause: '2026 SSD Reforms — Minimum Frontage',
      label: {
        en: 'Frontage ≥ 5 m',
        zh: '临街面宽 ≥ 5 米',
      },
      status: frontageM >= 5 ? 'pass' : 'fail',
      detail: {
        en: frontageM >= 5 ? `Frontage is ${frontageM.toFixed(1)} m, meets 5 m minimum.` : `Frontage is ${frontageM.toFixed(1)} m, below 5 m minimum. Planning permit required.`,
        zh: frontageM >= 5 ? `临街面宽为 ${frontageM.toFixed(1)} 米,符合 5 米最低要求。` : `临街面宽为 ${frontageM.toFixed(1)} 米,低于 5 米最低要求。需申请规划许可。`,
      },
    };
    checks.push(frontageCheck);
    if (frontageCheck.status === 'fail') overallStatus = 'permit_required';
  }

  if (slopePercent !== null) {
    const slopeCheck: SSDComplianceCheck = {
      id: 'ssd_slope',
      clause: '2026 SSD Reforms — Maximum Slope',
      label: {
        en: 'Slope ≤ 10%',
        zh: '坡度 ≤ 10%',
      },
      status: slopePercent <= 10 ? 'pass' : 'fail',
      detail: {
        en: slopePercent <= 10 ? `Slope is ${slopePercent.toFixed(1)}%, within 10% limit.` : `Slope is ${slopePercent.toFixed(1)}%, exceeds 10% limit. Planning permit required.`,
        zh: slopePercent <= 10 ? `坡度为 ${slopePercent.toFixed(1)}%,在 10% 限制内。` : `坡度为 ${slopePercent.toFixed(1)}%,超过 10% 限制。需申请规划许可。`,
      },
    };
    checks.push(slopeCheck);
    if (slopeCheck.status === 'fail') overallStatus = 'permit_required';
  }

  const sideAccessCheck: SSDComplianceCheck = {
    id: 'ssd_side_access',
    clause: '2026 SSD Reforms — Side Access',
    label: {
      en: 'Side Access ≥ 1.5 m',
      zh: '侧向通道 ≥ 1.5 米',
    },
    status: hasSideAccess ? 'pass' : 'warning',
    detail: {
      en: hasSideAccess ? 'Site has adequate side access (≥1.5 m clear).' : 'Side access unverified. Requires ≥1.5 m clear width for construction and emergency egress.',
      zh: hasSideAccess ? '场地有足够的侧向通道(≥1.5 米净宽)。' : '侧向通道未验证。需要 ≥1.5 米净宽用于施工和紧急疏散。',
    },
  };
  checks.push(sideAccessCheck);

  const treeCanopyCheck: SSDComplianceCheck = {
    id: 'ssd_tree_canopy',
    clause: 'VC282 Amendment — Canopy Tree Space',
    label: {
      en: '3 m × 3 m Canopy Tree Space',
      zh: '3 米 × 3 米乔木冠层空间',
    },
    status: hasTreeCanopySpace ? 'pass' : 'warning',
    detail: {
      en: hasTreeCanopySpace ? 'Site can accommodate 3 m × 3 m canopy tree area (VC282 requirement).' : 'VC282 requires 3 m × 3 m space for canopy tree. Verify site layout accommodates this.',
      zh: hasTreeCanopySpace ? '场地可容纳 3 米 × 3 米乔木冠层空间(VC282 要求)。' : 'VC282 要求 3 米 × 3 米乔木冠层空间。请验证场地布局是否容纳此空间。',
    },
  };
  checks.push(treeCanopyCheck);

  // Determine overall planning permit exemption status
  const isPlanningPermitExempt = overallStatus === 'permit_exempt';

  // SPATIAL INTERSECTION ANALYSIS (if building footprint geometry provided)
  let spatialRisk: SpatialRiskAssessment | undefined;

  if (buildingFootprintGeometry && overlayGeometries && overlayGeometries.length > 0) {
    try {
      spatialRisk = detectOverlayIntersections(buildingFootprintGeometry, overlayGeometries);

      // CRITICAL: If spatial analysis detects high-risk overlay intersections,
      // OVERRIDE the permit exemption status regardless of other checks
      if (spatialRisk.hasHighRiskIntersections) {
        overallStatus = 'permit_required';
        console.warn(
          `[SSD Compliance] Spatial intersection detected with ${spatialRisk.criticalOverlays.length} high-risk overlay(s). Permit exemption VOIDED.`,
        );

        // Add spatial intersection failure to checks
        const spatialCheck: SSDComplianceCheck = {
          id: 'ssd_spatial_intersection',
          clause: 'Spatial Intersection Analysis — Overlay Constraints',
          label: {
            en: 'No High-Risk Overlay Intersections',
            zh: '无高风险覆盖区相交',
          },
          status: 'fail',
          detail: {
            en: `SPATIAL CONFLICT: Building footprint intersects with ${spatialRisk.criticalOverlays.length} high-risk overlay(s): ${spatialRisk.criticalOverlays.map((o) => o.overlayCode).join(', ')}. Statutory permit exemptions VOIDED.`,
            zh: `空间冲突:建筑物与 ${spatialRisk.criticalOverlays.length} 个高风险覆盖区相交:${spatialRisk.criticalOverlays.map((o) => o.overlayCode).join(', ')}。法定豁免失效。`,
          },
        };
        checks.push(spatialCheck);
      } else if (spatialRisk.verdict === 'clear') {
        // Add passing spatial check
        const spatialCheck: SSDComplianceCheck = {
          id: 'ssd_spatial_intersection',
          clause: 'Spatial Intersection Analysis — Overlay Constraints',
          label: {
            en: 'No High-Risk Overlay Intersections',
            zh: '无高风险覆盖区相交',
          },
          status: 'pass',
          detail: {
            en: 'Spatial analysis complete: Building footprint does not intersect with any high-risk planning overlays. Permit exemption maintained.',
            zh: '空间分析完成:建筑物未与任何高风险规划覆盖区相交。豁免维持有效。',
          },
        };
        checks.push(spatialCheck);
      }
    } catch (err) {
      console.error('[SSD Compliance] Spatial intersection analysis failed:', err);
      // Add warning check if spatial analysis fails
      const spatialCheck: SSDComplianceCheck = {
        id: 'ssd_spatial_intersection',
        clause: 'Spatial Intersection Analysis — Overlay Constraints',
        label: {
          en: 'Overlay Intersection Check',
          zh: '覆盖区相交检查',
        },
        status: 'warning',
        detail: {
          en: 'Spatial intersection analysis could not be completed. Manual overlay verification recommended.',
          zh: '空间相交分析无法完成。建议手动验证覆盖区。',
        },
      };
      checks.push(spatialCheck);
    }
  }

  return {
    overallStatus,
    isPlanningPermitExempt: overallStatus === 'permit_exempt',
    isBuildingPermitRequired: true, // ALWAYS required for SSD, regardless of planning permit status
    checks,
    warnings: {
      gasConnection: {
        en: `CRITICAL: Small Second Dwellings cannot be connected to reticulated natural gas under 2026 Victorian reforms (effective ${SSD_REFORMS_EFFECTIVE_DATE}). Use electric or other non-gas energy sources.`,
        zh: `严重警告:根据 2026 年维多利亚州改革(自 ${SSD_REFORMS_EFFECTIVE_DATE} 生效),小型第二住宅不得连接市政天然气管网。请使用电力或其他非燃气能源。`,
      },
      subdivisionProhibited: {
        en: 'CRITICAL: Subdivision is strictly prohibited. The SSD must remain on the same title as the primary dwelling.',
        zh: '严重警告:严格禁止分割。小型第二住宅必须与主要住宅保持在同一产权上。',
      },
      nccCompliance: {
        en: `Building Permit ALWAYS REQUIRED under ${NCC_VERSION} (effective ${SSD_REFORMS_EFFECTIVE_DATE}). Contact a registered building surveyor before construction.`,
        zh: `根据 ${NCC_VERSION}(自 ${SSD_REFORMS_EFFECTIVE_DATE} 生效),始终需要建筑许可。施工前请联系注册建筑测量师。`,
      },
    },
    spatialRisk,
  };
}

/**
 * Calculate maximum permissible SSD footprint given lot size and existing dwelling.
 *
 * This accounts for:
 * - 60 m² absolute maximum
 * - Whole-allotment minimum garden area requirement
 *
 * @param lotSizeM2 - Total allotment area
 * @param existingDwellingFootprintM2 - Existing primary dwelling footprint
 * @returns Maximum SSD footprint that maintains garden area compliance
 */
export function calculateMaxSSDFootprint(
  lotSizeM2: number,
  existingDwellingFootprintM2: number,
): {
  maxFootprintM2: number;
  limitingFactor: 'gfa_cap' | 'garden_area' | 'unknown';
  requiredGardenM2: number | null;
} {
  if (!Number.isFinite(lotSizeM2) || lotSizeM2 <= 0) {
    return {
      maxFootprintM2: 0,
      limitingFactor: 'unknown',
      requiredGardenM2: null,
    };
  }

  // Hard cap: 60 m² maximum
  let maxFootprint = SSD_MAX_GFA_M2;
  let limitingFactor: 'gfa_cap' | 'garden_area' = 'gfa_cap';

  // Check garden area constraint
  const gardenReq = getGardenRequirement(lotSizeM2);
  if (gardenReq) {
    const requiredGardenM2 = lotSizeM2 * gardenReq.fraction;
    const maxTotalCoverage = lotSizeM2 - requiredGardenM2;
    const maxSSDFromGarden = Math.max(0, maxTotalCoverage - existingDwellingFootprintM2);

    if (maxSSDFromGarden < maxFootprint) {
      maxFootprint = maxSSDFromGarden;
      limitingFactor = 'garden_area';
    }

    return {
      maxFootprintM2: Math.max(0, Math.min(maxFootprint, SSD_MAX_GFA_M2)),
      limitingFactor,
      requiredGardenM2,
    };
  }

  // Lot < 400 m² — only GFA cap applies
  return {
    maxFootprintM2: SSD_MAX_GFA_M2,
    limitingFactor: 'gfa_cap',
    requiredGardenM2: null,
  };
}
