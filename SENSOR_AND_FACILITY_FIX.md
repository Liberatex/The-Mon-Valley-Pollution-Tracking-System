# Sensor and Facility Display Fix

## Issues Found

### 1. PurpleAir Sensors Not Showing
**Error:** `500 Internal Server Error` from `fetchPurpleAirSensorData`
**Root Cause:** PurpleAir API returning `402 Payment Required` status
- The API key exists in `.env` but may be invalid or require a paid subscription
- Error handling didn't properly catch 402 status code

### 2. Title V Facilities Not Showing
**Error:** `{"success":true,"count":0,"facilities":[]}`
**Root Cause:** Firestore database was empty - facilities not seeded

## Fixes Applied

### 1. Improved PurpleAir Error Handling
**File:** `functions/src/index.ts`

- Added specific handling for HTTP 402 (Payment Required)
- Enhanced error logging with detailed status codes and messages
- Returns proper HTTP status codes (402 instead of generic 500)
- Provides clear error messages to help diagnose API key issues

```typescript
if (error.response?.status === 402) {
  errorMessage = 'PurpleAir API subscription required. The API key may be valid but requires a paid subscription. Please check your PurpleAir account status.';
  statusCode = 402;
}
```

### 2. Seeded Title V Facilities
**Action:** Ran `seed-title-v-firebase.js` script

- Seeded 3 Title V facilities to Firestore:
  - U.S. Steel Clairton Coke Works (PA-CLAIRTON-001)
  - Edgar Thomson Steel Works (PA-BRADDOCK-001)
  - Irvin Plant (PA-DRAVOSBURG-001)

**Verification:**
```bash
curl http://localhost:5001/mv-pollution-tracking-system/us-central1/getTitleVFacilities
# Now returns: {"success":true,"count":3,"facilities":[...]}
```

## Current Status

### ✅ Title V Facilities
- **Status:** FIXED
- **Action:** Facilities seeded successfully
- **Expected:** Facilities should now appear on the map as red factory icons

### ⚠️ PurpleAir Sensors
- **Status:** API KEY ISSUE
- **Problem:** API returning 402 (Payment Required)
- **Action Required:**
  1. Check PurpleAir account status at https://www2.purpleair.com
  2. Verify API key is valid and account has active subscription
  3. Update `functions/.env` with correct API key if needed
  4. Restart Firebase emulators after updating API key

## Next Steps

### For PurpleAir Sensors:
1. **Check API Key:**
   ```bash
   cd functions
   cat .env | grep PURPLEAIR_API_KEY
   ```

2. **Verify Account Status:**
   - Visit https://www2.purpleair.com
   - Check if account has active API subscription
   - Some API endpoints require paid plans

3. **Test API Key:**
   ```bash
   curl -H "X-API-Key: YOUR_KEY_HERE" \
     "https://api.purpleair.com/v1/sensors?fields=sensor_index,name&nwlng=-80.3&nwlat=40.5&selng=-79.6&selat=40.0"
   ```

4. **If API Key is Invalid:**
   - Get new API key from PurpleAir
   - Update `functions/.env` file
   - Restart Firebase emulators

### For Title V Facilities:
- ✅ Already fixed - facilities should appear on map
- If not visible, check browser console for errors
- Verify `showFacilities` checkbox is checked on map

## Testing

### Test Title V Facilities:
1. Open http://localhost:3000
2. Navigate to Sensor Map page
3. Check "Title V Facilities" checkbox (should be checked by default)
4. Should see 3 red factory icons on map:
   - Clairton (south of Pittsburgh)
   - Braddock (east of Pittsburgh)
   - Dravosburg (south of Pittsburgh)

### Test PurpleAir Sensors:
1. Fix API key issue first (see above)
2. After fixing, sensors should appear as colored circles
3. Check browser console for:
   - `✅ Updating sensors from realtime hook: X sensors`
   - `✅ Adding sensor-points layer`

## Error Messages to Look For

### PurpleAir:
- `402 Payment Required` - API key needs subscription
- `401 Unauthorized` - Invalid API key
- `403 Forbidden` - API key lacks permissions

### Title V:
- `count: 0` - Facilities not seeded (now fixed)
- `Error fetching Title V facilities` - Check emulator logs

---

## Summary

✅ **Title V Facilities:** Fixed - seeded successfully
⚠️ **PurpleAir Sensors:** API key issue - requires account verification/subscription


