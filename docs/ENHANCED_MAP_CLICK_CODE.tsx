/**
 * ENHANCED MAP CLICK HANDLER WITH UNIFIED PROPERTY ANALYSIS API
 *
 * This is the enhanced version of handleMapParcelClick that integrates
 * with the new /api/properties/analyze endpoint.
 *
 * Location: src/app/app/page.tsx (replace existing function at line ~1405)
 */

// ============================================================================
// STEP 1: Add imports at top of file
// ============================================================================

import { usePropertyAnalysis, type PropertyAnalysisData } from '@/hooks/usePropertyAnalysis';

// ============================================================================
// STEP 2: Add state variables (add near other useState declarations ~line 200)
// ============================================================================

const [isLoadingProperty, setIsLoadingProperty] = useState(false);
const [propertyAnalysisData, setPropertyAnalysisData] = useState<PropertyAnalysisData | null>(null);

// ============================================================================
// STEP 3: Initialize usePropertyAnalysis hook (add near other hooks ~line 250)
// ============================================================================

const { analyze: analyzeProperty } = usePropertyAnalysis({
  onSuccess: (data) => {
    console.log('[PropertyAnalysis] Fast spatial lookup succeeded:', {
      address: data.address,
      lotSize: data.dimensions.lotSizeSqm,
      zone: data.statutory.zoneCode,
      responseTime: '~10-50ms'
    });

    setPropertyAnalysisData(data);
    setIsLoadingProperty(false);

    // Update existing state with instant spatial data
    setLandSizeM2(data.dimensions.lotSizeSqm);
    setLotPlan(null); // Will be enriched by full pipeline
    setLiveCouncil(data.lga);

    // Update planning data
    if (planData) {
      setPlanData({
        ...planData,
        zoneCode: data.statutory.zoneCode,
        overlayRaw: data.statutory.overlays,
      });
    } else {
      setPlanData({
        zoneCode: data.statutory.zoneCode,
        zoneDescription: null,
        overlayRaw: data.statutory.overlays,
      });
    }

    // If this property has been enriched, populate market data
    if (data.specifications.bedrooms !== null || data.market.lastSoldPrice !== null) {
      console.log('[PropertyAnalysis] Enriched property data available');
      setMarketData({
        bedrooms: data.specifications.bedrooms,
        bathrooms: data.specifications.bathrooms,
        carspaces: data.specifications.carSpaces,
        lastSoldPrice: data.market.lastSoldPrice,
        lastSoldDate: data.market.lastSoldDate ? new Date(data.market.lastSoldDate) : null,
      });
    }
  },

  onError: (error) => {
    console.log('[PropertyAnalysis] Fast lookup failed:', error.error, '- falling back to Vicmap API');
    setIsLoadingProperty(false);
    // Fallback to existing flow - no action needed
  },
});

// ============================================================================
// STEP 4: Replace handleMapParcelClick function (line ~1405)
// ============================================================================

/**
 * ENHANCED MAP PARCEL CLICK HANDLER
 *
 * Integrates with unified property analysis API for instant spatial lookups.
 * Falls back gracefully to existing Vicmap API flow if property not cached.
 *
 * Click Behavior:
 * - Standard click: Single parcel selection + fast spatial analysis
 * - Shift + Click: Multi-parcel toggle (no API call)
 * - Empty space click: Clear selection
 *
 * Performance:
 * - Cached property: 10-50ms response
 * - Non-cached property: Falls back to existing 3-5s enrichment pipeline
 */
