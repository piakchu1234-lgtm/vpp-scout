# Map Click Integration Guide

## Overview

This guide shows how to integrate the unified property analysis API with your map component to enable instant property data loading on map clicks.

## Integration Architecture

```
User clicks map
    ↓
MapPreview.tsx (capture click coordinates)
    ↓
usePropertyAnalysis hook (fetch spatial data)
    ↓
Dashboard panels update (display property data)
```

## Step 1: Update MapPreview Component

Add click handler to your existing `MapPreview.tsx` component:

```typescript
// src/components/MapPreview.tsx

import { usePropertyAnalysis } from '@/hooks/usePropertyAnalysis';
import type mapboxgl from 'mapbox-gl';

interface MapPreviewProps {
  // ... existing props
  onPropertySelect?: (propertyData: PropertyAnalysisData) => void;
}

export default function MapPreview({ onPropertySelect, ...props }: MapPreviewProps) {
  const { analyze, loading } = usePropertyAnalysis({
    onSuccess: (data) => {
      console.log('[Map] Property selected:', data.address);
      onPropertySelect?.(data);
    },
    onError: (error) => {
      console.error('[Map] Property lookup failed:', error);
      // Show toast notification to user
    },
  });

  const handleMapClick = async (event: mapboxgl.MapMouseEvent) => {
    const { lng, lat } = event.lngLat;

    // Visual feedback - add temporary marker
    const marker = new mapboxgl.Marker({ color: '#E9E778' })
      .setLngLat([lng, lat])
      .addTo(mapRef.current!);

    // Query property at clicked location
    const propertyData = await analyze({ lat, lng });

    if (propertyData) {
      // Success - keep marker and update dashboard
      // Marker will be repositioned to property centroid by parent component
    } else {
      // Failed - remove temporary marker
      marker.remove();
    }
  };

  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Add click handler
    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [analyze]);

  // ... rest of component
}
```

## Step 2: Update Parent Page Component

Wire the property selection to your dashboard panels:

```typescript
// src/app/app/page.tsx

'use client';

import { useState } from 'react';
import MapPreview from '@/components/MapPreview';
import PropertySidePanel from '@/components/dashboard/PropertySidePanel';
import InsightPanel from '@/components/dashboard/InsightPanel';
import type { PropertyAnalysisData } from '@/hooks/usePropertyAnalysis';

export default function AppPage() {
  const [selectedProperty, setSelectedProperty] = useState<PropertyAnalysisData | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([144.9631, -37.8136]);

  const handlePropertySelect = (propertyData: PropertyAnalysisData) => {
    setSelectedProperty(propertyData);

    // Center map on property
    setMapCenter([propertyData.center.lng, propertyData.center.lat]);

    // Update URL with property coordinates (for sharing/bookmarking)
    const url = new URL(window.location.href);
    url.searchParams.set('lat', propertyData.center.lat.toString());
    url.searchParams.set('lng', propertyData.center.lng.toString());
    url.searchParams.set('address', propertyData.address);
    window.history.pushState({}, '', url);
  };

  return (
    <div className="flex h-screen">
      {/* Left Panel - Property Details */}
      <PropertySidePanel
        address={selectedProperty?.address || null}
        zoneCode={selectedProperty?.statutory.zoneCode || null}
        overlays={selectedProperty?.statutory.overlays || []}
        lotSize={selectedProperty?.dimensions.lotSizeSqm || null}
        frontage={selectedProperty?.dimensions.frontageMeters || null}
        // ... other props
      />

      {/* Center - Map */}
      <div className="flex-1">
        <MapPreview
          center={mapCenter}
          onPropertySelect={handlePropertySelect}
          // ... other props
        />
      </div>

      {/* Right Panel - Insights */}
      <InsightPanel
        specifications={selectedProperty?.specifications || null}
        market={selectedProperty?.market || null}
        feasibility={selectedProperty?.feasibility || null}
        // ... other props
      />
    </div>
  );
}
```

## Step 3: Add Loading States

Show loading indicators while property data is being fetched:

```typescript
export default function AppPage() {
  const [isLoadingProperty, setIsLoadingProperty] = useState(false);

  const handlePropertySelect = (propertyData: PropertyAnalysisData) => {
    setIsLoadingProperty(false);
    setSelectedProperty(propertyData);
    // ... rest of handler
  };

  const handleMapClick = () => {
    setIsLoadingProperty(true);
  };

  return (
    <div className="flex h-screen">
      {/* Loading overlay */}
      {isLoadingProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-lime animate-spin" />
            <span className="text-white">Loading property data...</span>
          </div>
        </div>
      )}

      {/* ... panels */}
    </div>
  );
}
```

