# Map Click-Event Pipeline

Intelligent spatial query system for extracting zoning data and routing to Victorian Planning Provisions (VPP) compliance pathways.

## Architecture

```
User Click → queryRenderedFeatures() → Extract Zone/Overlays → VPP Router → UI Panels
```

## Files

- **`src/lib/mapClickPipeline.ts`** - Core pipeline logic
- **`src/lib/mapClickPipeline.example.tsx`** - Integration examples
- **`src/components/MapPreview.tsx`** - Updated with `customLayerIds` and `onZoneClick` props

## Features

### 1. Spatial Query (`queryMapAtClick`)
Queries Mapbox GL map at click point and extracts:
- Zone codes (GRZ, NRZ, RGZ, etc.)
- Overlay codes (HO, BMO, LSIO, etc.)
- Parcel identifiers (SPI, lot/plan numbers)
- Council names
- All raw feature properties

### 2. VPP Compliance Router (`evaluatePlanningCompliance`)
Routes zone codes to planning pathways:

| Pathway | Zones | Description |
|---------|-------|-------------|
| `ssd-eligible` | GRZ, NRZ (no high-risk overlays) | Small Second Dwelling pathway |
| `residential-special` | GRZ, NRZ (with HO/BMO/LSIO) | Requires overlay assessment |
| `residential-standard` | RGZ | Multi-dwelling development |
| `commercial` | C1Z, C2Z, CCZ | Commercial zones |
| `mixed-use` | MUZ | Mixed-use development |
| `industrial` | INZ, IN1Z, IN2Z, IN3Z | Industrial zones |
| `rural` | RLZ, FZ, RAZ | Rural zones |
| `public-land` | PPRZ, PUZ, PCRZ | Public land |
| `unknown` | Other | Manual assessment required |

### 3. High-Risk Overlay Detection
Automatically flags overlays that block SSD or require complex approval:
- **HO** - Heritage Overlay
- **BMO** - Bushfire Management Overlay
- **LSIO/FO** - Land Subject to Inundation / Floodway Overlay
- **SBO** - Salinity Overlay
- **VPO** - Vegetation Protection Overlay
- **ESO1/ESO2** - Environmental Significance Overlay

## Quick Start

### Option 1: Custom Mapbox Studio Layers (Recommended)

If you've uploaded zoning vector tiles to Mapbox Studio:

```tsx
import { MapPreview } from '@/components/MapPreview';
import type { MapClickResult, ComplianceEvaluation } from '@/lib/mapClickPipeline';

function MyPage() {
  const customLayerIds = [
    'vicmap-planning-zones',  // Your layer ID from Mapbox Studio
    'vicmap-overlays',        // Your overlay layer ID
  ];

  function handleZoneClick(
    clickResult: MapClickResult,
    compliance: ComplianceEvaluation
  ) {
    console.log('Zone clicked:', compliance.zoneCode);
    console.log('SSD Eligible:', compliance.isSSDEligible);
    console.log('Pathway:', compliance.pathway);

    // Route to appropriate UI based on pathway
    if (compliance.pathway === 'ssd-eligible') {
      openSSDFeasibilityPanel();
    } else if (compliance.pathway === 'residential-special') {
      showOverlayWarning(compliance.overlayRisks);
    }
  }

  return (
    <MapPreview
      lat={-37.8136}
      lon={144.9631}
      customLayerIds={customLayerIds}
      onZoneClick={handleZoneClick}
    />
  );
}
```

### Option 2: Vicmap API Fallback

If you don't have custom layers, use existing Vicmap API:

```tsx
import { MapPreview } from '@/components/MapPreview';
import { fetchVicPlanForPoint } from '@/lib/vicPlanApi';
import { evaluatePlanningCompliance } from '@/lib/mapClickPipeline';

function MyPage() {
  async function handleMapClick(coordinates: [number, number]) {
    const planData = await fetchVicPlanForPoint(coordinates[0], coordinates[1]);
    
    if (planData) {
      const compliance = evaluatePlanningCompliance(
        planData.zoneCode,
        planData.overlayRaw?.split(',') || []
      );
      
      console.log('Compliance:', compliance);
    }
  }

  return (
    <MapPreview
      lat={-37.8136}
      lon={144.9631}
      onMapClick={handleMapClick}
    />
  );
}
```

## Finding Your Mapbox Studio Layer IDs

1. Open https://studio.mapbox.com
2. Navigate to your style: `mapbox://styles/pikachu12345/cmqp7w2jj004z01su4vy41nya`
3. Click **Layers** panel on the left
4. Find layers containing zoning data (usually from Vicmap Planning source)
5. Click each layer to see its **Layer ID** in the properties panel
6. Common layer naming patterns:
   - `vicmap-planning-zones`
   - `zoning-fill` / `zoning-line`
   - `overlay-heritage` / `overlay-bushfire`

## API Reference

### `queryMapAtClick(map, point, customLayerIds?)`

Queries rendered features at click point.

**Parameters:**
- `map` - Mapbox GL map instance
- `point` - Click coordinates `{ x: number, y: number }`
- `customLayerIds` - Optional array of layer IDs to filter query

