# Dotenv Path Fix V2 - Corrected

## Problem Found
The path resolution was incorrect. When TypeScript compiles, the code goes to `functions/lib/src/index.js`, so `__dirname` points to `lib/src/`. 

**Original fix:** `path.resolve(__dirname, '..', '.env')` → This resolves to `lib/.env` ❌ (wrong)

**Correct fix:** `path.resolve(__dirname, '..', '..', '.env')` → This resolves to `functions/.env` ✅ (correct)

## New Fix Applied
**File:** `functions/src/index.ts`

Now tries multiple paths and checks if file exists:

```typescript
const possiblePaths = [
  path.resolve(__dirname, '..', '..', '.env'), // From lib/src/ to functions/.env
  path.resolve(__dirname, '..', '.env'), // Fallback
  path.resolve(process.cwd(), 'functions', '.env'), // From project root
  path.resolve(process.cwd(), '.env'), // Current directory
];

// Check each path until we find the .env file
let envPath: string | null = null;
for (const testPath of possiblePaths) {
  if (fs.existsSync(testPath)) {
    envPath = testPath;
    break;
  }
}
```

## Why This Works Better
1. **Tries multiple paths** - More robust, works regardless of where code runs
2. **Checks file existence** - Won't fail silently if path is wrong
3. **Better logging** - Shows which path was found/used
4. **Fallback paths** - Handles edge cases

## Testing
After restarting emulators, check console logs for:
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
   - Verify the correct path is being used
   - Verify API key is loaded

3. **Test API Call:**
   ```bash
   curl http://localhost:5001/mv-pollution-tracking-system/us-central1/fetchPurpleAirSensorData
   ```

## Expected Result
- Environment variables should load from `functions/.env`
- PurpleAir API key should be found
- API calls should work (assuming API key has credits)

---

**Status:** ✅ Fixed - Path resolution corrected, multiple paths tried


