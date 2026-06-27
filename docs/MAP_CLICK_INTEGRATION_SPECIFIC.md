# Map Click Integration - Implementation Guide

## Current State Analysis

Your `handleMapParcelClick` function (lines 1405-1442 in `src/app/app/page.tsx`) currently:
1. Handles multi-parcel selection with shift-click
2. Sets `selectedProperty` state with `{ pfi, lng, lat }`
3. Updates `selectedParcels` array for visual feedback

## Integration Steps

### Step 1: Add Property Analysis Hook

Add the import at the top of `src/app/app/page.tsx`:

```typescript
import { usePropertyAnalysis, type PropertyAnalysisData } from '@/hooks/usePropertyAnalysis';
```

### Step 2: Initialize Hook in Component

Add this near your other hooks (around line 200):

```typescript
const [isLoadingProperty, setIsLoadingProperty] = useState(false);
const [propertyAnalysisData, setPropertyAnalysisData] = useState<PropertyAnalysisData | null>(null);

const { analyze: analyzeProperty } = usePropertyAnalysis({
  onSuccess: (data) => {
    console.log('[PropertyAnalysis] Fast lookup succeeded:', data.address);
    setPropertyAnalysisData(data);
    setIsLoadingProperty(false);
    
    // Update existing state with analysis data
    setLandSizeM2(data.dimensions.lotSizeSqm);
    setPlanData({
      zoneCode: data.statutory.zoneCode,
      zoneDescription: null, // Will be enriched later
      overlayRaw: data.statutory.overlays,
    });
    setLiveCouncil(data.lga);
    
    // If enriched property data exists, populate market data
    if (data.specifications.bedrooms !== null) {
      // This property has been enriched - use the data
      setMarketData({
        bedrooms: data.specifications.bedrooms,
        bathrooms: data.specifications.bathrooms,
        lastSoldPrice: data.market.lastSoldPrice,
        lastSoldDate: data.market.lastSoldDate,
      });
    }
  },
  onError: (error) => {
    console.log('[PropertyAnalysis] Fast lookup failed:', error.error);
    setIsLoadingProperty(false);
    
    // Fallback: Continue with existing flow (Vicmap API calls)
    // The existing handleMapParcelClick logic will handle this
  },
});
```

### Step 3: Enhance handleMapParcelClick

Replace the existing `handleMapParcelClick` function (lines 1405-1442) with this enhanced version:

```typescript
async function handleMapParcelClick(
  lonLat: [number, number],
  clickedParcel: ParcelFeature | null,
  shiftKey: boolean = false,
) {
  // If no parcel was clicked (empty space), clear selection array
  if (!clickedParcel) {
    handleClearSelection();
    return;
  }

  const [lng, lat] = lonLat;

  // Standard click (no Shift): replace selection with single parcel
  if (!shiftKey) {
    setSelectedParcels([clickedParcel]);
    
    // === NEW: UNIFIED PROPERTY ANALYSIS API ===
    // Try fast spatial lookup first (10-50ms response)
    setIsLoadingProperty(true);
    
    const quickAnalysis = await analyzeProperty({ lat, lng });
    
    if (quickAnalysis) {
      // Success - we have instant spatial data from property_parcels table
      // The onSuccess callback will update all relevant state
      console.log('[ParcelClick] Fast spatial lookup succeeded');
      
      // Update orchestrator state for potential background enrichment
      setSelectedProperty({
        pfi: clickedParcel.properties.PARCEL_PFI || null,
        lng,
        lat,
      });
      
      return;
    }
    
    // If fast lookup failed (property not in property_parcels table),
    // fall back to existing Vicmap API flow
    console.log('[ParcelClick] Fast lookup failed - falling back to Vicmap API');
    setIsLoadingProperty(false);
    
    // Continue with existing orchestrator state update
    setSelectedProperty({
      pfi: clickedParcel.properties.PARCEL_PFI || null,
      lng,
      lat,
    });
    
    return;
  }

  // Shift + Click: toggle parcel in array for multi-site consolidation
  setSelectedParcels((prev) => {
    const pfi = clickedParcel.properties.PARCEL_PFI;
    const exists = prev.some((p) => p.properties.PARCEL_PFI === pfi);

    if (exists) {
      // Remove from array
      return prev.filter((p) => p.properties.PARCEL_PFI !== pfi);
    } else {
      // Add to array
      return [...prev, clickedParcel];
    }
  });
}
```

### Step 4: Add Loading Overlay

Add this loading indicator to your JSX (around line 1700, before the MapPreview component):

