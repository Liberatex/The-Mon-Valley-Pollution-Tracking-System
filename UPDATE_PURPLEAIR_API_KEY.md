# How to Update PurpleAir API Key

## Step 1: Set the New API Key in Firebase Secrets

```bash
firebase functions:secrets:set PURPLEAIR_API_KEY
```

When prompted, paste your new PurpleAir API key.

## Step 2: Verify the Key is Set

```bash
firebase functions:secrets:access PURPLEAIR_API_KEY
```

This should display your new API key.

## Step 3: Redeploy the Function (Required for Secrets to Take Effect)

```bash
firebase deploy --only functions:fetchPurpleAirSensorData
```

## Step 4: Test the API

```bash
curl "https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/fetchPurpleAirSensorData"
```

You should see:
- `"success": true`
- `"cached": false` (first request)
- Sensor data with count > 0

## Step 5: Test Caching (Second Request)

Wait a few seconds, then make the same request again:

```bash
curl "https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/fetchPurpleAirSensorData"
```

You should see:
- `"success": true`
- `"cached": true` (served from cache)
- `"cacheAgeSeconds": < 600` (less than 10 minutes)

## What Happens Next

Once your new API key is set and working:

1. **First Request**: Fetches from PurpleAir API → Caches for 10 minutes
2. **Subsequent Requests** (within 10 min): Served from cache → **No API points used!**
3. **After 10 Minutes**: Next request fetches fresh data → Updates cache

## API Point Savings

- **Before**: Every request = 1 API point
- **After**: 1 API point every 10 minutes (regardless of number of users)
- **Savings**: ~90% reduction in API point usage

## Current Status

The caching system is **already deployed and active**. Once you update the API key, it will automatically start caching and reducing your API point usage.

