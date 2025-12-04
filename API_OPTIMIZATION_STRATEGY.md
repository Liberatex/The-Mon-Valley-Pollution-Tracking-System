# PurpleAir API Optimization Strategy

## Problem
PurpleAir API points were being consumed too quickly due to frequent polling from multiple users.

## Solution Implemented

### 1. Backend Caching (Firestore)
- **Cache Duration**: 10 minutes (600 seconds)
- **Storage**: Firestore collection `sensor_cache` with document `purpleair_sensors`
- **Strategy**: 
  - First request fetches from PurpleAir API and caches the result
  - Subsequent requests within 10 minutes return cached data
  - After 10 minutes, next request fetches fresh data and updates cache

### 2. Reduced Frontend Polling
- **Previous**: 60 seconds (1 request per minute per user)
- **New**: 5 minutes (300 seconds)
- **Rationale**: Backend cache ensures data is fresh even with less frequent polling

### 3. Shared Cache Across Users
- All users share the same cached data
- Multiple simultaneous users = 1 API call every 10 minutes (instead of N calls per minute)

## API Point Savings Calculation

### Before Optimization:
- **Per User**: 1 request/minute = 60 requests/hour = 1,440 requests/day
- **10 Users**: 14,400 requests/day
- **API Points**: ~14,400 points/day (assuming 1 point per request)

### After Optimization:
- **Per User**: 1 request/5 minutes = 12 requests/hour = 288 requests/day
- **Backend Cache**: 1 API call every 10 minutes = 6 calls/hour = 144 calls/day
- **10 Users**: 288 requests/day (all served from cache except 144 API calls)
- **API Points**: ~144 points/day (90% reduction!)

## Data Freshness

- **Maximum Data Age**: 15 minutes (10 min cache + 5 min polling interval)
- **Typical Data Age**: 5-10 minutes (cache refreshed every 10 min, users poll every 5 min)
- **Accuracy**: Maintained - PM2.5 readings don't change dramatically in 10-15 minute windows

## Cache Invalidation

The cache automatically expires after 10 minutes. The next request will:
1. Check cache (expired)
2. Fetch fresh data from PurpleAir API
3. Update cache with new data
4. Return fresh data to user

## Fallback Sources Also Cached

- PurpleAir Public Map endpoint
- OpenAQ API
- WPRDC (ACHD official data)

All fallback sources are cached for 10 minutes to reduce redundant API calls.

## Monitoring

Check cache status in API response:
```json
{
  "success": true,
  "cached": true,
  "cacheAgeSeconds": 245,
  "note": "Using cached data to reduce API point usage..."
}
```

## Future Optimizations (If Needed)

1. **Adaptive Caching**: Increase cache TTL during low-traffic hours
2. **Background Refresh**: Pre-fetch data before cache expires
3. **User-Specific Caching**: Cache per map bounds if users view different areas
4. **Compression**: Compress cached data to reduce Firestore storage costs

## Configuration

- **Cache TTL**: 10 minutes (600,000ms) - defined in `functions/src/index.ts`
- **Polling Interval**: 5 minutes (300,000ms) - defined in `frontend/src/hooks/useRealtimeSensorData.ts`

To adjust:
- Backend: Change `CACHE_TTL_MS` constant in `fetchPurpleAirSensorData` function
- Frontend: Change default parameter in `useRealtimeSensorData()` hook

