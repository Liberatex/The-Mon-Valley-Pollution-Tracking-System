# Real-Time API Data Sources ✅

## No Mock Data - All Real-Time APIs

All data sources now use **real-time APIs only**. No mock or simulated data.

## PurpleAir Sensors - Real-Time Fallback Chain

When PurpleAir API requires payment (402 error), the system automatically tries these **real-time alternatives**:

### 1. OpenAQ API (Primary Fallback)
- **Source**: `api.openaq.org` (free, no API key needed)
- **Data**: Aggregates EPA AirNow real-time data
- **Coverage**: Mon Valley area (50km radius from Clairton)
- **Update Frequency**: Real-time (updated hourly by EPA)
- **Status**: ✅ Active fallback

### 2. WPRDC (Secondary Fallback)
- **Source**: `data.wprdc.org` (free, no API key needed)
- **Data**: Official ACHD air quality monitoring data
- **Coverage**: Liberty monitor and other ACHD stations
- **Update Frequency**: Real-time (hourly updates)
- **Status**: ✅ Active fallback

### 3. Error Response (Last Resort)
- Only returns error if **all** real-time sources fail
- No mock data is returned
- Clear error message guides user to add PurpleAir credits

## Current Data Flow

```
PurpleAir API (402 Payment Required)
    ↓
Try OpenAQ (EPA AirNow) ← Real-time ✅
    ↓ (if fails)
Try WPRDC (ACHD Official) ← Real-time ✅
    ↓ (if fails)
Return Error (no mock data)
```

## All Other Data Sources (Already Real-Time)

### ✅ Smell PGH Reports
- **Source**: `api.smellpittsburgh.org` (CMU Create Lab)
- **Status**: Real-time crowdsourced data

### ✅ Wind Data
- **Source**: `api.openweathermap.org`
- **Status**: Real-time weather data

### ✅ Title V Facilities
- **Source**: EPA ECHO database
- **Status**: Real regulatory data

### ✅ EPA TRI Data
- **Source**: EPA TRI API
- **Status**: Real toxicity data

### ✅ Risk Zones
- **Source**: Calculated from real sensor/wind/smell data
- **Status**: Real-time calculations

## Verification

To verify all data is real-time:

1. Check browser Network tab - all API calls go to real endpoints
2. Check function logs - shows which real-time source was used
3. No "mock" or "fallback" data in responses (except source labels)

## Next Steps

To get PurpleAir working:
1. Add credits to PurpleAir account at https://www2.purpleair.com
2. Or use OpenAQ/WPRDC fallbacks (already active)

**All features now use real-time APIs only!** 🚀