## Step 4: Add Error Handling

Display user-friendly error messages:

```typescript
import { toast } from 'sonner'; // or your preferred toast library

const { analyze, loading } = usePropertyAnalysis({
  onSuccess: (data) => {
    toast.success(`Property loaded: ${data.address}`);
    onPropertySelect?.(data);
  },
  onError: (error) => {
    if (error.error === 'Property not found') {
      toast.error('No property found at this location', {
        description: 'Try clicking on a cadastral parcel boundary',
      });
    } else {
      toast.error('Failed to load property data', {
        description: error.details || 'Please try again',
      });
    }
  },
});
```

## Step 5: Add Fallback to Full Enrichment Pipeline

If property is not in `property_parcels` table, fallback to the full orchestrator:

```typescript
const handlePropertySelect = async (lat: number, lng: number) => {
  // Step 1: Try fast spatial lookup
  const quickResult = await fetch(
    `/api/properties/analyze?lat=${lat}&lng=${lng}`
  );

  if (quickResult.ok) {
    const { data } = await quickResult.json();
    setSelectedProperty(data);
    return;
  }

  // Step 2: Fallback to full enrichment pipeline
  if (quickResult.status === 404) {
    toast.info('Property not cached - fetching from Vicmap...', {
      duration: 3000,
    });

    const fullResult = await fetch(
      `/api/property/analyze?lat=${lat}&lng=${lng}`
    );

    if (fullResult.ok) {
      const { data } = await fullResult.json();
      setSelectedProperty(data);
      toast.success('Property data loaded');
    } else {
      toast.error('Property not found in Victorian cadastre');
    }
  }
};
```

## Step 6: Add Property Marker to Map

Display a marker at the selected property location:

```typescript
// src/components/MapPreview.tsx

const [propertyMarker, setPropertyMarker] = useState<mapboxgl.Marker | null>(null);

const handlePropertySelect = (propertyData: PropertyAnalysisData) => {
  // Remove old marker
  if (propertyMarker) {
    propertyMarker.remove();
  }

  // Add new marker at property centroid
  const marker = new mapboxgl.Marker({
    color: '#E9E778', // Brand lime
    scale: 1.2,
  })
    .setLngLat([propertyData.center.lng, propertyData.center.lat])
    .setPopup(
      new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div class="text-sm">
          <strong>${propertyData.address}</strong><br/>
          <span class="text-zinc-400">
            ${propertyData.dimensions.lotSizeSqm.toFixed(0)}m² | ${propertyData.statutory.zoneCode}
          </span>
        </div>`
      )
    )
    .addTo(mapRef.current!);

  setPropertyMarker(marker);
  onPropertySelect?.(propertyData);
};
```

## Step 7: Add Neighboring Parcel Click

Allow users to click neighboring properties:

```typescript
// Add custom layer for property boundaries
useEffect(() => {
  if (!mapRef.current) return;

  const map = mapRef.current;

  map.on('load', () => {
    // Add property parcel layer (if you have GeoJSON data)
    map.addLayer({
      id: 'property-parcels',
      type: 'line',
      source: {
        type: 'geojson',
        data: '/api/parcels/geojson', // Your parcel boundary endpoint
      },
      paint: {
        'line-color': '#52525b', // zinc-600
        'line-width': 1,
        'line-opacity': 0.5,
      },
    });

    // Highlight on hover
    map.on('mousemove', 'property-parcels', (e) => {
      if (e.features && e.features.length > 0) {
        map.getCanvas().style.cursor = 'pointer';
        
        // Highlight hovered parcel
        map.setPaintProperty('property-parcels', 'line-color', [
          'case',
          ['==', ['get', 'pfi'], e.features[0].properties.pfi],
          '#E9E778', // lime
          '#52525b', // zinc-600
        ]);
      }
    });

    map.on('mouseleave', 'property-parcels', () => {
      map.getCanvas().style.cursor = '';
      map.setPaintProperty('property-parcels', 'line-color', '#52525b');
    });

    // Click handler for parcel layer
    map.on('click', 'property-parcels', (e) => {
      if (e.features && e.features.length > 0) {
        const pfi = e.features[0].properties.pfi;
        
        // Fetch property by PFI instead of coordinates
        analyze({ propId: pfi });
      }
    });
  });
}, [analyze]);
```

## Complete Example

Here's a complete integration example:

```typescript
'use client';

