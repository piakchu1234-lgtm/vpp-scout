/**
 * MAP CLICK PIPELINE - INTEGRATION EXAMPLE
 *
 * This example shows how to integrate the intelligent zone detection
 * pipeline into your main app page (src/app/app/page.tsx)
 */

import { MapPreview } from '@/components/MapPreview';
import type { MapClickResult, ComplianceEvaluation } from '@/lib/mapClickPipeline';
import { useState } from 'react';

export function ExampleMapIntegration() {
  const [zoneAnalysis, setZoneAnalysis] = useState<ComplianceEvaluation | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  /**
   * STEP 1: Define your custom Mapbox Studio layer IDs
   *
   * These are the layer IDs from your custom style at:
   * mapbox://styles/pikachu12345/cmqp7w2jj004z01su4vy41nya
   *
   * To find your layer IDs:
   * 1. Open Mapbox Studio
   * 2. Navigate to your style
   * 3. Click on each layer to see its ID
   * 4. Look for layers containing zone/planning data (e.g., 'vicmap-planning-zones', 'zoning-layer')
   */
  const customLayerIds = [
    'your-zoning-layer-id',      // Replace with actual layer ID from your style
    'your-overlay-layer-id',     // Replace with actual overlay layer ID
    // Add more layer IDs as needed
  ];

  /**
   * STEP 2: Handle zone click events
   *
   * This callback receives:
   * - clickResult: Raw data from the clicked map feature
   * - compliance: VPP compliance evaluation with pathway routing
   */
  function handleZoneClick(
    clickResult: MapClickResult,
    compliance: ComplianceEvaluation
  ) {
    console.log('🎯 Zone clicked!', {
      zoneCode: compliance.zoneCode,
      pathway: compliance.pathway,
      isSSDEligible: compliance.isSSDEligible,
      coordinates: clickResult.coordinates,
    });

    // Update state to trigger UI changes
    setZoneAnalysis(compliance);
    setShowSidebar(true);

    // ROUTING LOGIC: Trigger different UI based on pathway
    switch (compliance.pathway) {
      case 'ssd-eligible':
        // Open SSD feasibility sidebar
        console.log('✅ SSD Eligible - Opening feasibility calculator');
        // triggerSSDFeasibilityPanel(compliance);
        break;

      case 'residential-special':
        // Show overlay warning panel
        console.log('⚠️ Special overlays detected - Showing risk assessment');
        // triggerOverlayRiskPanel(compliance);
        break;

      case 'commercial':
      case 'mixed-use':
        // Show commercial analysis
        console.log('🏢 Commercial zone - Opening commercial feasibility');
        // triggerCommercialPanel(compliance);
        break;

      case 'residential-standard':
        // Standard residential analysis
        console.log('🏘️ Standard residential - Opening ResCode calculator');
        // triggerResCodePanel(compliance);
        break;

      default:
        // Show manual assessment required
        console.log('❓ Unknown zone - Manual assessment required');
        // showManualAssessmentPrompt(compliance);
    }
  }

  return (
    <div className="flex h-screen">
      {/* Map Container */}
      <div className="flex-1">
        <MapPreview
          lat={-37.8136}
          lon={144.9631}
          customLayerIds={customLayerIds}
          onZoneClick={handleZoneClick}
          // ... other props
        />
      </div>

      {/* Analysis Sidebar (triggered by zone click) */}
      {showSidebar && zoneAnalysis && (
        <div className="w-96 border-l border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xl font-bold mb-4">Zone Analysis</h2>

          {/* Zone Code Display */}
          <div className="mb-4">
            <span className="text-xs uppercase text-zinc-500">Zone Code</span>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {zoneAnalysis.zoneCode}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {zoneAnalysis.zoneDescription}
            </p>
          </div>

          {/* SSD Eligibility Badge */}
          {zoneAnalysis.isSSDEligible ? (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 dark:bg-green-950 dark:border-green-800">
              <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                ✅ Small Second Dwelling (SSD) Eligible
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                Proceed with lot size and frontage checks
              </p>
            </div>
          ) : (
            <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950 dark:border-amber-800">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                ⚠️ Planning Permit Required
              </p>
            </div>
          )}

          {/* Overlay Risks */}
          {zoneAnalysis.overlayRisks.length > 0 && (
            <div className="mb-4">
              <span className="text-xs uppercase text-zinc-500">Overlays Detected</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {zoneAnalysis.overlayRisks.map((overlay, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
                  >
                    {overlay}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Action */}
          <div className="mb-4">
            <span className="text-xs uppercase text-zinc-500">Recommended Action</span>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-2">
              {zoneAnalysis.recommendedAction}
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setShowSidebar(false)}
            className="w-full rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * INTEGRATION CHECKLIST:
 *
 * 1. ✅ Install the click pipeline (mapClickPipeline.ts)
 * 2. ✅ Update MapPreview component with customLayerIds and onZoneClick props
 * 3. ⚠️ Find your Mapbox Studio layer IDs
 *    - Open https://studio.mapbox.com
 *    - Navigate to style: pikachu12345/cmqp7w2jj004z01su4vy41nya
 *    - Click layers panel and note layer IDs containing zone data
 * 4. ⚠️ Add customLayerIds to MapPreview in your page.tsx
 * 5. ⚠️ Implement handleZoneClick callback
 * 6. ⚠️ Wire up UI panels based on compliance.pathway
 * 7. ⚠️ Test by clicking zones on the map
 */

/**
 * ALTERNATIVE: If you don't have custom zone layers yet
 *
 * You can still use the click pipeline with Vicmap API fallback:
 */
export function ExampleWithVicmapFallback() {
  async function handleMapClick(coordinates: [number, number]) {
    // Import your existing Vicmap API functions
    const { fetchVicPlanForPoint } = await import('@/lib/vicPlanApi');

    try {
      const planData = await fetchVicPlanForPoint(coordinates[0], coordinates[1]);

      if (planData) {
        // Manually create compliance evaluation
        const { evaluatePlanningCompliance } = await import('@/lib/mapClickPipeline');
        const compliance = evaluatePlanningCompliance(
          planData.zoneCode,
          planData.overlayRaw || []
        );

        console.log('Zone data from Vicmap API:', compliance);
        // Trigger your UI updates here
      }
    } catch (error) {
      console.error('Failed to fetch zone data:', error);
    }
  }

  return (
    <MapPreview
      lat={-37.8136}
      lon={144.9631}
      onMapClick={handleMapClick}
      // No customLayerIds needed - uses Vicmap API instead
    />
  );
}
