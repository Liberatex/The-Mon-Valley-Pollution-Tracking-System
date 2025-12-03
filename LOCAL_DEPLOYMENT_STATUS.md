# Local Deployment Status

## Deployment Time
**Started:** $(date)

## Services Running

### Frontend Dev Server
- **Status:** Starting...
- **URL:** http://localhost:3000 (or check console output)
- **Command:** `npm run dev` (in frontend directory)

### Firebase Emulators
- **Status:** Starting...
- **Functions:** http://localhost:5001
- **Firestore:** http://localhost:8080
- **Auth:** http://localhost:9099
- **UI:** http://localhost:4001
- **Command:** `firebase emulators:start --only functions,firestore,auth`

## What to Check

### 1. **Browser Console** (F12)
Look for these messages:
- `🔍 Sensor rendering check:` - Should show sensor count > 0
- `✅ Updating sensors from realtime hook: X sensors` - Confirms data received
- `✅ Creating new sensor source` or `✅ Updating existing sensor source` - Confirms source handling
- `✅ Adding sensor-points layer` - Confirms layer creation
- `🔄 Calculating weighted risk for X sensors...` - Confirms risk calculation

### 2. **Sensor Map Page**
- Navigate to Sensor Map
- Check if sensors appear as colored circles
- Zoom in (zoom level 11+) to see individual sensors
- Click on sensors to see popups

### 3. **Exposure Risk Page**
- Navigate to Exposure Risk
- Check "Current Conditions" section:
  - Should show "Weighted Risk Index" (not AQI)
  - Should show "PM2.5 (Calibrated)" (not raw)
  - Should show formula: `Risk Index = [(PM_cal × W_tox × W_wind) + (Odor_score × W_odor)] × V_user`

### 4. **BreatheAI**
- Check floating chat bubble (bottom right)
- Initial message should mention symptom reporting
- Check main AI Assistant page
- Both should have matching messages

## Troubleshooting

### If sensors still don't show:
1. **Hard refresh browser:** `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. **Clear browser cache:** DevTools → Application → Clear Storage
3. **Check console for errors:** Look for red error messages
4. **Check network tab:** Verify API calls are succeeding
5. **Verify emulator is running:** Check http://localhost:4001

### If you see errors:
- **CORS errors:** Emulator might not be running
- **404 errors:** Check if functions are deployed to emulator
- **Network errors:** Check if emulator ports are correct

## Ports Used
- **3000:** Frontend dev server (Vite)
- **5001:** Firebase Functions emulator
- **8080:** Firestore emulator
- **9099:** Auth emulator
- **4001:** Emulator UI

## Next Steps
1. Wait for both servers to fully start (check console output)
2. Open browser to http://localhost:3000
3. Hard refresh to clear cache
4. Check console for debug messages
5. Navigate to Sensor Map page
6. Verify sensors are visible

---

**Note:** If services don't start automatically, run manually:
```bash
# Terminal 1: Firebase Emulators
cd /Users/liberatex/pullution_tracker/The-Mon-Valley-Pollution-Tracking-System
firebase emulators:start --only functions,firestore,auth

# Terminal 2: Frontend Dev Server
cd /Users/liberatex/pullution_tracker/The-Mon-Valley-Pollution-Tracking-System/frontend
npm run dev
```


