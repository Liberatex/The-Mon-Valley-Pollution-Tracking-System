# ✅ PurpleAir Real Sensor Integration Complete

## What Was Changed

### 1. Backend Function Created
- **New Function**: `getPurpleAirSensors` in `functions/src/index.ts`
- **Purpose**: Securely fetches PurpleAir sensor data from the server
- **Benefits**: 
  - API key stays on server (not exposed to frontend)
  - Better error handling
  - Can add caching/rate limiting later

### 2. Frontend Updated
- **File**: `frontend/src/components/SensorMap.tsx`
- **Change**: Now calls backend function instead of PurpleAir API directly
- **Removed**: Direct API key usage from frontend
- **Added**: Proper error handling and fallback logic

## 🔑 To Get Real PurpleAir Sensors

### Step 1: Get PurpleAir API Key

1. Go to https://www2.purpleair.com
2. Create an account or log in
3. Navigate to: **Account Settings → API Keys**
4. Create a new **Read Key** (this is sufficient for fetching public sensor data)
5. Copy your API key

### Step 2: Configure the API Key

#### Option A: For Local Development (Emulator)

Create or edit `functions/.env`:
```bash
PURPLEAIR_API_KEY=your_api_key_here
```

Then restart the Firebase emulator:
```bash
cd functions
firebase emulators:start --only functions
```

#### Option B: For Production (Firebase Cloud Functions)

Set the environment variable:
```bash
cd functions
firebase functions:config:set purpleair.api_key="your_api_key_here"
```

Or use Firebase Secrets (recommended for production):
```bash
firebase functions:secrets:set PURPLEAIR_API_KEY
# Enter your API key when prompted
```

Then update the function code to use secrets (if using secrets method).

### Step 3: Deploy the Function

```bash
cd functions
npm run build
firebase deploy --only functions:getPurpleAirSensors
```

### Step 4: Test

1. Open your app at http://localhost:3000
2. Navigate to the **Sensor Map**
3. You should see real PurpleAir sensors instead of mock data
4. Check browser console for: `✅ Loaded X real PurpleAir sensors`

## 📍 What You'll See

### With API Key Configured:
- **10-50+ real PurpleAir sensors** in the Mon Valley area
- **Real-time PM2.5 readings** from each sensor
- **Actual sensor names** from PurpleAir network
- **Location data** from community volunteers

### Without API Key:
- **3 mock sensors** (Clairton, Braddock, Dravosburg)
- **Sample PM2.5 values** (not real-time)
- Console message: "PurpleAir API key not configured"

## 🗺️ Coverage Area

The function searches for sensors in this bounding box:
- **Northwest**: 40.5°N, -80.3°W
- **Southeast**: 40.0°N, -79.6°W

This covers:
- ✅ Clairton
- ✅ Braddock  
- ✅ Dravosburg
- ✅ Liberty
- ✅ All Mon Valley communities

## 🔍 Testing the Backend Function

### Test with Emulator:
```bash
curl http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1/getPurpleAirSensors
```

### Test in Production:
```bash
curl https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/getPurpleAirSensors
```

### Expected Response (with API key):
```json
{
  "success": true,
  "data": [
    {
      "id": "pa-12345",
      "name": "Clairton Community Sensor",
      "location": { "lat": 40.292, "lng": -79.881 },
      "pm25": 35.2,
      "source": "PurpleAir"
    }
    // ... more sensors
  ],
  "count": 25,
  "source": "PurpleAir API"
}
```

## 🐛 Troubleshooting

### Still seeing mock sensors?

1. **Check API key is set:**
   ```bash
   # For emulator
   cat functions/.env | grep PURPLEAIR
   
   # For production
   firebase functions:config:get
   ```

2. **Check function is deployed:**
   ```bash
   firebase functions:list
   ```

3. **Check browser console:**
   - Look for error messages
   - Should see: "Fetching PurpleAir sensors from backend..."
   - Should see: "✅ Loaded X real PurpleAir sensors"

4. **Check function logs:**
   ```bash
   firebase functions:log --only getPurpleAirSensors
   ```

### Common Errors:

- **401 Unauthorized**: Invalid API key
- **403 Forbidden**: API key doesn't have read permissions
- **429 Too Many Requests**: Rate limit - wait and retry
- **Network Error**: Backend function not running or not deployed

## 📊 Current Status

✅ **Backend Function**: Created and ready
✅ **Frontend Integration**: Updated to use backend
✅ **Error Handling**: Graceful fallback to mock data
⏳ **API Key**: Needs to be configured (see Step 2 above)

## 🚀 Next Steps

1. Get your PurpleAir API key (Step 1)
2. Configure it in Firebase Functions (Step 2)
3. Deploy the function (Step 3)
4. Test the Sensor Map (Step 4)
5. Enjoy real-time PurpleAir sensor data! 🎉

## 📝 Notes

- The API key is now stored securely on the server
- Frontend no longer needs the API key
- Backend handles all PurpleAir API communication
- Better security and easier to manage

