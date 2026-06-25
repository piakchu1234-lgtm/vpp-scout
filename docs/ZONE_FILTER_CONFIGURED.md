# Zone Filter - Final Configuration Guide

## ✅ Configured for Your Mapbox Layer

The zone filter is now configured to work with your exact Mapbox layer structure:

```json
{
  "id": "Planning Scheme Zones",
  "type": "fill",
  "paint": {
    "fill-color": [
      "match",
      ["slice", ["get", "ZONE_CODE"], 0, 3],  // First 3 characters
      "GRZ", "#ffccd5",
      "NRZ", "#e8c4ff",
      // ... etc
    ]
  }
}
```

## 🎯 Key Configuration

Your layer uses **`["slice", ["get", "ZONE_CODE"], 0, 3]`** to extract the first 3 characters of zone codes. The filter now matches this pattern exactly.

### Zone Codes Mapped

Based on your layer configuration, here are all supported zone codes:

**Residential:**
- `GRZ` - General Residential Zone (#ffccd5 pink)
- `NRZ` - Neighbourhood Residential Zone (#e8c4ff purple)
- `RGZ` - Residential Growth Zone (#ff9999 red)
- `LDR` - Low Density Residential (#f3e5f5 light purple)
- `RLZ` - Rural Living Zone (#f8bbd0 pink)

**Commercial:**
- `C1Z` - Commercial 1 Zone (#b3e5fc light blue)
- `C2Z` - Commercial 2 Zone (#81d4fa blue)
- `C3Z` - Commercial 3 Zone (#29b6f6 darker blue)
- `CCZ` - Capital City Zone (#ffcc80 orange)
- `ACZ` - Activity Centre Zone (#ffb74d orange)

**Industrial:**
- `IN1` - Industrial 1 Zone (#e0e0e0 light grey)
- `IN2` - Industrial 2 Zone (#bdbdbd grey)
- `IN3` - Industrial 3 Zone (#9e9e9e dark grey)

**Mixed Use & Urban:**
- `MUZ` - Mixed Use Zone (#ffe0b2 peach)
- `UGZ` - Urban Growth Zone (#ffe082 yellow)
- `CDZ` - Comprehensive Development Zone (#fff176 bright yellow)
- `DZ`, `DZ1`, `DZ2` - Docklands Zone (#ffa726 orange)
- `PDZ` - Priority Development Zone (#ffee58 yellow)
- `HCT` - Housing Choice and Transport Zone (#ce93d8 purple)

**Rural & Farming:**
- `FZ`, `FZ1`, `FZ2`, `FZ3` - Farming Zone (#e8f5e9 light green)
- `RAZ` - Rural Activity Zone (#d1c4e9 light purple)
- `RCZ` - Rural Conservation Zone (#c8e6c9 green)

**Special Use & Public:**
- `SUZ` - Special Use Zone (#fff59d yellow)
- `PUZ` - Public Use Zone (#fff9c4 cream)
- `PPR` - Public Park and Recreation Zone (#c8e6c9 green)
- `PCR` - Public Conservation and Resource Zone (#a5d6a7 green)
- `TRZ` - Transport Zone (#cfd8dc grey)
- `TZ`, `TZ1`, `TZ2` - Township Zone (#fff3e0 cream)
- `GWZ` - Green Wedge Zone (#bbdefb blue)
- `GWA` - Green Wedge A Zone (#e3f2fd light blue)
- `UFZ` - Urban Floodway Zone (#b2ebf2 cyan)
- `PZ`, `PZ1`, `PZ2` - Port Zone (#b0bec5 grey-blue)

## 🔧 Technical Details

### Filter Expression

The MapPreview now uses this exact filter:

```javascript
map.setFilter('Planning Scheme Zones', [
  'in',
  ['slice', ['get', 'ZONE_CODE'], 0, 3],  // Extract first 3 characters
  ['literal', activeZoneFilter],           // Array of selected zone codes
]);
```

This matches your layer's paint expression pattern, ensuring zones are filtered correctly.

### Why This Works

Your Mapbox layer stores full zone codes like:
- `GRZ1`, `GRZ2`, `GRZ3` → All match `GRZ`
- `NRZ1`, `NRZ2` → All match `NRZ`
- `C1Z`, `C2Z` → Match `C1Z`, `C2Z` individually

By using `["slice", 0, 3]`, we extract:
- `GRZ1` → `GRZ`
- `NRZ2` → `NRZ`
- `C1Z` → `C1Z`

This allows grouping by zone type regardless of schedule number.

## 🎨 Color Matching

The ZoneFilterPanel now uses colors that match your Mapbox layer:

| Category | Color | Hex | Matches Layer |
|----------|-------|-----|---------------|
| Residential | Pink | #ffccd5 | GRZ color |
| Commercial | Light Blue | #b3e5fc | C1Z color |
| Industrial | Grey | #e0e0e0 | IN1 color |
| Mixed Use | Peach | #ffe0b2 | MUZ color |
| Rural | Light Green | #e8f5e9 | FZ color |
| Special Use | Yellow | #fff59d | SUZ color |

## 🧪 Testing

```bash
npm run dev
```

**Test each category:**

1. **Uncheck "Residential"** → GRZ/NRZ/RGZ zones disappear
2. **Uncheck "Commercial"** → C1Z/C2Z zones disappear
3. **Check only "Residential"** → Only GRZ/NRZ/RGZ/LDR/RLZ visible
4. **Clear All** → All zones hidden
5. **Select All** → All zones reappear

**Console verification:**
```
[MapPreview] Zone filter applied: ['GRZ', 'NRZ', 'RGZ', 'LDR', 'RLZ']
```

## ✅ Ready to Use

Your zone filter is now perfectly configured for your Mapbox layer:
- ✅ Matches 3-character zone code pattern
- ✅ Supports all 40+ zone types in your layer
- ✅ Colors match your layer's paint scheme
- ✅ Filter expression matches layer logic
- ✅ Instant filtering with zero reload

The filter will work flawlessly with your existing "Planning Scheme Zones" layer! 🎉
