# How to Update PurpleAir API Key in Production

## ⚠️ CRITICAL: .env Files Don't Work in Production!

The `.env` files only work when running Firebase emulators locally. For production (live site), you **MUST** use Firebase Secrets.

## Step-by-Step Instructions

### 1. Set the New API Key as a Firebase Secret

```bash
firebase functions:secrets:set PURPLEAIR_API_KEY
```

When prompted, paste your new PurpleAir API key and press Enter.

### 2. Verify the Secret is Set

```bash
firebase functions:secrets:access PURPLEAIR_API_KEY
```

This should display your new API key.

### 3. Redeploy the Function (REQUIRED!)

**This step is critical!** After setting a secret, you **must** redeploy the function for it to take effect:

```bash
firebase deploy --only functions:fetchPurpleAirSensorData
```

### 4. Test the API

```bash
curl "https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/fetchPurpleAirSensorData"
```

You should see:
- `"success": true`
- `"count": <number>` (should be > 0)
- Sensor data array

## Why This is Necessary

- **Local/Emulator**: Uses `.env` files
- **Production**: Uses Firebase Secrets (automatically injected as `process.env.PURPLEAIR_API_KEY`)

The function code checks both, but in production, only Firebase Secrets work.

## Current Status

✅ **Optimizations Deployed:**
- 15-minute polling (was 60s/5min)
- 30-minute cache TTL
- Expected: ~48 API calls/day TOTAL

⏳ **Waiting For:**
- API key to be set in Firebase Secrets
- Function redeployment
- API key account to have credits

## After Setup

Once the new API key is working:
1. Monitor API point usage - should be dramatically reduced
2. Verify cache is working (check for `"cached": true` in responses)
3. Confirm sensors are loading on the map

## Troubleshooting

If you still get 402 errors after setting the secret:
1. **Check the secret is set**: `firebase functions:secrets:access PURPLEAIR_API_KEY`
2. **Verify you redeployed**: The function must be redeployed after setting secrets
3. **Check API key validity**: Make sure the key has credits/points in your PurpleAir account
4. **Check logs**: `firebase functions:log --only fetchPurpleAirSensorData`

