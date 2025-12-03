# Sensor Rendering Fix

## Problem
PurpleAir sensors were not showing up on the map.

## Root Causes Identified

1. **Layer Only Added When Source Created**: The `sensor-points` layer was only being added when creating a new source. If the source already existed from a previous render, the layer might not exist.

2. **Layer Visibility Not Set**: Even if layers existed, their visibility wasn't being explicitly set based on `showSensors` state.

3. **Dependency Array Issue**: The useEffect had `map.current` in the dependency array, which doesn't trigger re-renders properly.

## Fixes Applied

### 1. **Layer Creation Logic**
- **Before**: Layers were only added when creating a new source (in the `else` block)
- **After**: Layers are checked and added independently of source creation
- Ensures layers exist even if source was created in a previous render

### 2. **Explicit Visibility Control**
- Added `setLayoutProperty('visibility', ...)` calls to ensure layers match `showSensors` state
- Applied to all three sensor layers:
  - `sensor-points` (individual sensors)
  - `sensor-clusters` (clustered view)
  - `sensor-cluster-count` (cluster labels)

### 3. **Fixed Dependency Array**
- **Before**: `}, [map.current, sensors, ...]` - `map.current` doesn't trigger re-renders
- **After**: `}, [sensors, showSensors, ...]` - Removed `map.current` from dependencies

### 4. **Enhanced Logging**
- Added console logs to track:
  - When sensors are being updated
  - When layers are being added
  - When source is being created vs updated
  - Sensor count and state

## Code Changes

```typescript
// Before: Layers only added when source created
if (source) {
  source.setData(geojsonData);
} else {
  map.current.addSource('sensors', {...});
  // Layers added here only
}

// After: Layers checked and added independently
if (source) {
  source.setData(geojsonData);
} else {
  map.current.addSource('sensors', {...});
}

// Always check and add layers
if (!map.current.getLayer('sensor-clusters')) {
  map.current.addLayer({...});
}
if (!map.current.getLayer('sensor-points')) {
  map.current.addLayer({...});
}

// Explicitly set visibility
map.current.setLayoutProperty('sensor-points', 'visibility', showSensors ? 'visible' : 'none');
```

## Expected Behavior

After this fix:
- ✅ Sensors should appear on the map immediately when data loads
- ✅ Sensors remain visible even during API polling updates
- ✅ Layer visibility matches the `showSensors` checkbox state
- ✅ Console logs show sensor rendering progress

## Debugging

Check browser console for:
- `🔍 Sensor rendering check:` - Shows sensor count and state
- `✅ Updating sensors from realtime hook: X sensors` - Confirms data received
- `✅ Creating new sensor source` or `✅ Updating existing sensor source` - Confirms source handling
- `✅ Adding sensor-points layer` - Confirms layer creation
- `✅ sensor-points layer already exists` - Confirms layer exists

## Testing

1. **Check Console**: Look for sensor rendering logs
2. **Check Map**: Sensors should appear as colored circles
3. **Toggle Checkbox**: Uncheck/check "PurpleAir Sensors" - sensors should hide/show
4. **Zoom**: At zoom 11+, individual sensors should be visible (not clusters)

---

## Status

✅ **FIXED** - Sensors should now render correctly on the map.


