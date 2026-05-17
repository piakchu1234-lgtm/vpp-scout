/**
 * Google Street View Static API integration.
 *
 * Returns the live Street View URL when a Google Maps key is present
 * (env var or localStorage). When absent, returns a minimal text-only
 * placeholder so the UI never renders a broken image.
 */

const ENV_GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
const LOCAL_STORAGE_KEY = 'simplysite.google_maps_key';

function getGoogleKey(): string | undefined {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored && stored.trim()) return stored.trim();
  }
  return ENV_GOOGLE_KEY;
}

function unavailableDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" preserveAspectRatio="xMidYMid slice">
  <rect width="600" height="360" fill="#fafafa"/>
  <text x="300" y="180" text-anchor="middle"
    font-family="Inter, system-ui, sans-serif" font-size="11"
    letter-spacing="3" fill="#71717a"
    style="text-transform: uppercase;">Street View Unavailable</text>
  <text x="300" y="206" text-anchor="middle"
    font-family="Inter, system-ui, sans-serif" font-size="9"
    fill="#a1a1aa">Configure NEXT_PUBLIC_GOOGLE_MAPS_KEY to load live Street View</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export type StreetViewResult = {
  url: string;
  isDemoData: boolean;
};

export function getStreetViewUrl(lat: number, lon: number): StreetViewResult {
  const key = getGoogleKey();
  if (!key) return { url: unavailableDataUrl(), isDemoData: true };
  const params = new URLSearchParams({
    size: '600x360',
    location: `${lat},${lon}`,
    fov: '80',
    pitch: '0',
    key,
  });
  return {
    url: `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`,
    isDemoData: false,
  };
}


