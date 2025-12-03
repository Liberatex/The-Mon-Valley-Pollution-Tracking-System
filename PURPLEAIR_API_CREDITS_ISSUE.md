# PurpleAir API Credits Issue

## The Problem

The PurpleAir API is returning **402 Payment Required** because:
- ✅ API key is **valid** and loading correctly
- ❌ Account has **negative balance** (-20,588 points)
- ❌ Account needs **credits/subscription** to make API calls

## Current Status

**API Response:**
```json
{
  "error": "PaymentRequiredError",
  "description": "Payment is required to make this api call. Current balance is -20588 points."
}
```

## Why Production Works But Local Doesn't

If your **live/production version works**, it's likely because:

1. **Production uses a different API key** (set in Firebase Functions config/secrets)
2. **Production API key has credits** while local one doesn't
3. **Production might be using cached data** or a different data source

## Solutions

### Option 1: Use Production API Key Locally (Recommended)

If production works, get the API key from Firebase:

```bash
# Check Firebase Functions config
firebase functions:config:get

# Or check secrets
firebase functions:secrets:access PURPLEAIR_API_KEY
```

Then update `functions/.env`:
```env
PURPLEAIR_API_KEY=<production_api_key_here>
```

### Option 2: Add Credits to Current Account

1. Go to https://www2.purpleair.com
2. Log in to your account
3. Navigate to Account Settings → Billing/Credits
4. Add credits to your account
5. Restart emulators

### Option 3: Create New API Key with Credits

1. Create a new PurpleAir account or use existing account with credits
2. Generate a new API key
3. Update `functions/.env` with the new key

## What I Changed

✅ **Removed mock data fallback** - Now returns proper error message instead of fake data
✅ **Clear error message** - Explains exactly what's wrong (account needs credits)

## Next Steps

1. **Check what API key production uses:**
   ```bash
   firebase functions:config:get
   ```

2. **Update local `.env` with production key** (if different)

3. **OR add credits to current account**

4. **Restart emulators** after updating

5. **Test again:**
   ```bash
   curl http://localhost:5001/mv-pollution-tracking-system/us-central1/fetchPurpleAirSensorData
   ```

## Expected Result After Fix

Once you have an API key with credits:
- ✅ API returns real sensor data
- ✅ Sensors appear on map as colored circles
- ✅ Real-time PM2.5 readings from PurpleAir network

---

**Status:** ⚠️ API key valid but account needs credits. Check production API key or add credits to account.


