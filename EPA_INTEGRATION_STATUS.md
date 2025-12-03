# EPA TRI & ECHO Integration Status

## Overview
This document tracks the integration of EPA regulatory data sources for toxicity weights (W_tox) and compliance status, as required by VCAN specifications.

## Completed ✅

### 1. Facility Compliance Data (EPA ECHO)
- **Status**: ✅ Implemented with hardcoded data
- **Function**: `getFacilityCompliance` Cloud Function
- **Location**: `functions/src/index.ts:733`
- **Service**: `functions/src/epaEchoService.ts`
- **Current Implementation**: Returns hardcoded compliance data for Mon Valley facilities
- **Data Provided**:
  - Compliance Status (Compliant/Non-Compliant/Significant Non-Compliance)
  - Quarters in Non-Compliance (QNC)
  - Last Inspection Date
  - Violations (type, date, description)
  - Permit Numbers

### 2. Toxicity Weight Calculation (EPA TRI)
- **Status**: ✅ Service created
- **Service**: `functions/src/epaTriService.ts`
- **Current Implementation**: Returns hardcoded TRI data for Mon Valley facilities
- **Data Provided**:
  - Air releases by chemical (Benzene, PM2.5, SO2, etc.)
  - Toxicity scores (RSEI-based)
  - Total toxicity score per facility
- **Function**: `calculateToxicityWeight()` - Calculates W_tox (1.0-2.0 range) based on proximity and wind direction

### 3. Frontend Integration
- **Status**: ✅ Partially implemented
- **Location**: `frontend/src/components/SensorMapMapbox.tsx`
- **Features**:
  - Toxicity weight calculation for sensors (lines 306-344)
  - Compliance data display in facility popups
  - Elevation/terrain visualization added

### 4. BreatheAI Symptom Reporting
- **Status**: ✅ Fully functional
- **Backend**: Uses same `submitSymptomReport` endpoint as main form
- **Compliance**: HIPAA-compliant, includes pseudonymization, rate limiting, audit logging
- **OSAC Fields**: Collects all required fields (onset, severity, course, aggravating factors)
- **Initial Message**: Updated to proactively mention symptom reporting capability

## Completed ✅ (Live API Integration)

### 1. EPA ECHO Detailed Facility Report API ✅
**Status**: ✅ Implemented with live API calls + fallback
**Implementation**: `functions/src/epaEchoService.ts`

**API Details**:
- **Endpoint**: `https://echo.epa.gov/tools/web-services/dfr_rest_services.get_dfr`
- **Authentication**: None required (public REST API)
- **Parameters**:
  - `p_id`: Registry ID (required)
  - `p_system`: 'AIR' (for air compliance)
  - `output`: 'JSON'
- **Response Fields**:
  - `ThreeYearComplianceStatus` / `AirComplianceStatus`
  - `QNC` / `QuartersInNonCompliance`
  - `Violations` array
  - `LastInspectionDate`
  - `PermitNumber` / `AirPermitNumber`

**Features**:
- ✅ Live API calls with proper error handling
- ✅ Fallback to hardcoded data if API unavailable
- ✅ Parses compliance status (Compliant/Non-Compliant/Significant Non-Compliance)
- ✅ Extracts violations and inspection dates

**Documentation**: 
- Web Services: https://echo.epa.gov/tools/web-services/detailed-facility-report
- DFR Data Dictionary: https://echo.epa.gov/help/reports/dfr-data-dictionary#AirComp

### 2. EPA Envirofacts TRI API ✅
**Status**: ✅ Implemented with live API calls + fallback
**Implementation**: `functions/src/epaTriService.ts`

**API Details**:
- **Endpoint**: `https://data.epa.gov/efservice/`
- **Authentication**: None required (public REST API - NO API KEY NEEDED)
- **Tables Used**:
  - `TRI_FACILITY_INFORMATION`: Facility details
  - `TRI_REPORTING_FORM`: Annual reporting data (air releases)
- **Query Format**: `/TRI_FACILITY_INFORMATION/ROWS/0:100/EPA_REGISTRY_ID/{registryId}/JSON`
- **Filters**:
  - `EPA_REGISTRY_ID`: Facility registry ID
  - `REPORTING_YEAR`: Year of data (defaults to current year)
  - `MEDIA_TYPE`: 'AIR' for air releases

**Features**:
- ✅ Live API calls to Envirofacts
- ✅ Filters for chemicals of high concern (Benzene, Styrene, Toluene, etc.)
- ✅ Calculates toxicity scores using RSEI values
- ✅ Fallback to hardcoded data if API unavailable
- ✅ Includes only significant releases (>1000 lbs/year) or high-concern chemicals

**Documentation**:
- Envirofacts API V1: https://www.epa.gov/enviro/envirofacts-data-service-api-v1
- TRI Program: https://www.epa.gov/toxics-release-inventory-tri-program

### 3. EPA ECHO Noncompliance Report Service ✅
**Status**: ✅ Service created (primarily for reference/water permits)
**Implementation**: `functions/src/epaEchoNoncomplianceService.ts`

**Note**: This service is primarily for NPDES (water) permits. For air compliance violations, we use the DFR API which includes violation data.

**Documentation**: 
- Noncompliance Report: https://echo.epa.gov/tools/web-services/npdes-noncompliance-report

### 3. Elevation/Terrain Visualization
**Status**: ✅ Added to map
**Implementation**: 
- Mapbox DEM (Digital Elevation Model) source
- Terrain exaggeration: 1.5x
- Contour lines layer
- 3D terrain enabled

**Note**: Requires Mapbox account with terrain access enabled

## API Keys & Setup Required

### EPA ECHO API
- **Registration**: May require EPA account registration
- **Endpoint**: https://echo.epa.gov/tools/web-services
- **Documentation**: https://echo.epa.gov/help/reports/dfr-data-dictionary#AirComp
- **Rate Limits**: Check EPA documentation

### EPA TRI/Envirofacts API
- **Access**: Public API (no key required for basic queries)
- **Endpoint**: https://data.epa.gov/efservice/
- **Rate Limits**: Standard HTTP rate limits apply
- **Documentation**: https://www.epa.gov/envirofacts/envirofacts-data-service-api

### Mapbox Terrain
- **Requirement**: Mapbox account with terrain access
- **Source**: `mapbox://mapbox.mapbox-terrain-dem-v1`
- **Setup**: Already configured in code, just needs account access

## Testing Checklist

- [x] Facility compliance data displays in popups
- [x] Toxicity weight calculation works for sensors
- [x] BreatheAI can submit symptom reports
- [x] Elevation/terrain visible on map
- [ ] Live EPA ECHO API integration (pending API access)
- [ ] Live EPA TRI API integration (pending implementation)
- [ ] Full W_tox calculation using live TRI data

## Next Steps

1. **Immediate**: Test current implementation with hardcoded data
2. **Short-term**: Implement EPA TRI API integration (public API, easier)
3. **Medium-term**: Implement EPA ECHO API integration (may require registration)
4. **Long-term**: Add caching layer for API responses to reduce load

## References

- EPA ECHO DFR Data Dictionary: https://echo.epa.gov/help/reports/dfr-data-dictionary#AirComp
- EPA TRI Program: https://www.epa.gov/toxics-release-inventory-tri-program
- EPA Envirofacts API: https://data.epa.gov/efservice/
- Mapbox Terrain: https://docs.mapbox.com/mapbox-gl-js/example/add-terrain/

