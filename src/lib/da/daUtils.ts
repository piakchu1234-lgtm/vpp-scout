/**
 * Development Application Utility Functions
 *
 * Helper functions for DA data processing and display.
 */

import type { DAStatus, DevelopmentApplication } from '@/types/developmentApplication';

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Get color for DA status
 */
export function getDAStatusColor(status: DAStatus): string {
  const colors: Record<DAStatus, string> = {
    approved: '#10B981', // Green
    pending: '#F59E0B', // Amber
    refused: '#EF4444', // Red
    withdrawn: '#6B7280', // Gray
    unknown: '#9CA3AF', // Light gray
  };

  return colors[status];
}

/**
 * Get label for DA status
 */
export function getDAStatusLabel(status: DAStatus): string {
  const labels: Record<DAStatus, string> = {
    approved: 'Approved',
    pending: 'Pending',
    refused: 'Refused',
    withdrawn: 'Withdrawn',
    unknown: 'Unknown',
  };

  return labels[status];
}

/**
 * Format date for display
 */
export function formatDADate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Unknown date';
  }
}

/**
 * Truncate description for tooltip display
 */
export function truncateDescription(description: string, maxLength: number = 100): string {
  if (description.length <= maxLength) return description;
  return description.substring(0, maxLength) + '...';
}

/**
 * Group DAs by status for statistics
 */
export function groupDAsByStatus(
  applications: DevelopmentApplication[]
): Record<DAStatus, DevelopmentApplication[]> {
  const grouped: Record<DAStatus, DevelopmentApplication[]> = {
    approved: [],
    pending: [],
    refused: [],
    withdrawn: [],
    unknown: [],
  };

  for (const app of applications) {
    grouped[app.status].push(app);
  }

  return grouped;
}

/**
 * Get council jurisdiction from coordinates (simplified)
 */
export function getCouncilName(lat: number, lng: number): string {
  // TODO: Implement proper council boundary lookup
  // For now, return placeholder based on rough Melbourne area

  // This should query a council boundary API or GeoJSON
  // Example councils: Boroondara, Melbourne, Stonnington, etc.

  return 'Greater Dandenong';
}
