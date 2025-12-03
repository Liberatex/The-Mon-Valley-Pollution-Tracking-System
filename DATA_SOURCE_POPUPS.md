# Data Source Sections Added to Map Popups

## Overview
Added comprehensive "Data Source" sections to all map popups to provide transparency about where the data is coming from. This helps users understand the reliability and origin of the information they're viewing.

## Popups Updated

### 1. PurpleAir Sensors Popup
**Location:** `frontend/src/components/SensorMapMapbox.tsx` (line ~548)

**Data Source Section:**
- **Icon:** 📡 (Satellite/Antenna)
- **Source:** PurpleAir API
- **Description:** Real-time PM2.5 data from community-operated sensors. Data calibrated using Barkjohn algorithm for humidity correction.
- **API Details:** `api.purpleair.com | Updated: Real-time`

### 2. Smell PGH Clusters Popup
**Location:** `frontend/src/components/SensorMapMapbox.tsx` (line ~1095)

**Data Source Section:**
- **Icon:** 👃 (Nose)
- **Source:** Smell PGH API
- **Description:** Crowdsourced odor reports from CMU Create Lab's Smell PGH platform. Reports aggregated and clustered to identify odor events.
- **API Details:** `api.smellpittsburgh.org | Source: CMU Create Lab`

### 3. Title V Facilities Popup
**Location:** `frontend/src/components/SensorMapMapbox.tsx` (line ~861)

**Data Source Section:**
- **Icon:** 🏛️ (Government Building)
- **Source:** EPA ECHO API
- **Description:** Compliance data from EPA's Enforcement and Compliance History Online (ECHO) system. Includes three-year compliance status, quarters in non-compliance, and violation records.
- **API Details:** `echo.epa.gov | Service: Detailed Facility Report (DFR)`

**Note:** Data source section appears in all states:
- Loading state (while fetching compliance data)
- Success state (with compliance data displayed)
- Error state (when compliance data fails to load)
- No data state (when no compliance data available)

### 4. Risk Zones Popup
**Location:** `frontend/src/components/SensorMapMapbox.tsx` (line ~1324)

**Data Source Section:**
- **Multiple Sources Listed:**
  - **📡 PurpleAir Sensors:** PM2.5 readings with Barkjohn calibration
  - **👃 Smell PGH Reports:** Crowdsourced odor reports (CMU Create Lab)
  - **🌬️ Wind Data:** OpenWeatherMap API for dispersion modeling
- **Additional Note:** Risk zones calculated using weighted risk algorithm with toxicity weights from EPA TRI data.

**Note:** Risk zones have two click handlers (fill and outline), both include the data source section.

## Design Features

### Visual Design
- **Border:** Top border (`border-top: 1px solid #e5e7eb`) separates data source from main content
- **Typography:** 
  - Section title: Bold, dark gray (`#374151`)
  - Source name: Bold, darker gray (`#1f2937`)
  - Description: Regular, medium gray (`#6b7280`)
  - API details: Small, light gray (`#9ca3af`), italic for additional context
- **Icons:** Emoji icons with color coding for visual distinction
- **Spacing:** Consistent padding and margins for readability

### Consistency
All data source sections follow the same structure:
1. Section title: "Data Source:" or "Data Sources:"
2. Icon + Source name
3. Description (1-2 sentences)
4. API details (smaller, lighter text)

## Benefits

1. **Transparency:** Users know exactly where data comes from
2. **Credibility:** Shows integration with official sources (EPA, CMU Create Lab)
3. **Education:** Helps users understand the data pipeline
4. **Compliance:** Supports regulatory requirements for data attribution
5. **Debugging:** Makes it easier to identify data source issues

## Testing

After restarting the frontend dev server, verify:
1. Click on PurpleAir sensors → See PurpleAir API data source
2. Click on Smell PGH clusters → See Smell PGH API data source
3. Click on Title V facilities → See EPA ECHO API data source (in all states)
4. Click on Risk Zones → See multiple data sources listed

All popups should now display clear attribution for their data sources.


