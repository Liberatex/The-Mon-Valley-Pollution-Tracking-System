# Emulator Connection Fix

## Issue
The frontend was trying to connect to production Firebase Cloud Functions (`https://us-central1-mv-pollution-tracking-system.cloudfunctions.net`) instead of the local emulator, causing CORS and 404 errors.

## Root Cause
1. Vite requires environment variables to be prefixed with `VITE_` to be exposed to the browser
2. The `.env` file had `REACT_APP_USE_EMULATOR=true` but not `VITE_USE_EMULATOR=true`
3. The `shouldUseEmulator()` function wasn't detecting localhost correctly

## Fixes Applied

### 1. Added VITE_USE_EMULATOR to .env
```bash
VITE_USE_EMULATOR=true
```

### 2. Enhanced shouldUseEmulator() Function
The function now:
- Checks `VITE_USE_EMULATOR` environment variable
- Falls back to `REACT_APP_USE_EMULATOR` for backward compatibility
- **Defaults to `true` when running on localhost** (even if env var not set)
- Only uses production URLs when explicitly set to `false` or not on localhost

### 3. Improved Environment Variable Detection
Updated `getEnvVar()` to check multiple formats:
- `VITE_USE_EMULATOR` (Vite format)
- `REACT_APP_USE_EMULATOR` (backward compatibility)
- Falls back to default if neither found

## Testing
After restarting the frontend dev server, the app should:
1. Detect it's running on localhost
2. Use emulator URLs: `http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1`
3. Successfully connect to Firebase emulators

## Next Steps
1. **Restart the frontend dev server** to pick up the new environment variable
2. Verify in browser console that API calls are going to `127.0.0.1:5001` instead of production
3. Check that compliance data loads correctly when clicking Title V facilities

## Verification
Check browser console for:
- `Fetching compliance data:` log showing `usingEmulator: true`
- API URLs starting with `http://127.0.0.1:5001` instead of `https://us-central1...`