import { useState, useEffect } from 'react';
import MapPreview from '@/components/MapPreview';
import PropertySidePanel from '@/components/dashboard/PropertySidePanel';
import { usePropertyAnalysis, type PropertyAnalysisData } from '@/hooks/usePropertyAnalysis';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function PropertyAnalysisPage() {
  const [selectedProperty, setSelectedProperty] = useState<PropertyAnalysisData | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([144.9631, -37.8136]);

  const { analyze, loading, error } = usePropertyAnalysis({
    onSuccess: (data) => {
      setSelectedProperty(data);
      setMapCenter([data.center.lng, data.center.lat]);
      toast.success(`Loaded: ${data.address}`);
    },
    onError: (error) => {
      if (error.error === 'Property not found') {
        toast.error('No property at this location');
      } else {
        toast.error('Failed to load property', {
          description: error.details,
        });
      }
    },
  });

  const handleMapClick = async (lat: number, lng: number) => {
    await analyze({ lat, lng });
  };

  return (
    <div className="relative flex h-screen bg-[#241F21]">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-[#E9E778] animate-spin" />
            <span className="text-white font-medium">Analyzing property...</span>
          </div>
        </div>
      )}

      {/* Left Panel */}
      <PropertySidePanel
        address={selectedProperty?.address || null}
        zoneCode={selectedProperty?.statutory.zoneCode || null}
        overlays={selectedProperty?.statutory.overlays || []}
        lotSize={selectedProperty?.dimensions.lotSizeSqm || null}
        frontage={selectedProperty?.dimensions.frontageMeters || null}
        lga={selectedProperty?.lga || null}
      />

      {/* Map */}
      <div className="flex-1">
        <MapPreview
          center={mapCenter}
          onMapClick={handleMapClick}
          selectedProperty={selectedProperty}
        />
      </div>

      {/* Right Panel (if needed) */}
      {selectedProperty && (
        <div className="w-96 bg-zinc-900 border-l border-zinc-800 p-6 overflow-y-auto">
          <h2 className="text-white text-lg font-bold mb-4">Analysis</h2>
          
          {/* Feasibility */}
          {selectedProperty.feasibility.ssdEligible && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-4">
              <p className="text-emerald-400 font-semibold">SSD Eligible</p>
              <p className="text-zinc-400 text-sm mt-1">
                {selectedProperty.feasibility.highestBestUse}
              </p>
            </div>
          )}

          {/* Risk Factors */}
          {selectedProperty.feasibility.riskFactors.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
              <p className="text-orange-400 font-semibold mb-2">Risk Factors</p>
              <ul className="text-zinc-400 text-sm space-y-1">
                {selectedProperty.feasibility.riskFactors.map((risk, i) => (
                  <li key={i}>• {risk}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Performance Optimization

### Debounce Rapid Clicks

```typescript
import { useCallback } from 'react';
import { debounce } from 'lodash';

const debouncedAnalyze = useCallback(
  debounce(async (lat: number, lng: number) => {
    await analyze({ lat, lng });
  }, 300), // Wait 300ms after last click
  [analyze]
);
```

### Cache Recent Lookups

```typescript
const propertyCache = useRef<Map<string, PropertyAnalysisData>>(new Map());

const handleMapClick = async (lat: number, lng: number) => {
  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  
  // Check cache first
  if (propertyCache.current.has(cacheKey)) {
    setSelectedProperty(propertyCache.current.get(cacheKey)!);
    return;
  }
  
  // Fetch and cache
  const data = await analyze({ lat, lng });
  if (data) {
    propertyCache.current.set(cacheKey, data);
  }
};
```

## Testing

### Test Map Click Flow

```bash
# Start dev server
npm run dev

# Open browser console and test
fetch('/api/properties/analyze?lat=-37.8136&lng=144.9631')
  .then(r => r.json())
  .then(console.log);
```

### Test Error Handling

```bash
# Test invalid coordinates (outside Victoria)
fetch('/api/properties/analyze?lat=0&lng=0')
  .then(r => r.json())
  .then(console.log);

# Test missing parameters
fetch('/api/properties/analyze')
  .then(r => r.json())
  .then(console.log);
```
