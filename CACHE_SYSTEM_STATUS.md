# Cache System Status

## Current Configuration

### Backend Cache Settings
- **TTL**: 30 minutes (1,800,000 ms)
- **Location**: Firestore `sensor_cache/purpleair_sensors`
- **Write**: Awaited (ensures completion before response)
- **Read**: Checked first before API call

### Frontend Polling
- **Interval**: 15 minutes (900,000 ms)
- **Behavior**: Calls backend function every 15 minutes

## Expected Behavior

1. **First Request**: 
   - Cache check: No cache found
   - Fetch from PurpleAir API
   - Write cache to Firestore (awaited)
   - Return fresh data

2. **Subsequent Requests (within 30 min)**:
   - Cache check: Cache found and valid
   - Return cached data (no API call)
   - Save API credits!

3. **After 30 Minutes**:
   - Cache check: Cache expired
   - Fetch fresh data from API
   - Update cache
   - Return fresh data

## API Call Reduction

### Without Cache
- Frontend polls every 15 minutes
- = 4 calls/hour = 96 calls/day
- **Cost**: ~96 API points/day

### With Cache (30 min TTL, 15 min polling)
- Cache lasts 30 minutes
- Frontend polls every 15 minutes
- **Expected**: 2 API calls/hour = 48 calls/day
- **Reduction**: 50% fewer API calls

### Optimal (60 min TTL, 15 min polling)
- Cache lasts 60 minutes
- Frontend polls every 15 minutes
- **Expected**: 1 API call/hour = 24 calls/day
- **Reduction**: 75% fewer API calls

## Current Issue

Cache is not being used - requests are still hitting the API every time.

**Possible Causes:**
1. Cache write failing silently
2. Cache document not being created
3. Cache check logic issue
4. Firestore permissions issue

## Next Steps

1. Check Firestore console to verify cache document exists
2. Review function logs for cache write errors
3. Verify Firestore rules allow cache writes
4. Test cache manually by checking Firestore document

## Verification Commands

```bash
# Test cache
curl "https://fetchpurpleairsensordata-kuigttnscq-uc.a.run.app" | jq '.cached, .source'

# Check function logs
firebase functions:log --only fetchPurpleAirSensorData --limit 50 | grep -i cache
```

