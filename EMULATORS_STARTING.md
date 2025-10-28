# Firebase Emulators Starting

## Issue Found

The error `ERR_CONNECTION_REFUSED` on port 5001 means the **Firebase Functions emulator is not running**.

## What I Did

Started the Firebase emulators:
```bash
cd /Users/liberatex/pullution_tracker/The-Mon-Valley-Pollution-Tracking-System
firebase emulators:start --only functions,firestore
```

## Wait Time

The emulators need **10-20 seconds** to fully start up. They're starting now in the background.

## How to Check if Emulators Are Ready

1. **Wait 15-20 seconds**
2. **Visit**: http://localhost:4000 (Emulator UI)
3. You should see "Emulator Hub" with Functions and Firestore listed
4. Go back to http://localhost:3000
5. The Dashboard error should be gone

## Why This Happens

The Firebase emulators need to be running for the frontend to call Cloud Functions. Without them:
- Frontend tries to call `getACHDAirQuality`
- Connection to `localhost:5001` is refused
- Falls back to mock data
- Dashboard shows error

## Current Status

✅ Emulators starting...  
⏳ Wait ~15 seconds  
✅ Then refresh http://localhost:3000  

## When Emulators Are Ready

You'll see in browser console:
```
✅ Using official ACHD data: {...}
```

Instead of:
```
Could not fetch ACHD data
```