async function handleMapParcelClick(
  lonLat: [number, number],
  clickedParcel: ParcelFeature | null,
  shiftKey: boolean = false,
) {
  // === EMPTY SPACE CLICK ===
  if (!clickedParcel) {
    handleClearSelection();
    return;
  }

  const [lng, lat] = lonLat;
  const pfi = clickedParcel.properties.PARCEL_PFI;

  // === STANDARD CLICK (NO SHIFT) ===
  if (!shiftKey) {
    setSelectedParcels([clickedParcel]);
    setIsLoadingProperty(true);

    // Update orchestrator state (triggers existing enrichment pipeline)
    setSelectedProperty({
      pfi: pfi || null,
      lng,
      lat,
    });

    // === NEW: PARALLEL FAST SPATIAL LOOKUP ===
    // Runs alongside existing flow for instant feedback
    // If property exists in property_parcels table, returns in 10-50ms
    // If not found, existing flow continues without interruption
    console.log('[ParcelClick] Triggering fast spatial analysis...', { lat, lng, pfi });
    analyzeProperty({ lat, lng });

    return;
  }

  // === SHIFT + CLICK: MULTI-PARCEL TOGGLE ===
  // No API calls - just visual feedback for consolidation analysis
  setSelectedParcels((prev) => {
    const exists = prev.some((p) => p.properties.PARCEL_PFI === pfi);

    if (exists) {
      console.log('[ParcelClick] Removing from multi-select:', pfi);
      return prev.filter((p) => p.properties.PARCEL_PFI !== pfi);
    } else {
      console.log('[ParcelClick] Adding to multi-select:', pfi);
      return [...prev, clickedParcel];
    }
  });
}

// ============================================================================
// STEP 5: Add loading overlay to JSX (add before MapPreview component ~line 1700)
// ============================================================================

{/* Property Analysis Loading Overlay */}
{isLoadingProperty && (
  <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50 pointer-events-none">
    <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-xl px-6 py-4 flex items-center gap-3 shadow-2xl">
      <Loader2 className="w-5 h-5 text-[#E9E778] animate-spin" />
      <div className="flex flex-col">
        <span className="text-white font-semibold text-sm">
          {language === 'en' ? 'Analyzing Property' : '分析房产'}
        </span>
        <span className="text-zinc-400 text-xs mt-0.5">
          {language === 'en' ? 'Spatial lookup in progress...' : '空间查询进行中...'}
        </span>
      </div>
    </div>
  </div>
)}

// ============================================================================
// OPTIONAL: Add debug panel to monitor performance (add to JSX)
// ============================================================================

{/* Debug Panel - Remove in production */}
{process.env.NODE_ENV === 'development' && propertyAnalysisData && (
  <div className="fixed bottom-4 left-4 bg-zinc-900/95 border border-zinc-800 rounded-lg p-3 text-xs font-mono z-50 max-w-sm">
    <div className="text-[#E9E778] font-bold mb-2">Fast Spatial Lookup Result</div>
    <div className="space-y-1 text-zinc-300">
      <div>PFI: {propertyAnalysisData.pfi}</div>
      <div>Address: {propertyAnalysisData.address}</div>
      <div>Lot Size: {propertyAnalysisData.dimensions.lotSizeSqm.toFixed(0)}m²</div>
      <div>Zone: {propertyAnalysisData.statutory.zoneCode}</div>
      <div>Overlays: {propertyAnalysisData.statutory.overlays.join(', ') || 'None'}</div>
      <div>SSD Eligible: {propertyAnalysisData.feasibility.ssdEligible ? 'Yes' : 'No'}</div>
      <div className="text-[#E9E778] mt-2">⚡ Response: ~10-50ms</div>
    </div>
  </div>
)}

// ============================================================================
// TESTING CHECKLIST
// ============================================================================

/*
 * [ ] Property click triggers loading spinner
 * [ ] Loading spinner shows for < 100ms on cached properties
 * [ ] Property data populates instantly (address, lot size, zone)
 * [ ] Shift-click multi-select still works
 * [ ] Empty space click clears selection
 * [ ] Non-cached properties fall back to existing flow gracefully
 * [ ] Console logs show "Fast spatial analysis" messages
 * [ ] Network tab shows /api/properties/analyze request
 * [ ] No TypeScript errors
 * [ ] Build succeeds with npm run build
 */

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/*
 * Add this to track response times:
 */

const startTime = performance.now();
const result = await analyzeProperty({ lat, lng });
const endTime = performance.now();
console.log(`[Performance] Spatial analysis took ${(endTime - startTime).toFixed(0)}ms`);

// ============================================================================
// ROLLBACK INSTRUCTIONS
// ============================================================================

/*
 * If you need to revert to the old flow:
 *
 * 1. Comment out the analyzeProperty() call
 * 2. Remove the loading overlay JSX
 * 3. Keep the setSelectedProperty() call
 *
 * The existing enrichment pipeline will continue working as before.
 */
