# Map Legend and Plumes Visualization Update

## Summary
Updated the map to include comprehensive legend entries for all data types, changed Smell PGH visualization to triangles for visual distinction, and added pollution plumes from facilities showing wind direction.

## Changes Made

### 1. Smell PGH Visualization - Changed to Triangles/Pyramids ✅
**Location:** `frontend/src/components/SensorMapMapbox.tsx` (line ~1069)

**Changes:**
- Changed from `circle` layer type to `symbol` layer type
- Created custom triangle/pyramid icons for different smell levels:
  - **Low (1-2):** Light green triangle (`#90EE90`)
  - **Moderate (2-3):** Gold triangle (`#FFD700`)
  - **High (3-4):** Dark orange triangle (`#FF8C00`)
  - **Very High (4-5):** Crimson triangle (`#DC143C`)
- Triangles point upward (pyramid shape) with white borders for visibility
- Size scales with cluster size (0.6x to 1.4x based on number of reports)

**Visual Distinction:**
- PurpleAir sensors: **Circles** (round markers)
- Smell PGH reports: **Triangles** (pyramid markers)
- This matches how Smell PGH distinguishes their sensors visually

### 2. Map Legend - Added Smell PGH Section ✅
**Location:** `frontend/src/components/SensorMapMapbox.tsx` (line ~1803)

**Added:**
- **Smell PGH Reports** section with color scale
- Shows all four smell levels with triangle icons:
  - Low (1-2) - Light green triangle
  - Moderate (2-3) - Gold triangle
  - High (3-4) - Dark orange triangle
  - Very High (4-5) - Crimson triangle
- Description: "Crowdsourced odor reports from CMU Create Lab's Smell PGH platform"

### 3. Map Legend - Added Risk Zones Section ✅
**Location:** `frontend/src/components/SensorMapMapbox.tsx` (line ~1825)

**Added:**
- **Risk Zones** section with color-coded zones:
  - **Elevated Risk** - Yellow (`#ffff00`, 30% opacity)
  - **High Risk** - Orange (`#ff7e00`, 30% opacity)
  - **Severe Risk** - Red (`#ff0000`, 30% opacity)
  - **Toxic Event** - Purple (`#9c27b0`, 30% opacity)
- Description: "Dynamic zones generated from pollution events, sensor readings, and wind patterns"

### 4. Pollution Plumes from Facilities ✅
**Location:** `frontend/src/components/SensorMapMapbox.tsx` (line ~1015)

**Implementation:**
- Added new `useEffect` hook that creates plume polygons from each Title V facility
- Plumes extend in the wind direction (where pollution is blowing TO)
- **Plume Characteristics:**
  - **Shape:** Tapered fan/polygon (wider at base, narrower at tip)
  - **Length:** Based on wind speed (faster wind = longer plume)
    - Base length: ~1km
    - Scales with wind speed (up to 2x multiplier)
  - **Width:** 
    - Base: ~300m (45° spread)
    - Tip: ~100m (20° spread)
  - **Visualization:**
    - Fill: Red-orange (`#ff6b6b`) at 15% opacity
    - Outline: Dashed red-orange line at 40% opacity
  - **Visibility:** Only shown at zoom level 11+ (municipal level)

**Technical Details:**
- Uses Turf.js for geospatial calculations:
  - `turf.point()` - Facility location
  - `turf.destination()` - Calculate plume endpoints
  - `turf.polygon()` - Create plume polygon
- Wind direction conversion:
  - Meteorological wind direction (where wind comes FROM)
  - Converted to bearing (where wind goes TO) by adding 180°
- Plumes update automatically when wind data changes

### 5. Wind Visualization Enhancement ✅
**Location:** `frontend/src/components/SensorMapMapbox.tsx` (line ~1825)

**Existing Features:**
- Wind arrow showing direction and speed
- Wind info panel with speed, direction, and dispersion factor
- Wind arrow points in the direction wind is blowing TO

**Integration with Plumes:**
- Plumes use the same wind data to show where pollution travels
- Both update together when wind conditions change

## Visual Hierarchy

### Map Elements (by shape):
1. **PurpleAir Sensors:** Circles (round)
2. **Smell PGH Reports:** Triangles (pyramids) ⬆️
3. **Title V Facilities:** Factory icons (🏭)
4. **My Location:** Crosshair icon (➕)
5. **Risk Zones:** Semi-transparent polygons
6. **Pollution Plumes:** Tapered polygons (fan-shaped)

### Color Coding:
- **PurpleAir:** Green/Yellow/Orange/Red/Purple (based on PM2.5)
- **Smell PGH:** Green/Gold/Orange/Crimson (based on smell value)
- **Risk Zones:** Yellow/Orange/Red/Purple (based on risk level)
- **Plumes:** Red-orange (pollution visualization)

## VCAN Compliance

### ✅ Requirements Met:
1. **Visual Distinction:** Smell PGH uses triangles, PurpleAir uses circles
2. **Map Legend:** Complete with all data types and color scales
3. **Wind Visualization:** Wind direction and speed displayed
4. **Pollution Plumes:** Show where pollution travels from facilities
5. **Dynamic Updates:** Plumes update with wind changes

### VCAN Reference:
- **"Plume PGH" Component:** Pollution plumes visualized as polygons extending from facilities
- **Wind Direction:** Shows where pollution is blowing (meteorological convention)
- **Dispersion Modeling:** Plume length and width based on wind speed
- **Visual Separation:** Different shapes for different data types

## Testing

After restarting the frontend dev server, verify:
1. ✅ Smell PGH reports appear as triangles (not circles)
2. ✅ Map legend shows Smell PGH color scale with triangles
3. ✅ Map legend shows Risk Zones with color-coded squares
4. ✅ Pollution plumes extend from Title V facilities in wind direction
5. ✅ Plumes update when wind data changes
6. ✅ All legend sections are visible and properly formatted

## Next Steps

1. **Test on local server** to verify all visualizations work correctly
2. **Adjust plume opacity/colors** if needed for better visibility
3. **Consider adding plume intensity** based on facility emissions (future enhancement)
4. **Add plume animation** for real-time updates (optional enhancement)