```typescript
{/* Property Analysis Loading Overlay */}
{isLoadingProperty && (
  <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50 pointer-events-none">
    <div className="bg-zinc-900/95 border border-zinc-800 rounded-xl px-6 py-4 flex items-center gap-3 shadow-xl">
      <Loader2 className="w-5 h-5 text-[#E9E778] animate-spin" />
      <span className="text-white font-medium">
        {language === 'en' ? 'Analyzing property...' : '分析房产中...'}
      </span>
    </div>
  </div>
)}
```

### Step 5: Update Dashboard Panels with Analysis Data

Modify your InsightPanel and PropertySidePanel to use the `propertyAnalysisData`:

```typescript
<InsightPanel
  // ... existing props
  
  // Add these new props
  quickAnalysis={propertyAnalysisData}
  isLoadingQuickAnalysis={isLoadingProperty}
/>
```

Then in `InsightPanel.tsx`, you can prioritize the quick analysis data:

```typescript
// Use quick analysis data if available, otherwise fall back to existing sources
const displayBedrooms = props.quickAnalysis?.specifications.bedrooms 
  ?? aiInsight?.beds 
  ?? marketData?.bedrooms;

const displayBathrooms = props.quickAnalysis?.specifications.bathrooms 
  ?? aiInsight?.baths 
  ?? marketData?.bathrooms;

const displayZoneCode = props.quickAnalysis?.statutory.zoneCode 
  ?? planData?.zoneCode;
```

## Alternative: Side-by-Side Approach (Recommended)

Instead of replacing the existing flow, run both in parallel:

```typescript
async function handleMapParcelClick(
  lonLat: [number, number],
  clickedParcel: ParcelFeature | null,
  shiftKey: boolean = false,
) {
  if (!clickedParcel) {
    handleClearSelection();
    return;
  }

  const [lng, lat] = lonLat;

  if (!shiftKey) {
    setSelectedParcels([clickedParcel]);
    setIsLoadingProperty(true);
    
    // Update orchestrator state (existing flow)
    setSelectedProperty({
      pfi: clickedParcel.properties.PARCEL_PFI || null,
      lng,
      lat,
    });
    
    // Run fast spatial analysis in parallel (NEW)
    // This will populate basic property data instantly (~10-50ms)
    // while the slower enrichment pipeline runs in the background
    analyzeProperty({ lat, lng });
    
    return;
  }

  // Shift-click logic unchanged
  setSelectedParcels((prev) => {
    const pfi = clickedParcel.properties.PARCEL_PFI;
    const exists = prev.some((p) => p.properties.PARCEL_PFI === pfi);
    return exists 
      ? prev.filter((p) => p.properties.PARCEL_PFI !== pfi)
      : [...prev, clickedParcel];
  });
}
```

This approach:
- ✅ Doesn't break existing flow
- ✅ Provides instant feedback (10-50ms)
- ✅ Still benefits from full enrichment pipeline
- ✅ Gracefully handles properties not in `property_parcels` table

## Testing

### Test 1: Click on Pre-Cached Property

```typescript
// Ensure property exists in property_parcels table first
// Then click on map - should see instant response
```

Expected behavior:
1. Loading spinner appears briefly (~10-50ms)
2. Basic property info populates instantly
3. Full enrichment may happen in background (if needed)

### Test 2: Click on Non-Cached Property

Expected behavior:
1. Fast lookup returns 404
2. Falls back to existing Vicmap API flow
3. Full enrichment pipeline runs (~3-5s)

### Test 3: Shift-Click Multi-Select

Expected behavior:
1. Multi-parcel selection still works
2. No API calls triggered (only visual feedback)

## Performance Comparison

| Scenario | Old Flow | New Flow |
|----------|----------|----------|
| Cached property | N/A | 10-50ms |
| Non-cached property | 3-5s (Vicmap + Domain + AI) | 10-50ms (fail) → 3-5s (fallback) |
| Multi-select | Instant | Instant |

## Debugging

Add console logs to track the flow:

```typescript
console.log('[ParcelClick] Clicked:', { lng, lat, pfi: clickedParcel.properties.PARCEL_PFI });
console.log('[ParcelClick] Starting fast analysis...');
// ... after analyzeProperty
console.log('[ParcelClick] Fast analysis result:', quickAnalysis ? 'SUCCESS' : 'FAILED');
```

Monitor Network tab:
- Look for `/api/properties/analyze?lat=...&lng=...`
- Should complete in < 100ms
- Check response structure matches `PropertyAnalysisData`

## Rollback Plan

If issues arise, simply remove the `analyzeProperty` call and revert to:

```typescript
setSelectedProperty({
  pfi: clickedParcel.properties.PARCEL_PFI || null,
  lng,
  lat,
});
```

The existing flow will continue working as before.
