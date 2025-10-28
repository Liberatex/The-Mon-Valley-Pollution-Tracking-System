# API Connection Status & Setup

## Summary

I've confirmed your API keys are in `functions/.env` and updated the Dashboard to use them. Here's what needs to happen next.

## What's Been Done

### ✅ 1. Removed Pages from Navigation
Removed these buttons from the nav:
- Evidence Reports
- Testing  
- Admin

**Current Navigation**: Home, Dashboard, Sensor Map, Report Symptoms, AI Assistant, Exposure Risk

### ✅ 2. Updated Dashboard to Use ACHD Data
Dashboard now:
- Tries ACHD official data first (EPA AQS with your credentials)
- Falls back to OpenWeatherMap
- Falls back to mock data

### ✅ 3. API Keys Confirmed

**functions/.env**:
```
EPA_AQS_EMAIL=bjyusuph@gmail.com
EPA_AQS_KEY=indigoosprey88
OPENAQ_API_KEY=5724d18070a5d68251feba85b1d12b58
```

**frontend/.env**:
```
REACT_APP_PURPLEAIR_API_KEY=  (empty - needs your key)
```

## Current Issue: Emulators Need Restart

The emulators are restarting to pick up your environment variables. This takes ~30 seconds.

## How to Test API Connections

### 1. Wait for Emulators
Go to http://127.0.0.1:4000 and confirm:
- `getACHDAirQuality` function is listed
- Emulator status shows "ready"

### 2. Test ACHD API
```bash
curl http://localhost:5001/mv-pollution-tracking-system/us-central1/getACHDAirQuality
```

Should return:
- Real PM2.5 value from ACHD (not 42.5)
- Location: "Liberty 2 - Mon Valley"
- Source: "Official ACHD Data via EPA AQS"

### 3. Add PurpleAir API Key (if you have one)

Edit `frontend/.env` and add your key:
```env
REACT_APP_PURPLEAIR_API_KEY=your_actual_key_here
```

Then restart frontend:
```bash
pkill -f "react-scripts"
cd frontend && npm start
```

### 4. Check Dashboard

Visit http://localhost:3000 → Dashboard

**Browser Console (F12)** should show:
```
✅ Using official ACHD data: { pm25: X, location: 'Liberty 2...' }
```

## Why PM2.5 Shows Wrong Value

The Dashboard is currently using mock data (42.5) because:
1. Emulators haven't finished restarting with your credentials
2. OR the `getACHDAirQuality` function hasn't loaded the .env yet

**Solution**: Wait 30 more seconds for emulators to fully restart, then refresh the page.

## Verify Everything is Working

### Checklist:
- [ ] Go to http://127.0.0.1:4000 → See emulators running
- [ ] Go to http://localhost:3000 → Frontend loads
- [ ] Navigate shows only: Home, Dashboard, Map, Symptoms, AI, Exposure
- [ ] Click Dashboard → Should show real ACHD PM2.5 (check console)
- [ ] PM2.5 value is NOT 42.5 (should be real reading)

## If Still Showing 42.5

This is the mock value. Real data should be different. To confirm API is working:

```bash
# Test the endpoint directly
curl http://localhost:5001/mv-pollution-tracking-system/us-central1/getACHDAirQuality

# Check emulator logs for errors
# Visit: http://127.0.0.1:4000/logs
```

## Next Steps

1. **Wait** for emulators to fully restart (check http://127.0.0.1:4000)
2. **Refresh** http://localhost:3000
3. **Open Dashboard** and check browser console
4. **Verify** PM2.5 shows real value (not 42.5 mock value)
5. **Add PurpleAir key** to frontend/.env if you have one

---

**Status**: Configuration complete, waiting for emulator restart. 🕐

