# Mapbox Custom Style Integration - Setup Guide

## ✅ Implementation Complete

The zone click pipeline has been successfully integrated into your application. Here's what was implemented:

### Changes Made

1. **`src/app/app/page.tsx`**
   - ✅ Added import for `MapClickResult` and `ComplianceEvaluation` types
   - ✅ Added `CUSTOM_ZONING_LAYER_IDS` configuration constant (lines 72-80)
   - ✅ Implemented `handleZoneClick()` handler (lines 1331-1356)
   - ✅ Wired up `customLayerIds` and `onZoneClick` props to MapPreviewMemoized
   - ✅ Updated memoization comparison to include new props

2. **`src/components/MapPreview.tsx`** (already complete from earlier)
   - ✅ Has `customLayerIds` and `onZoneClick` props
   - ✅ Zone detection logic in `handleClick()` function
   - ✅ Custom style integration via `getMapStyle()` function

3. **`src/lib/mapClickPipeline.ts`** (already complete from earlier)
   - ✅ `queryMapAtClick()` - Extracts zone data from map layers
   - ✅ `evaluatePlanningCompliance()` - VPP compliance router
   - ✅ `handleMapClick()` - Combined helper function

## 🎯 Next Steps: Find Your Layer IDs

Your custom Mapbox style is already configured, but you need to identify the layer IDs containing zoning data.

### Step 1: Open Mapbox Studio

1. Go to https://studio.mapbox.com
2. Sign in with your account (pikachu12345)
3. Navigate to **Styles** in the sidebar
4. Find your style: **cmqp7w2jj004z01su4vy41nya**
5. Click to open it in the editor

### Step 2: Inspect Layers

1. In the Mapbox Studio editor, click the **Layers** icon on the left sidebar (looks like stacked layers)
2. You'll see a list of all layers in your style
3. Look for layers that contain zoning or planning data

**Common layer naming patterns to look for:**
- `vicmap-planning-zones`
- `planning-zones-fill`
- `planning-zones-outline`
- `zoning-polygons`
- `vicmap-overlays`
- `overlay-heritage`
- `overlay-bushfire`
- Any layer with "zone", "planning", "overlay" in the name

### Step 3: Find Layer IDs

For each relevant layer:
1. Click on the layer name in the Layers panel
2. The right panel will show layer properties
3. At the top, you'll see **Layer ID** (e.g., `vicmap-planning-zones`)
4. Copy this ID

**Screenshot guide:**
```
Layers Panel (Left)          Layer Properties (Right)
┌──────────────────┐        ┌─────────────────────────┐
│ ☰ Layers         │        │ Layer ID:               │
│                  │        │ vicmap-planning-zones   │ ← Copy this
│ ☑ Background     │        │                         │
│ ☑ Water          │        │ Type: Fill              │
│ ☑ vicmap-plan... │ ←Click │ Source: vicmap-data     │
│ ☑ Roads          │        │                         │
└──────────────────┘        └─────────────────────────┘
```

### Step 4: Update Configuration

Open `src/app/app/page.tsx` and find the `CUSTOM_ZONING_LAYER_IDS` constant (around line 72).

Replace the empty array with your layer IDs:

```typescript
const CUSTOM_ZONING_LAYER_IDS: string[] = [
  'vicmap-planning-zones',      // Replace with your actual layer ID
  'vicmap-planning-overlays',   // Add more layer IDs as needed
];
```

**Example configurations:**

If you have separate fill and outline layers:
```typescript
const CUSTOM_ZONING_LAYER_IDS: string[] = [
  'planning-zones-fill',    // Main zoning polygons
  'planning-overlays-fill', // Overlay polygons
];
```

If you have one combined layer:
```typescript
const CUSTOM_ZONING_LAYER_IDS: string[] = [
  'vicmap-planning-combined',
];
```

### Step 5: Verify Layer Properties

Click on a zoning layer and check the **Data** tab to see what properties are available.

**Required properties** (the pipeline looks for these):
- `ZONE_CODE` or `zone_code` or `ZONE` - Zone classification (e.g., "GRZ1", "NRZ2")
- `OVERLAY` or `overlay` - Overlay codes (e.g., "HO123,BMO")

