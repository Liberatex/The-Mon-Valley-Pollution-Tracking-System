# PurpleAir API Key Setup for 100+ Sensors

## Current Issue

The PurpleAir API is returning **402 Payment Required** because the API key accounts don't have credits:
- API Key 1: `A85B7FDB-CFD9-11F0-B596-4201AC1DC123` - Balance: -42,050 points
- API Key 2: `658398DE-68A7-11F0-AF66-42010A800028` - Balance: -20,588 points

## Solution: Use API Key with Credits

To get 100+ PurpleAir sensors working, you need an API key with available credits.

### Step 1: Get API Key with Credits

1. Go to https://develop.purpleair.com/
2. Log in with your Google account
3. Check your account balance (should be > 0 points)
4. If balance is low/negative, add credits:
   - Go to Account Settings → Billing
   - Purchase points (1 million points provided on signup)
5. Copy your API key

### Step 2: Set API Key in Firebase Secrets

```bash
cd /Users/liberatex/pullution_tracker/The-Mon-Valley-Pollution-Tracking-System

# Set the secret with your working API key
firebase functions:secrets:set PURPLEAIR_API_KEY
# When prompted, paste your API key with credits
```

### Step 3: Update functions/.env (for local testing)

```bash
# Edit functions/.env
PURPLEAIR_API_KEY=your_working_api_key_here
```

### Step 4: Redeploy Function

```bash
firebase deploy --only functions:fetchPurpleAirSensorData
```

## Expected Result

After setting an API key with credits:
- ✅ Function returns 100+ sensors
- ✅ Sensors appear on map as colored circles
- ✅ Real-time PM2.5 readings from PurpleAir network
- ✅ Risk zones generate from real sensor data

## Current Fallback Behavior

If API key doesn't have credits, the function will:
1. Try PurpleAir API (fails with 402)
2. Try OpenAQ (free EPA AirNow data) - limited sensors
3. Try WPRDC (official ACHD data) - 1 sensor
4. Return error if all fail

**To get 100+ sensors, you MUST use a PurpleAir API key with credits.**

