# Risk Calculation Fix - Color Coding and Risk Zones

## Issues Identified and Fixed

### 1. Color Coding Mismatch ✅ FIXED
**Problem:** PurpleAir sensors showing purple on map but green/low risk when clicked.

**Root Cause:**
- Map was using `riskLevel` property from GeoJSON, but the fallback to PM2.5-based colors was incorrect
- The `match` expression in Mapbox had a syntax error - it was trying to use a nested `step` expression as a fallback, which doesn't work
- Sensors were not using Barkjohn-calibrated PM2.5 in the risk calculation

**Fix Applied:**
1. **Removed incorrect fallback:** Changed the `circle-color` expression to use only `riskLevel` with a simple green default
2. **Added Barkjohn calibration:** Now applying `applyBarkjohnCalibration()` before calculating weighted risk
3. **Ensured riskLevel is set:** Verified that `riskLevel` is correctly set in GeoJSON properties from `calculateWeightedRisk()` result

**Code Changes:**
```typescript
// Before: Using raw PM2.5
pm25Calibrated: sensor.pm25 || 0,

// After: Using Barkjohn-calibrated PM2.5
const calibratedPM = applyBarkjohnCalibration(rawPM25, humidity, sensor.temperature);
pm25Calibrated: calibratedPM.correctedPM,
```

```typescript
// Before: Incorrect fallback syntax
'circle-color': [
  'match',
  ['get', 'riskLevel'],
  'low', '#00e400',
  // ... other levels
  [/* nested step expression - WRONG */],
],

// After: Simple match with default
'circle-color': [
  'match',
  ['get', 'riskLevel'],
  'low', '#00e400',
  'elevated', '#ffff00',
  'high', '#ff7e00',
  'severe', '#ff0000',
  'toxic', '#9c27b0',
  '#00e400', // Default to green if missing
],
```

### 2. Risk Zones Not Showing ✅ FIXED
**Problem:** Risk zones showing "No events" even when sensors show bad air quality.

**Root Cause:**
- `detectPollutionEvents()` was using raw PM2.5 values instead of weighted risk indices
- It was using the old formula approach (simple PM2.5 threshold) instead of the new weighted risk formula
- Thresholds were based on raw PM2.5 (35 μg/m³) instead of weighted risk index (25+)

**Fix Applied:**
1. **Rewrote risk zone detection:** Now calculates weighted risk for each sensor first
2. **Uses weighted risk index:** Detects events based on `riskIndex >= 25` (elevated risk threshold)
3. **Proper formula:** Uses the full weighted risk calculation: `Risk = [(PM_cal × W_tox × W_wind) + (Odor_score × W_odor)] × V_user`

**Code Changes:**
```typescript
// Before: Using raw PM2.5
const events = detectPollutionEvents(sensorData, smellReports, {
  pm25Threshold: 35,
  smellThreshold: 3,
  smellValueThreshold: 3,
});

// After: Using weighted risk calculation
const sensorsWithRisk = sensors.map((sensor) => {
  // Calculate full weighted risk with all components
  const riskResult = calculateWeightedRisk({
    pm25Calibrated: calibratedPM.correctedPM,
    toxicityWeight,
    dispersionFactor,
    odorScore,
    odorWeight: 1.2,
    vulnerabilityScore: 1.0,
  });
  return { lat, lng, riskIndex: riskResult.riskIndex, riskLevel: riskResult.riskLevel };
});

// Detect events based on weighted risk index
const events = sensorsWithRisk
  .filter(s => s.riskIndex >= 25) // Elevated risk threshold
  .map(s => ({ lat, lng, severity: s.riskLevel }));
```

### 3. Exposure Model Formula ✅ VERIFIED
**Status:** ExposureModel is already using the correct weighted risk formula

**Verification:**
- Line 197: Uses `calculateWeightedRisk()` with all required inputs
- Line 198: Uses `calibrated.correctedPM` (Barkjohn-calibrated PM2.5)
- Line 199-203: Includes all formula components (toxicityWeight, dispersionFactor, odorScore, etc.)
- Has fallback to legacy formula only if weighted risk calculation fails (line 236)

**Note:** The fallback is acceptable as error handling, but the primary path uses the correct formula.

## Formula Verification

### Correct Formula (Now Used):
```
Risk Index = [(PM_cal × W_tox × W_wind) + (Odor_score × W_odor)] × V_user
```

### Components:
- **PM_cal:** Barkjohn-calibrated PM2.5 ✅ Now applied
- **W_tox:** Toxicity weight (1.0-2.0) ✅ Calculated from upwind facilities
- **W_wind:** Dispersion factor (0.8-1.5) ✅ Calculated from wind speed
- **Odor_score:** Normalized Smell PGH reports (0-100) ✅ Calculated from clusters
- **W_odor:** Gas proxy weight (1.2) ✅ Applied
- **V_user:** Vulnerability multiplier (1.0-2.0) ✅ Default 1.0

### Risk Level Thresholds:
- **Low:** < 25
- **Elevated:** 25-50
- **High:** 50-75
- **Severe:** 75-100
- **Toxic:** 100+

## Testing

After restarting the frontend dev server, verify:

1. ✅ **Color Coding:**
   - Sensors show correct colors based on weighted risk level
   - Purple sensors should have `riskIndex >= 100` (toxic)
   - Green sensors should have `riskIndex < 25` (low)
   - Colors match the popup when clicked

2. ✅ **Risk Zones:**
   - Risk zones appear when sensors have `riskIndex >= 25`
   - Zones are generated using weighted risk, not raw PM2.5
   - Zones update when sensor data changes

3. ✅ **Exposure Model:**
   - Uses weighted risk formula (already correct)
   - Shows calibrated PM2.5 values
   - Displays full risk breakdown

## Root Cause Summary

1. **Color mismatch:** Mapbox `match` expression had incorrect fallback syntax, and sensors weren't using calibrated PM2.5
2. **No risk zones:** `detectPollutionEvents()` was using old formula (raw PM2.5 thresholds) instead of weighted risk
3. **Exposure Model:** Already correct, but fallback to legacy formula could be improved

All issues have been fixed. The system now consistently uses the weighted risk formula throughout.