**Optional properties** (nice to have):
- `SPI` or `PARCEL_SPI` - Standard Parcel Identifier
- `LOT_NUMBER` - Lot number
- `LGA_NAME` or `COUNCIL_NAME` - Council name

If your properties use different names, you can update the extraction logic in `src/lib/mapClickPipeline.ts` (line 50-80).

## 🧪 Testing

Once you've added the layer IDs, test the integration:

### 1. Start Development Server
```bash
npm run dev
```

### 2. Open Browser Console
Press F12 to open developer tools

### 3. Navigate to a Property
Go to `http://localhost:3000/app?address=123%20Melbourne%20St`

### 4. Click a Zoned Parcel on the Map
You should see console logs like:
```
[MapPreview] Zone clicked: { zoneCode: "GRZ1", pathway: "ssd-eligible", coordinates: [...] }
[ZoneClick] Zone detected from custom layer: { ... }
```

### 5. Verify UI Updates
- Check that the zone code appears in the PropertySidePanel
- Verify SSD eligibility badge shows correct status
- Confirm compliance pathway is correctly evaluated

## 🔧 Troubleshooting

### No console logs when clicking
**Cause**: Layer IDs don't match actual layer names in your style
**Fix**: Double-check layer IDs in Mapbox Studio, ensure exact spelling

### "No features found at click point"
**Cause**: Layers may be hidden at current zoom level
**Fix**: Zoom in closer (zoom > 14) or check layer visibility settings in Mapbox Studio

### Zone code is null
**Cause**: Property names don't match expected patterns
**Fix**: Check layer data properties in Mapbox Studio, update extraction logic in `mapClickPipeline.ts` if needed

### Style not loading
**Cause**: Access token or style URL incorrect
**Fix**: Verify `.env.local` has correct values:
```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here
NEXT_PUBLIC_MAPBOX_STYLE_LIGHT=mapbox://styles/pikachu12345/cmqp7w2jj004z01su4vy41nya
```

## 🎨 How It Works

```
User clicks map
    ↓
MapPreview.handleClick() detects click point
    ↓
Queries customLayerIds for features at click point
    ↓
Extracts ZONE_CODE and OVERLAY properties
    ↓
Routes through evaluatePlanningCompliance()
    ↓
Returns ComplianceEvaluation with:
    - pathway: 'ssd-eligible' | 'residential-special' | ...
    - isSSDEligible: boolean
    - overlayRisks: string[]
    - recommendedAction: string
    ↓
handleZoneClick() updates planData state
    ↓
UI components react to state change
    - PropertySidePanel shows zone info
    - SsdBadge shows eligibility
    - Yield calculations update
```

## 🚀 Current State

**✅ Ready to use** (once layer IDs are added)
- Custom Mapbox style is configured
- Click pipeline is integrated
- Handler is wired up
- Memoization prevents unnecessary re-renders

**⏳ Waiting for:** Your layer IDs from Mapbox Studio

**🔄 Fallback behavior:** If `CUSTOM_ZONING_LAYER_IDS` is empty, the existing Vicmap API flow continues to work normally.

## 📚 Additional Resources

- **Integration examples**: `src/lib/mapClickPipeline.example.tsx`
- **Full API docs**: `docs/MAP_CLICK_PIPELINE.md`
- **Pipeline source**: `src/lib/mapClickPipeline.ts`
- **MapPreview component**: `src/components/MapPreview.tsx`

## 🎯 Expected Behavior After Setup

1. **Instant zone detection**: Click → zone code extracted in <10ms (no API call)
2. **Compliance routing**: Automatically determines SSD eligibility
3. **Overlay risk detection**: Flags HO, BMO, LSIO, and other high-risk overlays
4. **State synchronization**: Updates all UI components automatically
5. **Backward compatible**: Falls back to Vicmap API if layer IDs not configured

---

**Need help?** Check the console logs when clicking the map - they'll show you exactly what the pipeline is detecting.
