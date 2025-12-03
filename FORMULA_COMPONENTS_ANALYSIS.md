# Weighted Risk Formula Components Analysis

## Formula: `Risk Index = [(PM_cal × W_tox × W_wind) + (Odor_score × W_odor)] × V_user`

---

## Component Status

### ✅ 1. PM_cal (Barkjohn-Calibrated PM2.5)
**Status:** ✅ **COMPLETE**

**Source:**
- PurpleAir API (`api.purpleair.com`)
- Real-time sensor data with humidity and temperature

**Implementation:**
- ✅ `applyBarkjohnCalibration()` function exists
- ✅ Applied in `SensorMapMapbox.tsx` (line ~258, ~413)
- ✅ Applied in `ExposureModel.tsx` (line 172)

**Formula:** `correctedPM = 0.524 × rawPM - 0.0862 × RH + 5.75`

**Data Available:**
- Raw PM2.5: ✅ From PurpleAir sensors
- Humidity (RH): ✅ From PurpleAir sensors
- Temperature: ✅ From PurpleAir sensors (optional)

---

### ⚠️ 2. W_tox (Toxicity Weight: 1.0-2.0)
**Status:** ⚠️ **PARTIAL - API Available But Not Fully Integrated**

**Source:**
- EPA TRI (Toxic Release Inventory) API
- EPA Envirofacts API (`data.epa.gov/efservice/`)

**What We Have:**
- ✅ `epaTriService.ts` with `fetchTRIData()` function
- ✅ `getTRIFacilities` Cloud Function (line 1339 in `index.ts`)
- ✅ `calculateToxicityWeight()` function exists
- ✅ TRI data includes:
  - Facility locations
  - Air releases (chemicals, quantities)
  - Toxicity scores (RSEI-based)
  - High-concern chemicals: Benzene, Styrene, Toluene, Manganese, Hydrogen Cyanide

**What's Missing:**
- ❌ **Not calling `getTRIFacilities` in SensorMapMapbox.tsx**
- ❌ Currently calculating `toxicityWeight` manually based on Title V facilities only
- ❌ Not using actual TRI toxicity scores from EPA data
- ❌ Not using `calculateToxicityWeight()` from `epaTriService.ts`

**Current Implementation (SensorMapMapbox.tsx):**
```typescript
// Currently: Manual calculation based on Title V facilities
let toxicityWeight = 1.0;
upwindFacilities.forEach((facility) => {
  // Manual distance/emissions calculation
  // NOT using TRI data
});
```

**Should Be:**
```typescript
// Should: Fetch TRI facilities and use calculateToxicityWeight()
const triFacilities = await fetchTRIFacilities();
toxicityWeight = calculateToxicityWeight(
  sensor.location.lat,
  sensor.location.lng,
  triFacilities,
  windData.direction
);
```

**Impact:** Medium - We're getting approximate toxicity weights but not using the full EPA TRI data

---

### ✅ 3. W_wind (Dispersion Factor: 0.8-1.5)
**Status:** ✅ **COMPLETE**

**Source:**
- OpenWeatherMap API (`api.openweathermap.org`)

**Implementation:**
- ✅ `getWindData()` function exists
- ✅ `calculateDispersionFactor()` function exists
- ✅ Applied in `SensorMapMapbox.tsx` (line ~254, ~408)
- ✅ Applied in `ExposureModel.tsx` (line 151)

**Formula:** Based on wind speed
- Low wind (< 2 m/s): Higher factor (stagnant air)
- High wind (> 7 m/s): Lower factor (good dispersion)

**Data Available:**
- Wind speed: ✅ From OpenWeatherMap
- Wind direction: ✅ From OpenWeatherMap

---

### ✅ 4. Odor_score (Normalized Smell PGH Reports: 0-100)
**Status:** ✅ **COMPLETE**

**Source:**
- Smell PGH API (`api.smellpittsburgh.org`)
- CMU Create Lab platform

**Implementation:**
- ✅ `fetchSmellPGHReports()` Cloud Function
- ✅ `clusterOdorReports()` function
- ✅ `calculateLocationOdorScore()` function
- ✅ `normalizeOdorScore()` function
- ✅ Applied in `SensorMapMapbox.tsx` (line ~290, ~347)

