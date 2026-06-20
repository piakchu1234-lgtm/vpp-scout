/**
 * Development Application Types
 *
 * Type definitions for local council DA tracking and precedent analysis.
 */

export type DAStatus = 'approved' | 'pending' | 'refused' | 'withdrawn' | 'unknown';

export interface DevelopmentApplication {
  /** Unique identifier (e.g., DA number or internal ID) */
  id: string;

  /** DA reference number from council */
  daNumber: string;

  /** Property address */
  address: string;

  /** Property coordinates */
  latitude: number;
  longitude: number;

  /** Council name */
  councilName: string;

  /** Application status */
  status: DAStatus;

  /** Brief description of the development */
  description: string;

  /** Date application was lodged */
  lodgedDate: string; // ISO format

  /** Date decision was made (if applicable) */
  decidedDate?: string; // ISO format

  /** Applicant name */
  applicantName?: string;

  /** Distance from subject property (in meters) */
  distanceFromSubject?: number;

  /** Council portal URL (if available) */
  url?: string;
}

export interface DASearchRequest {
  /** Center point latitude */
  lat: number;

  /** Center point longitude */
  lng: number;

  /** Search radius in meters (default: 1000m = 1km) */
  radius?: number;
}

export interface DASearchResponse {
  success: boolean;
  applications?: DevelopmentApplication[];
  count?: number;
  error?: string;
  metadata?: {
    centerPoint: [number, number];
    radius: number;
    source: 'planningalerts' | 'council_scraper' | 'mock';
  };
}
