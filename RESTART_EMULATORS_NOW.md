# Restart Emulators to Apply Dotenv Fix

## Current Status
✅ Code fix applied - dotenv path corrected  
⚠️ **Emulators need restart** - Changes won't take effect until emulators restart

## The Issue
The PurpleAir API is returning `402 Payment Required`, which means:
- The API key IS being loaded (otherwise we'd get a different error)
- BUT the emulators are still running the OLD code (before the dotenv path fix)
- The new code that correctly loads `.env` hasn't been loaded yet

## Solution: Restart Emulators

### Step 1: Stop Current Emulators
In the terminal where emulators are running:
- Press `Ctrl+C` to stop them
- Or find the process and kill it:
  ```bash
  pkill -f "firebase emulators"
  ```

### Step 2: Restart Emulators
```bash
cd /Users/liberatex/pullution_tracker/The-Mon-Valley-Pollution-Tracking-System
firebase emulators:start --only functions,firestore,auth
```

### Step 3: Watch for Success Messages
When emulators start, look for these messages in the console:
```
✅ Loaded environment variables from .env at: /path/to/functions/.env
✅ PurpleAir API key found in environment: 658398DE-6...
```

### Step 4: Test the API
In a new terminal:
```bash
curl http://localhost:5001/mv-pollution-tracking-system/us-central1/fetchPurpleAirSensorData
```

**Expected Result:**
- If API key loads correctly: Should get sensor data OR a different error (not 402)
- If still 402: The API key account may need credits (but at least we'll know it's loading)

### Step 5: Refresh Browser
After emulators restart:
1. Hard refresh browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
2. Navigate to Sensor Map page
3. Check browser console for sensor data

## Why This Is Necessary
Firebase Functions emulators load the compiled code from `functions/lib/` when they start. Even though we:
1. ✅ Fixed the source code (`functions/src/index.ts`)
2. ✅ Rebuilt the code (`npm run build`)
3. ✅ The compiled code is updated (`functions/lib/src/index.js`)

The **running emulator process** is still using the OLD code from memory. Restarting loads the new compiled code.

## Verification Checklist
After restarting, verify:
- [ ] Emulator console shows dotenv loading messages
- [ ] API call returns data or different error (not 402)
- [ ] Browser console shows sensors being fetched
- [ ] Map shows PurpleAir sensor circles (if API has credits)

---

**Status:** ⏳ Waiting for emulator restart to apply fix


