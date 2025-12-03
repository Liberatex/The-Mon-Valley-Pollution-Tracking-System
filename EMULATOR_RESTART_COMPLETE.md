# Emulator Restart Complete

## Actions Taken
1. ✅ Stopped old emulator processes
2. ✅ Cleared ports (5001, 8080, 4001)
3. ✅ Rebuilt functions code
4. ✅ Started new emulator instance

## What to Check Now

### 1. Check Emulator Console
Look at the terminal where emulators are running. You should see:
```
✅ Loaded environment variables from .env at: /path/to/functions/.env
✅ PurpleAir API key found in environment: 658398DE-6...
```

### 2. Test API Endpoint
Run this command to test:
```bash
curl http://localhost:5001/mv-pollution-tracking-system/us-central1/fetchPurpleAirSensorData
```

**Expected Results:**
- If API key loads: Should get sensor data OR a different error (not 402)
- If still 402: API key account may need credits, but at least env vars are loading

### 3. Refresh Browser
1. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
2. Navigate to Sensor Map page
3. Check browser console (F12) for:
   - `✅ Updating sensors from realtime hook: X sensors`
   - Any error messages

### 4. Check Map
- PurpleAir Sensors should appear as colored circles
- If still showing "(0)", check browser console for errors

## Troubleshooting

### If sensors still don't show:
1. **Check browser console** - Look for API errors
2. **Check network tab** - Verify API calls are going to `127.0.0.1:5001`
3. **Check emulator logs** - Look for dotenv loading messages
4. **Verify .env file** - Make sure `functions/.env` has `PURPLEAIR_API_KEY`

### If API returns 402:
- The API key is loading correctly (good!)
- But the PurpleAir account may need credits/points
- Check PurpleAir account status at https://www2.purpleair.com
- The live version works because it uses a different API key or has credits

## Next Steps
1. Check emulator console for dotenv messages
2. Test API endpoint
3. Refresh browser and check Sensor Map
4. Report back what you see!

---

**Status:** ✅ Emulators restarted - Check console logs and test API


