# Checking Cache Status

## Current Issue
The API is returning a 402 error and saying "No cached data available", which means there's no cache in Firestore.

## To Verify Cache Exists

### Option 1: Check Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/project/mv-pollution-tracking-system/firestore)
2. Navigate to Firestore Database
3. Look for collection: `sensor_cache`
4. Check document: `purpleair_sensors`
5. If it exists, you should see:
   - `sensors`: Array of sensor objects
   - `source`: String (e.g., "PurpleAir API")
   - `timestamp`: Number (milliseconds since epoch)
   - `count`: Number of sensors

### Option 2: Check Function Logs
Run this command to see recent logs:
```bash
firebase functions:log --only fetchPurpleAirSensorData --limit 50
```

Look for:
- `🔍 Checking Firestore cache for fallback data...`
- `📦 Cache document exists: true/false`
- `✅ Using cached sensor data as fallback`

### Option 3: Test API Directly
```bash
curl "https://fetchpurpleairsensordata-kuigttnscq-uc.a.run.app" | python3 -m json.tool
```

If cache exists, you should see:
- `"success": true`
- `"cached": true`
- `"cacheAgeHours"` or `"cacheAgeDays"`
- `"data"`: Array of sensors

## If No Cache Exists

If there's no cache, the system will:
1. Try PurpleAir public map endpoint
2. Try OpenAQ API
3. Try WPRDC (ACHD data)
4. Return error if all fail

**To create initial cache:**
- Once API credits are added and a successful fetch happens, data will be cached automatically
- The cache will then be used as fallback when credits expire again

## Next Steps

1. **Check if cache exists** using Firebase Console
2. **If cache exists but not being used**: Check function logs for errors
3. **If no cache exists**: We need to either:
   - Wait for API credits to be added and let system cache data
   - Manually seed cache with previous sensor data (if available)

