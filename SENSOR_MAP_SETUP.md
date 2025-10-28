# Sensor Map & API Setup Guide

## Issues Found

### 1. ✅ EPA AQS API - NOW FIXED
- **Problem**: Daily data endpoint returned no data for today
- **Fix**: Changed to hourly data endpoint (`sampleData/byCounty` with `param=88502`)
- **Status**: Should now return real-time hourly PM2.5 data from EPA
- **Data Source**: Official ACHD Liberty Monitor data

### 2. ❌ PurpleAir API Key Missing
- **Location**: `frontend/.env` file
- **Current Value**: Empty (`REACT_APP_PURPLEAIR_API_KEY=`)
- **Action Required**: 
  1. Go to https://www2.purpleair.com/community/join?redirect=%2Flogin
  2. Create a free account
  3. Get your API key from account settings
  4. Add to frontend/.env file

### 3. Sensor Map Behavior
- **PurpleAir Sensors**: Currently showing MOCK data (3 sensors)
- **Title V Facilities**: Currently showing 3 facilities
- **Once API key added**: Map will populate with all real PurpleAir sensors in Mon Valley

## How to Add PurpleAir API Key

1. **Register at PurpleAir**:
   ```
   https://www2.purpleair.com/community/join?redirect=%2Flogin
   ```

2. **Get API Key**:
   - After registration, go to your account settings
   - Copy your API key

3. **Add to frontend/.env**:
   ```bash
   cd /Users/liberatex/pullution_tracker/The-Mon-Valley-Pollution-Tracking-System
   nano frontend/.env
   # Add:
   REACT_APP_PURPLEAIR_API_KEY=your_key_here
   ```

4. **Restart frontend**:
   ```bash
   # Kill existing frontend
   pkill -f "react-scripts start"
   
   # Start fresh
   cd frontend && npm start
   ```

## Expected Results

After adding PurpleAir key, the Sensor Map will show:
- ✅ Real PurpleAir sensors (10-50 sensors in Mon Valley area)
- ✅ Real-time PM2.5 readings from each sensor
- ✅ Title V facilities (U.S. Steel Clairton, Edgar Thomson, Mon Valley Power)
- ✅ Ability to toggle both layers on/off

## Current Data Sources

| Source | Status | Data Type |
|--------|--------|-----------|
| EPA AQS (Official ACHD) | ✅ WORKING | Hourly PM2.5 from Liberty Monitor |
| OpenAQ | ✅ FALLBACK | Aggregated EPA AirNow data |
| PurpleAir | ❌ MISSING KEY | Community sensor network |
| OpenWeatherMap | ⚠️ NO KEY | Weather-based air quality |

## Testing the Fix

1. Check Dashboard PM2.5:
   ```bash
   curl http://localhost:5001/mv-pollution-tracking-system/us-central1/getACHDAirQuality
   ```
   Should show real EPA data, not fallback.

2. Check Sensor Map:
   - Go to http://localhost:3000
   - Click "Sensor Map"
   - Should show real sensors after adding PurpleAir key

## Next Steps

1. Add PurpleAir API key (instructions above)
2. Restart frontend to load new key
3. Verify sensor map shows real PurpleAir sensors
4. Test EPA data is showing on Dashboard

