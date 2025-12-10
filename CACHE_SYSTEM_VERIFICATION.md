# Cache System Verification

## Cache Configuration

### Backend Cache (Firestore)
- **TTL**: 30 minutes (1,800,000 milliseconds)
- **Location**: `sensor_cache/purpleair_sensors` document
- **Behavior**: 
  - First request fetches from PurpleAir API
  - Subsequent requests within 30 minutes use cached data
  - Cache is automatically refreshed after 30 minutes

### Frontend Polling
- **Interval**: 15 minutes (900,000 milliseconds)
- **Behavior**: 
  - Frontend polls every 15 minutes
  - Backend cache lasts 30 minutes
  - This means frontend will get cached data for 2 consecutive polls before cache expires

## API Call Reduction

### Without Cache
- Frontend polls every 15 minutes = 4 calls/hour = 96 calls/day
- Each call = 1 API request to PurpleAir
- **Total**: ~96 API points per day

### With Cache (Current Setup)
- Backend caches for 30 minutes
- Frontend polls every 15 minutes
- Cache hit rate: ~50% (every other request uses cache)
- **Actual API calls**: ~48 API points per day
- **Reduction**: ~50% fewer API calls

### Optimal Configuration (Recommended)
To further reduce API calls:
- Increase cache TTL to 60 minutes (1 hour)
- Keep frontend polling at 15 minutes
- **Result**: ~24 API calls per day (75% reduction)

## Current Status

✅ **Cache is working**: Verified that second request uses cached data
✅ **Cache TTL**: 30 minutes configured
✅ **Frontend polling**: 15 minutes configured
✅ **Cache persistence**: Data stored in Firestore

## Recommendations

1. **Increase cache TTL to 60 minutes** for even better API point savings
2. **Monitor cache hit rate** in function logs
3. **Consider extending cache to 2 hours** if data freshness allows

## Testing Cache

To verify cache is working:
```bash
# First request (should fetch from API)
curl "https://fetchpurpleairsensordata-kuigttnscq-uc.a.run.app" | jq '.cached, .source'

# Second request immediately after (should use cache)
curl "https://fetchpurpleairsensordata-kuigttnscq-uc.a.run.app" | jq '.cached, .cacheAgeSeconds'
```

Expected results:
- First request: `cached: false`, `source: "PurpleAir API"`
- Second request: `cached: true`, `cacheAgeSeconds: < 10`

