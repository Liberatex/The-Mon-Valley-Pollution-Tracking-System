# How to Verify Cache in Firestore

## Step-by-Step Instructions

### 1. Check Firestore Console
1. Go to [Firebase Console](https://console.firebase.google.com/project/mv-pollution-tracking-system/firestore)
2. Click on **Firestore Database** in the left sidebar
3. Look for collection: **`sensor_cache`**
4. Look for document: **`purpleair_sensors`**

### 2. What to Look For
If the cache document exists, you should see:
- **Document ID**: `purpleair_sensors`
- **Fields**:
  - `sensors`: Array of sensor objects
  - `source`: String (e.g., "PurpleAir API")
  - `timestamp`: Number (milliseconds since epoch)
  - `count`: Number (number of sensors)

### 3. If Cache Doesn't Exist
The cache is written automatically when:
1. API successfully fetches data from PurpleAir
2. Function completes successfully
3. Cache write completes without errors

### 4. Manual Cache Creation (If Needed)
If cache isn't being created automatically, we can:
1. Check function logs for errors
2. Verify Firestore rules allow writes
3. Test cache write manually

### 5. Verify Cache is Working
After cache is created:
1. Make first API call (should fetch from API)
2. Wait a few seconds
3. Make second API call (should use cache)
4. Check response for `"cached": true`

## Current Status
- ✅ Cache write code is implemented
- ✅ Cache write is awaited (ensures completion)
- ✅ Detailed logging added
- ⏳ Waiting to verify cache document appears in Firestore

## Next Steps
1. Make an API call to trigger cache write
2. Check Firestore console for `sensor_cache/purpleair_sensors` document
3. If document appears, cache is working!
4. If document doesn't appear, check function logs for errors

