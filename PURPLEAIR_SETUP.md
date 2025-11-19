# PurpleAir Sensor Integration Setup

## ✅ Backend Function Created

A new Cloud Function `getPurpleAirSensors` has been created to securely fetch PurpleAir sensor data.

**Location**: `functions/src/index.ts`

**Endpoint**: 
- Production: `https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/getPurpleAirSensors`
- Emulator: `http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1/getPurpleAirSensors`

## 🔑 Setting Up PurpleAir API Key

### Step 1: Get a PurpleAir API Key

1. Register at https://www2.purpleair.com
2. Log in to your account
3. Go to Account Settings → API Keys
4. Create a new API key (Read key is sufficient)

### Step 2: Configure the API Key

#### For Local Development (Emulator):

Add to `functions/.env`:
```
PURPLEAIR_API_KEY=your_api_key_here
```

#### For Production (Firebase):

Set the environment variable in Firebase Functions:
```bash
cd functions
firebase functions:config:set purpleair.api_key="your_api_key_here"
```

Or use the newer method:
```bash
firebase functions:secrets:set PURPLEAIR_API_KEY
# Then enter your API key when prompted
```

Then update `functions/src/index.ts` to use:
```typescript
const apiKey = functions.config().purpleair?.api_key || process.env.PURPLEAIR_API_KEY;
```

Or for secrets:
```typescript
import { defineSecret } from 'firebase-functions/params';
const purpleAirApiKey = defineSecret('PURPLEAIR_API_KEY');
```

## 📍 What the Function Returns

The function fetches sensors in the Mon Valley area (Clairton region) and returns:

```json
{
  "success": true,
  "data": [
    {
      "id": "pa-12345",
      "sensorIndex": 12345,
      "name": "Sensor Name",
      "location": {
        "lat": 40.292,
        "lng": -79.881
      },
      "pm25": 35.2,
      "humidity": 65.0,
      "temperature": 72.5,
      "source": "PurpleAir",
      "locationType": 0
    }
  ],
  "count": 25,
  "source": "PurpleAir API",
  "lastUpdated": "2025-01-XX..."
}
```

## 🗺️ Coverage Area

The function searches for sensors in this bounding box:
- **NW Corner**: 40.5°N, -80.3°W
- **SE Corner**: 40.0°N, -79.6°W

This covers:
- Clairton
- Braddock
- Dravosburg
- Liberty
- And surrounding Mon Valley communities

## 🔄 Frontend Integration

The frontend (`SensorMap.tsx`) now:
1. ✅ Calls the backend function instead of PurpleAir API directly
2. ✅ Handles API key configuration errors gracefully
3. ✅ Shows mock data only if API key is not configured
4. ✅ Displays real sensor data when API key is set

## 🧪 Testing

### Test the Backend Function:

```bash
# With emulator running
curl http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1/getPurpleAirSensors

# Or in production
curl https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/getPurpleAirSensors
```

### Expected Results:

**With API Key Configured:**
- Returns array of real PurpleAir sensors (typically 10-50 sensors)
- Each sensor has real-time PM2.5 data
- Sensors are filtered to only valid outdoor sensors

**Without API Key:**
- Returns `success: false` with message about API key configuration
- Frontend falls back to 3 mock sensors

## 🚀 Deployment

After setting up the API key:

1. **Deploy the function:**
   ```bash
   cd functions
   npm run build
   firebase deploy --only functions:getPurpleAirSensors
   ```

2. **Test in production:**
   - Open the Sensor Map in your app
   - You should see real PurpleAir sensors instead of mock data
   - Sensors will show actual PM2.5 readings

## 📊 Benefits

1. **Security**: API key stays on the server, not exposed to frontend
2. **Reliability**: Backend handles API errors and retries
3. **Performance**: Backend can cache data if needed
4. **Consistency**: All PurpleAir data comes through one endpoint

## 🔍 Troubleshooting

### No sensors showing:
1. Check API key is set correctly
2. Verify API key has read permissions
3. Check Firebase Functions logs: `firebase functions:log`
4. Test the endpoint directly with curl

### Mock sensors still showing:
- Backend function is returning `success: false`
- Check browser console for error messages
- Verify backend function is deployed

### API errors:
- 401: Invalid API key
- 403: API key doesn't have required permissions
- 429: Rate limit exceeded (wait and retry)

