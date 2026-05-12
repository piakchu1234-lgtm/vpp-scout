/**
 * 维多利亚州规划条款 (Victoria Planning Provisions / VPP) — feasibility engine.
 *
 * Mock implementation of the 2026 小型第二住宅 (Small Second Dwelling / SSD)
 * permit-exempt eligibility test. The real 2026 SSD pathway also depends on
 * frontage, slope, services availability, neighbourhood character, and the
 * relevant 住宅设计准则 (ResCode) standards (Clauses 54 / 55) — those are
 * out of scope for this first iteration.
 */

// ---------- 分区 (Zone) ----------

export type ZoneCode = 'GRZ' | 'NRZ' | 'RGZ' | 'MUZ' | 'TZ';

export type Zone = {
  code: ZoneCode;
  zh: string;
  en: string;
};

export const ZONES: Record<ZoneCode, Zone> = {
  GRZ: { code: 'GRZ', zh: '一般住宅区', en: 'General Residential Zone' },
  NRZ: { code: 'NRZ', zh: '近邻住宅区', en: 'Neighbourhood Residential Zone' },
  RGZ: { code: 'RGZ', zh: '住宅成长区', en: 'Residential Growth Zone' },
  MUZ: { code: 'MUZ', zh: '混合用途区', en: 'Mixed Use Zone' },
  TZ:  { code: 'TZ',  zh: '城镇区',     en: 'Township Zone' },
};

// ---------- 叠加层 (Overlay) ----------

export type OverlayCode = 'HO' | 'BMO' | 'FO';

export type Overlay = {
  code: OverlayCode;
  zh: string;
  en: string;
  /** True if presence of this overlay disqualifies a lot from the SSD permit-exempt pathway. */
  disqualifiesSSD: boolean;
};

export const OVERLAYS: Record<OverlayCode, Overlay> = {
  HO:  { code: 'HO',  zh: '遗产覆盖区',     en: 'Heritage Overlay',                   disqualifiesSSD: true },
  BMO: { code: 'BMO', zh: '山火管理覆盖区', en: 'Bushfire Management Overlay',        disqualifiesSSD: true },
  FO:  { code: 'FO',  zh: '淹水覆盖区',     en: 'Land Subject to Inundation Overlay', disqualifiesSSD: true },
};

// ---------- 可行性结果 (Feasibility result) ----------

export type SSDStatus = 'Permit Exempt' | 'Permit Required';

export const STATUS_LABELS: Record<SSDStatus, { zh: string; en: string }> = {
  'Permit Exempt':   { zh: '豁免规划许可',   en: 'Planning Permit Exempt'   },
  'Permit Required': { zh: '需申请规划许可', en: 'Planning Permit Required' },
};

export type SSDReason = {
  code: string;
  zh: string;
  en: string;
};

export type SSDResult = {
  status: SSDStatus;
  reasons: SSDReason[];
};

/** Minimum lot size (m²) for the 2026 SSD permit-exempt pathway. */
export const SSD_MIN_LOT_SIZE_M2 = 300;

/** Maximum gross floor area (m²) for the 2026 SSD permit-exempt pathway. */
export const SSD_MAX_GFA_M2 = 60;

/**
 * ResCode Clause 54.03-5 / 55.03-9 — mandatory Minimum Garden Area for
 * residential lots above 400 m². The percentage tiers reflect the Victorian
 * Planning Provisions schedule (Apr 2018 amendment, still current 2026).
 * Lots ≤400 m² are exempt from the standard.
 */
export type GardenRequirement = {
  /** Required garden area as a fraction of total lot area (e.g. 0.25 = 25%). */
  fraction: number;
  /** Bracket label used in user-facing copy (e.g. "400–500 m²"). */
  bracketLabel: string;
};

export function getGardenRequirement(
  lotSize: number,
): GardenRequirement | null {
  if (lotSize < 400) return null;
  if (lotSize <= 500) return { fraction: 0.25, bracketLabel: '400–500 m²' };
  if (lotSize <= 650) return { fraction: 0.3, bracketLabel: '501–650 m²' };
  return { fraction: 0.35, bracketLabel: '> 650 m²' };
}

/**
 * Manual ResCode site checks the architect must confirm on-site. The 2026
 * SSD permit-exempt pathway assumes all four are satisfied; any "no" pushes
 * the lot back into the standard permit pathway.
 */
export type SiteConditions = {
  /** Frontage ≥ 5 m — minimum width for the SSD permit-exempt pathway. */
  frontageOk: boolean;
  /** Slope < 10 % — gradient cap for the 2026 exempt pathway. */
  slopeOk: boolean;
  /** ≥ 1.5 m clear side access for construction and emergency egress. */
  sideAccessOk: boolean;
  /** Amendment VC282 (Sept 2025): site must accommodate a 3 m × 3 m canopy tree. */
  treeCanopyOk: boolean;
};