**Returns:** `MapClickResult`
```typescript
{
  success: boolean;
  properties: {
    zoneCode: string | null;
    overlays: string[];
    spi?: string;
    lotNumber?: string;
    councilName?: string;
  } | null;
  coordinates: [number, number];
  layerId?: string;
  error?: string;
}
```

### `evaluatePlanningCompliance(zoneCode, overlays)`

Routes zone code to VPP compliance pathway.

**Parameters:**
- `zoneCode` - Zone code string (e.g., "GRZ1", "NRZ2")
- `overlays` - Array of overlay codes (e.g., ["HO123", "BMO"])

**Returns:** `ComplianceEvaluation`
```typescript
{
  pathway: CompliancePathway;
  zoneCode: string;
  zoneDescription: string;
  isSSDEligible: boolean;
  requiresPlanningPermit: boolean | 'unknown';
  overlayRisks: string[];
  recommendedAction: string;
}
```

### `handleMapClick(map, point, customLayerIds?)`

Combined helper that queries and evaluates in one call.

**Returns:**
```typescript
{
  clickResult: MapClickResult;
  compliance: ComplianceEvaluation | null;
}
```

## Extending the Router

To add custom zone classifications, edit `evaluatePlanningCompliance()`:

```typescript
// Add new pathway type
export type CompliancePathway = 
  | 'ssd-eligible'
  | 'my-custom-pathway'  // Add here
  | ...;

// Add routing logic
export function evaluatePlanningCompliance(zoneCode, overlays) {
  if (code.startsWith('CUSTOM')) {
    return {
      pathway: 'my-custom-pathway',
      zoneCode: code,
      zoneDescription: 'Custom Zone Type',
      isSSDEligible: false,
      requiresPlanningPermit: true,
      overlayRisks: [],
      recommendedAction: 'Custom assessment logic',
    };
  }
  // ... existing logic
}
```

## UI Integration Patterns

### Pattern 1: Sidebar Panel
```tsx
const [analysis, setAnalysis] = useState<ComplianceEvaluation | null>(null);

<MapPreview 
  onZoneClick={(_, compliance) => setAnalysis(compliance)} 
/>

{analysis && <SidebarPanel analysis={analysis} />}
```

### Pattern 2: Modal Dialog
```tsx
const [showModal, setShowModal] = useState(false);

<MapPreview 
  onZoneClick={() => setShowModal(true)} 
/>

{showModal && <ZoneAnalysisModal />}
```

### Pattern 3: In-Place Tooltip
```tsx
const [tooltip, setTooltip] = useState<{x: number, y: number, data: any} | null>(null);

<MapPreview 
  onZoneClick={(clickResult, compliance) => {
    setTooltip({ 
      x: clickResult.coordinates[0], 
      y: clickResult.coordinates[1], 
      data: compliance 
    });
  }} 
/>
```

## Debugging

Enable console logging to trace pipeline execution:

```typescript
// In mapClickPipeline.ts, all functions log to console:
console.log('[MapClickPipeline] Feature extracted:', { zoneCode, overlays });
console.log('[MapClickPipeline] Compliance evaluation:', { pathway, isSSDEligible });
```

Watch browser console when clicking the map to see:
1. Raw feature properties extracted
2. Zone code and overlays parsed
3. Compliance pathway selected
4. Recommended action

## Testing

Test the pipeline with known zones:

```typescript
import { evaluatePlanningCompliance } from '@/lib/mapClickPipeline';

// Test GRZ (should be SSD-eligible)
const grz = evaluatePlanningCompliance('GRZ1', []);
console.assert(grz.isSSDEligible === true);

// Test GRZ with Heritage Overlay (should require permit)
const grzHO = evaluatePlanningCompliance('GRZ1', ['HO123']);
console.assert(grzHO.pathway === 'residential-special');

// Test Commercial (should not be SSD-eligible)
const commercial = evaluatePlanningCompliance('C1Z', []);
console.assert(commercial.isSSDEligible === false);
```

## Performance

- **Zero re-renders**: Uses Mapbox native `queryRenderedFeatures()` API
- **Client-side only**: No API calls (if using custom layers)
- **Sub-10ms**: Click → compliance evaluation
- **Scales**: Works with 1000+ zones loaded in viewport

## Troubleshooting

### "No features found at click point"
- Ensure `customLayerIds` match actual layer IDs in your Mapbox Studio style
- Check layer visibility (may be hidden at certain zoom levels)
- Verify layers contain `ZONE_CODE` or similar properties

### Zone code is null
- Check property names in your vector tileset
- Pipeline looks for: `ZONE_CODE`, `zone_code`, `ZONE`, `zone`, `ZoneCode`
- Add custom property names in `queryMapAtClick()` if needed

### Compliance pathway is "unknown"
- Zone code format may not match router logic
- Add custom zone handling in `evaluatePlanningCompliance()`
- Log `zoneCode` to console to see raw value

## Next Steps

1. **Find your layer IDs** in Mapbox Studio
2. **Wire up UI panels** based on `compliance.pathway`
3. **Test with real parcels** across different zones
4. **Extend router** with project-specific logic
5. **Add analytics** to track which pathways users trigger most

---

**Architecture Decision:** This pipeline uses client-side spatial queries for instant feedback. For authoritative planning permit applications, always verify against the official planning scheme via Vicmap API or council records.
