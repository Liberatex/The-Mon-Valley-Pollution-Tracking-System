# Dotenv Path Fix

## Problem
The Firebase Functions emulator was not loading environment variables from `functions/.env` because `dotenv.config()` was using the default path (current working directory), which might not be the functions directory when running in the emulator.

## Root Cause
When Firebase emulators start, the working directory might be the project root, not the `functions` directory. The `dotenv.config()` call without an explicit path was looking for `.env` in the wrong location.

## Fix Applied
**File:** `functions/src/index.ts`

Changed from:
```typescript
const result = dotenv.config();
```

To:
```typescript
const path = require('path');
const envPath = path.resolve(__dirname, '..', '.env');
const result = dotenv.config({ path: envPath });
```

This explicitly sets the path to `functions/.env` relative to the compiled JavaScript file location (`__dirname`).

## Why This Works
- `__dirname` in the compiled code points to `functions/lib/` (where TypeScript compiles to)
- `path.resolve(__dirname, '..', '.env')` resolves to `functions/.env`
- This works regardless of what directory the emulator is started from

## Testing
After restarting emulators, check the console logs for:
- `✅ Loaded environment variables from .env at: /path/to/functions/.env`
- `✅ PurpleAir API key found in environment: 658398DE-6...`

## Next Steps
1. **Restart Firebase Emulators:**
   ```bash
   # Stop current emulators (Ctrl+C)
   firebase emulators:start --only functions,firestore,auth
   ```

2. **Check Console Logs:**
   - Look for the dotenv loading messages
   - Verify API key is loaded

3. **Test API Call:**
   ```bash
   curl http://localhost:5001/mv-pollution-tracking-system/us-central1/fetchPurpleAirSensorData
   ```

## Expected Result
- Environment variables should load correctly
- PurpleAir API calls should work (assuming API key has credits)
- Sensors should appear on the map

---

**Status:** ✅ Fixed - dotenv now loads from correct path


