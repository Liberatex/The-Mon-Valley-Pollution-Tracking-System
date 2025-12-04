# How to Set PurpleAir API Key for Production

## Important: .env Files Don't Work in Production!

The `.env` files only work when running the Firebase emulator locally. For production (deployed functions), you **must** use Firebase Secrets.

## Step-by-Step Instructions

### 1. Set the Secret

```bash
firebase functions:secrets:set PURPLEAIR_API_KEY
```

When prompted, paste your new PurpleAir API key and press Enter.

### 2. Verify the Secret is Set

```bash
firebase functions:secrets:access PURPLEAIR_API_KEY
```

This should display your API key (first few characters).

### 3. Redeploy the Function (REQUIRED!)

After setting a secret, you **must** redeploy the function for it to take effect:

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

## Troubleshooting

If you still get errors after setting the secret:

1. **Check the secret is set**: `firebase functions:secrets:list`
2. **Verify you redeployed**: The function must be redeployed after setting secrets
3. **Check API key validity**: Make sure the key has credits/points in your PurpleAir account
4. **Check logs**: `firebase functions:log --only fetchPurpleAirSensorData`

## Current Status

The caching system is deployed and will reduce API point usage by ~90% once the new key is working!

