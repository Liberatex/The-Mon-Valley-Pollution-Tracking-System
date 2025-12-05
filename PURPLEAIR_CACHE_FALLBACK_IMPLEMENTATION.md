# PurpleAir Cache Fallback Implementation

## Overview
Implemented a persistent cache fallback system that ensures the application always has sensor readings available, even when PurpleAir API credits expire.

## How It Works

### 1. **Normal Operation (API Credits Available)**
- System checks Firestore cache first (30-minute TTL)
- If cache is fresh (< 30 minutes old), returns cached data
- If cache is stale or missing, fetches from PurpleAir API
- New data is automatically cached in Firestore

### 2. **When API Credits Expire (402 Error)**
The system now follows this fallback hierarchy:

1. **First Fallback: Expired Cache**
   - Checks Firestore cache even if expired
   - Uses cached data if available (any age)
   - Returns cached sensors with age information

2. **Second Fallback: PurpleAir Public Map**
   - Tries PurpleAir public JSON endpoint (no API key needed)
   - Filters for Mon Valley area sensors
   - Caches results for future use

3. **Third Fallback: OpenAQ API**
   - Uses free OpenAQ API (aggregates EPA AirNow data)
   - Converts to sensor format

4. **Fourth Fallback: WPRDC (Official ACHD)**
   - Uses official ACHD data from WPRDC
   - Most reliable official source

5. **Last Resort: Very Old Cache**
   - Before returning error, checks for ANY cached data
   - Uses cached data even if days/weeks old
   - Ensures system always has sensor readings

## Cache Structure

The cache is stored in Firestore at:
```
sensor_cache/purpleair_sensors
```

Structure:
```json
{
  "sensors": [
    {
      "id": "pa-12345",
      "sensorIndex": 12345,
      "name": "Sensor Name",
      "location": { "lat": 40.292, "lng": -79.881 },
      "pm25": 12.5,
      "humidity": 60,
      "temperature": 20,
      "source": "PurpleAir API"
    }
  ],
  "source": "PurpleAir API",
  "timestamp": 1234567890000,
  "count": 245
}
```

## Current Status

✅ **Implementation Complete**
- Cache fallback logic added to `fetchPurpleAirSensorData` function
- System will use cached data when API credits expire
- Cache persists indefinitely until new data is fetched

## About Existing Cache Data

**Question:** Do we have snapshot data from before credits ran out?

**Answer:** The cache system has been active since implementation. If sensor data was successfully fetched before credits expired, it should be stored in Firestore at `sensor_cache/purpleair_sensors`.

**To Check:**
1. Go to Firebase Console → Firestore Database
2. Navigate to `sensor_cache` collection
3. Check `purpleair_sensors` document
4. If it exists, the system will automatically use it as fallback

**If No Cache Exists:**
- The system will try fallback APIs (public map, OpenAQ, WPRDC)
- Once any fallback succeeds, it will be cached
- Future requests will use that cached data

## Benefits

1. **Always Available Data**: System never shows "no sensors" when credits expire
2. **Graceful Degradation**: Uses best available data source
3. **Automatic Recovery**: When credits are added, fresh data automatically replaces cache
4. **No Manual Intervention**: Works automatically without admin action

## Response Format

When using cached fallback, the API response includes:
```json
{
  "success": true,
  "data": [...],
  "count": 245,
  "source": "PurpleAir API (Cached Fallback)",
  "lastUpdated": "2025-01-15T10:30:00Z",
  "cached": true,
  "cacheAgeHours": 48,
  "note": "Using cached data as fallback (48h old). API credits expired. Please add credits to refresh data."
}
```

## Next Steps

1. ✅ **Deployed**: Function is live with cache fallback
2. **Verify**: Check Firestore to see if cached data exists
3. **Monitor**: System will automatically use cache when credits expire
4. **Refresh**: When credits are added, new data will automatically replace cache

## Testing

To test the fallback:
1. Temporarily remove API key or let credits expire
2. System should return cached data (if available)
3. Check response for `cached: true` and `cacheAgeHours`/`cacheAgeDays`