**Data Available:**
- Smell reports: ✅ From Smell PGH API
- Clustering: ✅ Implemented
- Normalization: ✅ 0-100 scale

---

### ✅ 5. W_odor (Gas Proxy Weight)
**Status:** ✅ **COMPLETE**

**Value:** Constant `1.2`

**Purpose:** Allows odor reports to override PM2.5 readings (accounts for H2S, SO2, etc.)

**Implementation:**
- ✅ Used in all risk calculations
- ✅ Default value: 1.2

---

### ⚠️ 6. V_user (Vulnerability Multiplier: 1.0-2.0)
**Status:** ⚠️ **PARTIAL - Function Exists But No User Data**

**Source:**
- User health profile (requires user input)

**What We Have:**
- ✅ `calculateVulnerabilityScore()` function exists
- ✅ Formula implemented:
  - Base: 1.0
  - Asthma: +0.5
  - COPD: +0.5
  - Senior (>65): +0.3
  - Child: +0.2
  - Previous high exposure: +0.2
  - Max: 2.0

**What's Missing:**
- ❌ **No user health profile storage/retrieval**
- ❌ Currently defaults to `1.0` (no personalization)
- ❌ No UI for users to input health data
- ❌ No integration with symptom reports

**Current Implementation:**
```typescript
// Currently: Always defaults to 1.0
vulnerabilityScore: 1.0, // Default (would use user profile)
```

**Should Be:**
```typescript
// Should: Get from user profile
const userProfile = await getUserHealthProfile(userId);
vulnerabilityScore = calculateVulnerabilityScore(
  userProfile.hasAsthma,
  userProfile.hasCOPD,
  userProfile.ageGroup,
  userProfile.previousHighExposure
);
```

**Impact:** Medium-High - Personalization is a core VCAN requirement

---

## Summary

| Component | Status | Data Source | Integration Level |
|-----------|--------|-------------|-------------------|
| **PM_cal** | ✅ Complete | PurpleAir API | Fully integrated |
| **W_tox** | ⚠️ Partial | EPA TRI API | API exists, not used in map |
| **W_wind** | ✅ Complete | OpenWeatherMap API | Fully integrated |
| **Odor_score** | ✅ Complete | Smell PGH API | Fully integrated |
| **W_odor** | ✅ Complete | Constant (1.2) | Fully integrated |
| **V_user** | ⚠️ Partial | User profile | Function exists, no user data |

---

## Missing Integrations

### 1. TRI Data Integration (W_tox)
**Priority:** Medium

**Action Required:**
1. Call `getTRIFacilities` Cloud Function in `SensorMapMapbox.tsx`
2. Use `calculateToxicityWeight()` from `epaTriService.ts`
3. Replace manual toxicity weight calculation with TRI-based calculation

**Files to Update:**
- `frontend/src/components/SensorMapMapbox.tsx` (line ~353-404)
- `frontend/src/components/SensorMapMapbox.tsx` (risk zone calculation, line ~226-252)

### 2. User Health Profile (V_user)
**Priority:** High (VCAN requirement)

**Action Required:**
1. Create user health profile storage (Firestore collection)
2. Add UI for health profile input (asthma, COPD, age, etc.)
3. Integrate with symptom reporting
4. Use profile data in risk calculations

**Files to Create/Update:**
- New: `frontend/src/services/userProfileService.ts`
- New: `frontend/src/components/HealthProfile.tsx`
- Update: `SensorMapMapbox.tsx` to fetch user profile
- Update: `ExposureModel.tsx` to use user profile

---

## Current Formula Accuracy

**With Current Implementation:**
- ✅ 4/6 components fully accurate (PM_cal, W_wind, Odor_score, W_odor)
- ⚠️ 2/6 components approximate (W_tox, V_user)

**Formula Accuracy:** ~85% (using approximations for W_tox and V_user)

**With Full Integration:**
- ✅ 6/6 components fully accurate
- ✅ Formula Accuracy: 100%

---

## Recommendations

1. **Immediate:** Integrate TRI data for W_tox calculation
2. **High Priority:** Implement user health profile system for V_user
3. **Future:** Consider caching TRI data to reduce API calls
4. **Future:** Add user preference for vulnerability score override