export type Orientation =
  | 'N'
  | 'NE'
  | 'E'
  | 'SE'
  | 'S'
  | 'SW'
  | 'W'
  | 'NW'
  | 'Unknown';

export const ORIENTATION_LABELS: Record<
  Orientation,
  { en: string; zh: string }
> = {
  N: { en: 'North', zh: '北' },
  NE: { en: 'North-East', zh: '东北' },
  E: { en: 'East', zh: '东' },
  SE: { en: 'South-East', zh: '东南' },
  S: { en: 'South', zh: '南' },
  SW: { en: 'South-West', zh: '西南' },
  W: { en: 'West', zh: '西' },
  NW: { en: 'North-West', zh: '西北' },
  Unknown: { en: 'Unknown', zh: '未知' },
};

/**
 * Garden area inputs. `existingCoverage` is the existing dwelling + driveway
 * + impervious site area in m² before the SSD is built. The proposed SSD
 * footprint (`gfa` argument elsewhere) is added on top.
 */
export type GardenInputs = {
  existingCoverage: number;
  proposedSsdFootprint: number;
};

/**
 * Determine whether a lot qualifies for the 2026 小型第二住宅 (SSD)
 * permit-exempt pathway based on lot size, disqualifying overlays, the
 * three manual ResCode site checks, and ResCode Minimum Garden Area.
 */
export function checkSSDEligibility(
  lotSize: number,
  overlays: OverlayCode[],
  siteConditions: SiteConditions,
  garden: GardenInputs,
): SSDResult {
  const failures: SSDReason[] = [];

  if (lotSize <= SSD_MIN_LOT_SIZE_M2) {
    failures.push({
      code: 'LOT_TOO_SMALL',
      zh: `地块面积须超过 ${SSD_MIN_LOT_SIZE_M2} 平方米`,
      en: `Lot size must exceed ${SSD_MIN_LOT_SIZE_M2}m²`,
    });
  }

  for (const code of overlays) {
    const overlay = OVERLAYS[code];
    if (overlay?.disqualifiesSSD) {
      failures.push({
        code: `${code}_PRESENT`,
        zh: `存在${overlay.zh} (${code})`,
        en: `${overlay.en} (${code}) applies`,
      });
    }
  }

  if (!siteConditions.frontageOk) {
    failures.push({
      code: 'FRONTAGE_TOO_NARROW',
      zh: '地块正面宽度不足 5 米',
      en: 'Frontage is less than the 5 m minimum',
    });
  }
  if (!siteConditions.slopeOk) {
    failures.push({
      code: 'SLOPE_TOO_STEEP',
      zh: '地块坡度达到或超过 10%',
      en: 'Slope reaches or exceeds the 10% threshold',
    });
  }
  if (!siteConditions.sideAccessOk) {
    failures.push({
      code: 'SIDE_ACCESS_INSUFFICIENT',
      zh: '侧向通道净宽不足 1.5 米',
      en: 'Side access clearance is below 1.5 m',
    });
  }
  if (!siteConditions.treeCanopyOk) {
    failures.push({
      code: 'TREE_CANOPY_INSUFFICIENT',
      zh: '场地未提供 3 m × 3 m 乔木冠层空间(VC282 修订要求)',
      en: 'Site does not accommodate a 3 m × 3 m canopy tree area (Amendment VC282 requirement)',
    });
  }

  const gardenReq = getGardenRequirement(lotSize);
  if (gardenReq) {
    const requiredGardenM2 = lotSize * gardenReq.fraction;
    const availableGardenM2 = Math.max(
      0,
      lotSize - garden.existingCoverage - garden.proposedSsdFootprint,
    );
    if (availableGardenM2 < requiredGardenM2) {
      const requiredPct = Math.round(gardenReq.fraction * 100);
      failures.push({
        code: 'GARDEN_AREA_INSUFFICIENT',
        zh: `地块花园面积不足:${gardenReq.bracketLabel} 地块须保留 ${requiredPct}% 花园面积(约 ${Math.round(requiredGardenM2)} 平方米),现有可用约 ${Math.round(availableGardenM2)} 平方米`,
        en: `Minimum Garden Area shortfall: lots in the ${gardenReq.bracketLabel} bracket must retain ${requiredPct}% (≈${Math.round(requiredGardenM2)} m²); only ≈${Math.round(availableGardenM2)} m² remains after the proposed SSD`,
      });
    }
  }

  if (failures.length === 0) {
    return {
      status: 'Permit Exempt',
      reasons: [
        {
          code: 'AS_OF_RIGHT',
          zh: `地块面积超过 ${SSD_MIN_LOT_SIZE_M2} 平方米,无禁止性覆盖区,场地条件与花园面积均符合 ResCode 要求`,
          en: `Lot exceeds ${SSD_MIN_LOT_SIZE_M2}m², no disqualifying overlay applies, site conditions are met, and ResCode Minimum Garden Area is satisfied`,
        },
      ],
    };
  }

  return {
    status: 'Permit Required',
    reasons: failures,
  };
}
