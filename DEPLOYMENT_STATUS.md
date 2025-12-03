# 🚀 Local Deployment Status

## ✅ **SERVICES RUNNING**

### Firebase Emulators
- ✅ **Functions Emulator**: Running on port 5001
- ✅ **Firestore Emulator**: Running on port 8080
- ✅ **Emulator UI**: Available at http://127.0.0.1:4000

### Frontend Development Server
- ✅ **Vite Dev Server**: Running on port 3000
- ✅ **Application URL**: http://localhost:3000

---

## 🌐 **Access Points**

### Main Application
**Frontend**: http://localhost:3000

### Emulator Dashboard
**Emulator UI**: http://127.0.0.1:4000

### API Endpoints (via Emulator)
- **Functions Base**: http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1
- **Smell PGH**: http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1/fetchSmellPGHReports
- **Title V Facilities**: http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1/getTitleVFacilities
- **Facility Compliance**: http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1/getFacilityCompliance

---

## 🧪 **Quick Test Commands**

### Test Smell PGH API
```bash
curl "http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1/fetchSmellPGHReports?region_ids=1&smell_value=4,5"
```

### Test Title V Facilities
```bash
curl "http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1/getTitleVFacilities"
```

### Test Facility Compliance
```bash
curl "http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1/getFacilityCompliance?facilityId=clairton-works"
```

---

## ✅ **Testing Checklist**

### 1. Frontend Application
- [ ] Open http://localhost:3000 in browser
- [ ] Check browser console for errors
- [ ] Verify map loads (requires Mapbox token)
- [ ] Test navigation between pages

### 2. Sensor Map
- [ ] Sensors display on map
- [ ] Title V facilities show as red markers
- [ ] Smell PGH clusters display (if data available)
- [ ] Risk zones display (if events detected)
- [ ] Click facilities to see compliance cards
- [ ] Click sensors to see details

### 3. BreatheAI
- [ ] Navigate to BreatheAI page
- [ ] Test symptom reporting flow
- [ ] Verify OSAC questions appear
- [ ] Submit a test report
- [ ] Check for success message

### 4. Evidence Reports
- [ ] Navigate to Evidence Reports page
- [ ] Select date range
- [ ] Enter location
- [ ] Generate report
- [ ] Verify PDF export works

### 5. Dashboard
- [ ] Check dashboard loads
- [ ] Verify charts display
- [ ] Check real-time data updates

---

## 🔧 **Environment Variables Check**

### Required for Full Functionality:
- ✅ `VITE_USE_EMULATOR=true` (for local development)
- ⚠️ `VITE_MAPBOX_ACCESS_TOKEN` (for map display)
- ⚠️ `VITE_OPENWEATHER_API_KEY` (for wind data)
- ⚠️ `VITE_PURPLEAIR_API_KEY` (for sensor data)

### Backend (functions/.env):
- ⚠️ `OPENWEATHER_API_KEY` (for wind data)
- ⚠️ `EPA_AQS_EMAIL` and `EPA_AQS_KEY` (for ACHD data)

---

## 🐛 **Common Issues**

### Map Not Loading
- **Issue**: Mapbox token missing
- **Fix**: Add `VITE_MAPBOX_ACCESS_TOKEN` to `frontend/.env`

### API Calls Failing
- **Issue**: CORS or emulator connection
- **Fix**: Check `VITE_USE_EMULATOR=true` is set

### No Sensor Data
- **Issue**: PurpleAir API key missing
- **Fix**: Add `VITE_PURPLEAIR_API_KEY` to `frontend/.env`
- **Note**: System will use mock data if key missing

### Functions Not Responding
- **Issue**: Emulators not running
- **Fix**: Restart emulators: `firebase emulators:start --only functions,firestore`

---

## 📊 **Service Status**

| Service | Status | Port | URL |
|---------|--------|------|-----|
| Frontend | ✅ Running | 3000 | http://localhost:3000 |
| Functions | ✅ Running | 5001 | http://127.0.0.1:5001 |
| Firestore | ✅ Running | 8080 | http://127.0.0.1:8080 |
| Emulator UI | ✅ Running | 4000 | http://127.0.0.1:4000 |

---

## 🎯 **Next Steps**

1. **Open Application**: Navigate to http://localhost:3000
2. **Test Features**: Go through testing checklist above
3. **Check Console**: Monitor browser console for errors
4. **Check Network**: Verify API calls in Network tab
5. **Review Emulator UI**: Check http://127.0.0.1:4000 for function logs

---

## 📝 **Notes**

- All services are running in the background
- Frontend hot-reloads on code changes
- Emulator data resets on restart
- Check `LOCAL_DEPLOYMENT_GUIDE.md` for detailed instructions

---

**Status**: ✅ **READY FOR TESTING**

**Last Updated**: Just now


