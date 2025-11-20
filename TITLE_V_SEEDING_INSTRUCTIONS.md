# Title V Facilities Seeding Instructions

## Issue
Title V permit facilities are not showing on the live site map, even though the backend function `getTitleVFacilities` exists and works locally.

## Root Cause
The Title V facilities data needs to be seeded in production Firestore. The seed function exists but hasn't been called in production.

## Solution

### Option 1: Call the Seed Function (Recommended)

1. **Set up Admin Secret** (if not already set):
   ```bash
   # In Firebase Console -> Functions -> Configuration
   # Add environment variable: ADMIN_SECRET
   # Set a secure random value
   ```

2. **Call the seed endpoint**:
   ```bash
   ADMIN_SECRET="your-admin-secret-here"
   
   curl -X POST \
     https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/seedTitleVFacilities \
     -H "Authorization: Bearer $ADMIN_SECRET" \
     -H "Content-Type: application/json"
   ```

3. **Verify seeding**:
   ```bash
   curl https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/getTitleVFacilities
   ```
   
   Should return JSON with `success: true` and `facilities` array with 3 facilities.

### Option 2: Manual Seeding via Firebase Console

1. Go to **Firebase Console** -> **Firestore Database**
2. Create collection: `titleVFacilities`
3. Add 3 documents with IDs:
   - `PA-CLAIRTON-001` (U.S. Steel Clairton Coke Works)
   - `PA-BRADDOCK-001` (Edgar Thomson Steel Works)
   - `PA-DRAVOSBURG-001` (Irvin Plant)
4. Copy facility data from `functions/src/index.ts` (lines 438-612) - `MON_VALLEY_FACILITIES` array

### Option 3: Automated Seeding Script

Create a script that calls the seed function automatically on deployment:

```bash
#!/bin/bash
# seed-title-v.sh

ADMIN_SECRET="${ADMIN_SECRET:-your-secret-here}"
ENDPOINT="https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/seedTitleVFacilities"

curl -X POST "$ENDPOINT" \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json"

echo "Title V facilities seeded"
```

## Verification

After seeding, check the Sensor Map on the live site:
1. Navigate to https://mv-pollution-tracking-system.web.app
2. Go to "Sensor Map" page
3. Check the "Title V Facilities" checkbox
4. You should see 3 facility markers on the map:
   - U.S. Steel Clairton Coke Works (Clairton)
   - Edgar Thomson Steel Works (Braddock)
   - Irvin Plant (Dravosburg)

## Notes

- The seed function requires authentication (Bearer token) in production
- The function is idempotent - safe to call multiple times
- Facilities are upserted, so existing data won't be duplicated
- The `getTitleVFacilities` function is public and doesn't require auth

