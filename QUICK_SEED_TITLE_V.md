# Quick Guide: Seed Title V Facilities in Production

## The Problem
Title V facilities are showing "(0)" on the Sensor Map because they haven't been seeded in production Firestore yet.

## Quick Solution (Choose One)

### Option 1: Use Firebase Console (Easiest - No Code Required)

1. **Go to Firebase Console**: https://console.firebase.google.com/project/mv-pollution-tracking-system/firestore
2. **Create Collection**: Click "Start collection" → Name it `titleVFacilities`
3. **Add First Facility**:
   - Document ID: `PA-CLAIRTON-001`
   - Click "Add field" and add these fields:
     - `name` (string): `U.S. Steel Clairton Coke Works`
     - `facilityId` (string): `PA-CLAIRTON-001`
     - `location` (map):
       - `lat` (number): `40.2925`
       - `lng` (number): `-79.8814`
       - `address` (string): `1001 State Route 837`
       - `city` (string): `Clairton`
       - `state` (string): `PA`
       - `zip` (string): `15025`
     - `operator` (string): `United States Steel Corporation`
     - `permitId` (string): `TV-04-00001`
     - `permitType` (string): `Title V Operating Permit`
4. **Add Second Facility**:
   - Document ID: `PA-BRADDOCK-001`
   - `name`: `Edgar Thomson Steel Works`
   - `facilityId`: `PA-BRADDOCK-001`
   - `location` (map):
     - `lat`: `40.4006`
     - `lng`: `-79.8639`
     - `address`: `915 Braddock Avenue`
     - `city`: `Braddock`
     - `state`: `PA`
     - `zip`: `15104`
   - `operator`: `United States Steel Corporation`
   - `permitId`: `TV-04-00002`
   - `permitType`: `Title V Operating Permit`
5. **Add Third Facility**:
   - Document ID: `PA-DRAVOSBURG-001`
   - `name`: `Irvin Plant`
   - `facilityId`: `PA-DRAVOSBURG-001`
   - `location` (map):
     - `lat`: `40.3506`
     - `lng`: `-79.8867`
     - `address`: `100 River Road`
     - `city`: `Dravosburg`
     - `state`: `PA`
     - `zip`: `15034`
   - `operator`: `United States Steel Corporation`
   - `permitId`: `TV-04-00003`
   - `permitType`: `Title V Operating Permit`

6. **Verify**: Refresh the Sensor Map page - you should now see 3 Title V facility markers!

### Option 2: Use the Seed Script (Requires ADMIN_SECRET)

1. **Set ADMIN_SECRET in Firebase Functions**:
   ```bash
   firebase functions:config:set admin.secret="your-secure-random-secret-here"
   firebase deploy --only functions
   ```

2. **Run the seed script**:
   ```bash
   export ADMIN_SECRET="your-secure-random-secret-here"
   ./seed-title-v-production.sh
   ```

### Option 3: Call Seed Function Directly

If you have ADMIN_SECRET set:
```bash
ADMIN_SECRET="your-secret"
curl -X POST \
  https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/seedTitleVFacilities \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json"
```

## Verify It Worked

After seeding, check:
1. Go to Sensor Map page
2. Check "Title V Facilities" checkbox
3. You should see 3 markers:
   - U.S. Steel Clairton Coke Works (Clairton)
   - Edgar Thomson Steel Works (Braddock)
   - Irvin Plant (Dravosburg)

Or verify via API:
```bash
curl https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/getTitleVFacilities
```

Should return JSON with `"count": 3` and a `facilities` array with 3 items.

