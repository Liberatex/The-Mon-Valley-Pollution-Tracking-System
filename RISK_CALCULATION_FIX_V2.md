# Risk Calculation Fix V2 - Double Calibration Issue

## Problem Identified

The map was showing sensors with incorrect colors (purple/red) but when clicked, they showed low risk. This was caused by:

1. **Double Calibration**: The `useRealtimeSensorData` hook already applies Barkjohn calibration and stores it as `sensor.pm25`
2. **Component Re-calibration**: The `SensorMapMapbox` component was applying Barkjohn calibration AGAIN to already-calibrated values
3. **Result**: Double-calibrated PM2.5 values were much lower than actual, causing low risk calculations even when raw PM2.5 was high

---

## Root Cause

**Backend (`fetchPurpleAirSensorData`):**
- Returns RAW PM2.5 values (`pm2.5_cf_1` or `pm2.5`)

**Hook (`useRealtimeSensorData`):**
- Applies Barkjohn calibration
- Stores calibrated value as `sensor.pm25`

**Component (`SensorMapMapbox`):**
- Was applying Barkjohn calibration AGAIN to `sensor.pm25` (already calibrated)
- This double-calibration made values artificially low

---

## Fix Applied

### 1. **Sensor Layer Risk Calculation** (Line ~422)
**Before:**
```typescript
const calibratedPM = applyBarkjohnCalibration(rawPM25, humidity, sensor.temperature);
```

**After:**
```typescript
// IMPORTANT: useRealtimeSensorData hook already applies Barkjohn calibration
// sensor.pm25 is already calibrated, so use it directly
const calibratedPMValue = sensor.pm25 || 0;
```

### 2. **Risk Zone Generation** (Line ~272)
**Before:**
```typescript
const calibratedPM = applyBarkjohnCalibration(rawPM25, humidity, sensor.temperature);
```

**After:**
```typescript
// IMPORTANT: sensor.pm25 from useRealtimeSensorData is already Barkjohn-calibrated
// Use it directly - DO NOT apply calibration again
const calibratedPMValue = sensor.pm25 || 0;
```

### 3. **Enhanced Debugging**
- Added console logging to track risk calculations
- Logs risk distribution and sample sensor details
- Logs risk zone generation events

### 4. **Improved Error Handling**
- Added check for `windData` before calculating risk (required for dispersion factor)
- Added fallback logic for `circle-color` to ensure `riskLevel` is always used
- Added `_riskLevel` backup property in GeoJSON

---

## Expected Results

After this fix:

1. ✅ **Sensor Colors Match Popups**: Sensors colored by weighted risk level will match the risk level shown in popups
2. ✅ **Risk Zones Appear**: Risk zones will generate when weighted risk index >= 25
3. ✅ **Accurate Risk Calculations**: Risk calculations use correctly calibrated PM2.5 values (not double-calibrated)

---

## Testing

To verify the fix:

1. **Check Console Logs:**
   - Look for: `🔄 Calculating weighted risk for X sensors...`
   - Check: `📊 Risk Distribution:` - should show realistic distribution
   - Check: `Sample sensor:` - verify `pm25Calibrated` is reasonable (not artificially low)

2. **Check Map Colors:**
   - Sensors with high PM2.5 should show orange/red/purple
   - Click sensors - popup risk level should match map color

3. **Check Risk Zones:**
   - Look for: `✅ Detected X pollution events using weighted risk algorithm`
   - If no events: `ℹ️ No events detected. Max risk index: X.XX`
   - Risk zones should appear when sensors have riskIndex >= 25

---

## Files Modified

- `frontend/src/components/SensorMapMapbox.tsx`
  - Fixed double calibration in sensor layer (line ~422)
  - Fixed double calibration in risk zone generation (line ~272)
  - Added enhanced debugging/logging
  - Improved error handling

---

## Notes

- The `useRealtimeSensorData` hook applies Barkjohn calibration once
- The component should use `sensor.pm25` directly (already calibrated)
- If raw PM2.5 is needed for display, it should be stored separately in the hook
- Current implementation: Only calibrated PM2.5 is available (which is correct for risk calculations)

---

## Status

✅ **FIXED** - Double calibration issue resolved. Sensors should now show correct colors matching their weighted risk levels.


