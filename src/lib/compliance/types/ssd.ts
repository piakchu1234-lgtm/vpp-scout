export interface SiteParameters {
  lotSize: number;
  zones: string[];
  overlays: string[];
  hasExistingDwelling: boolean;
}

export interface SSDAssessmentResult {
  isFastTrackEligible: boolean;
  permitRequired: boolean;
  maxFloorArea: number;
  blockingFactors: string[];
  requiredSetbacks: {
    street: number;
    side: number;
    rear: number;
  };
}
