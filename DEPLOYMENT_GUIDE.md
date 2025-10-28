# Deployment Guide - Project Lumna/PHPA Platform

## Quick Deployment Steps

### Prerequisites
- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project configured: `mv-pollution-tracking-system`
- Admin access to Firebase project
- Node.js 18+ installed

---

## Step 1: Deploy Cloud Functions

```bash
cd /Users/liberatex/pullution_tracker/The-Mon-Valley-Pollution-Tracking-System/functions

# Build the functions
npm run build

# Deploy all functions
firebase deploy --only functions

# OR deploy specific functions
firebase deploy --only functions:submitSymptomReport,functions:getTitleVFacilities,functions:seedTitleVFacilities
```

**Expected Output:**
```
✔  functions[submitSymptomReport]: Successful create operation.
✔  functions[getTitleVFacilities]: Successful create operation.
✔  functions[seedTitleVFacilities]: Successful create operation.
```

---

## Step 2: Deploy Firestore Security Rules

```bash
cd /Users/liberatex/pullution_tracker/The-Mon-Valley-Pollution-Tracking-System

# Deploy security rules
firebase deploy --only firestore:rules
```

**Expected Output:**
```
✔  firestore: deployed rules
```

**IMPORTANT**: This will lock down direct client writes to `symptomReports`. Ensure Cloud Functions are deployed first!

---

## Step 3: Seed Title V Facilities Data

### Option A: Using curl

```bash
# Set your admin secret (temporarily for seeding)
ADMIN_SECRET="your-secure-admin-secret-here"

# Call the seed endpoint
curl -X POST \
  https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/seedTitleVFacilities \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json"
```

### Option B: Using Firebase Console

1. Go to **Firestore Database** in Firebase Console
2. Create collection: `titleVFacilities`
3. Manually add 3 documents with IDs:
   - `PA-CLAIRTON-001`
   - `PA-BRADDOCK-001`
   - `PA-DRAVOSBURG-001`
4. Copy data from `functions/src/index.ts` MON_VALLEY_FACILITIES array

**Expected Response:**
```json
{
  "success": true,
  "message": "Successfully seeded 3 Title V facilities",
  "facilityIds": ["PA-CLAIRTON-001", "PA-BRADDOCK-001", "PA-DRAVOSBURG-001"]
}
```

---

## Step 4: Verify Deployment

### Test 1: Symptom Report Submission

```bash
curl -X POST \
  https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/submitSymptomReport \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_001",
    "symptoms": ["cough", "headache"],
    "severity": 3,
    "osac": {
      "onset": "Gradual",
      "severity": 3,
      "aggravatingFactors": ["Outdoor Exposure"],
      "course": "Stable"
    },
    "submittedAt": "2024-12-01T10:00:00Z",
    "consent": true
  }'
```

**Expected**: `{"success":true,"reportId":"...","message":"Symptom report submitted successfully"}`

### Test 2: Title V Facilities Retrieval

```bash
curl https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/getTitleVFacilities
```

**Expected**: JSON array with 3 facilities

### Test 3: Frontend Symptom Form

1. Open: https://mv-pollution-tracking-system.web.app
2. Navigate to Symptom Report Form
3. Fill out form and submit
4. Check Firebase Console → Firestore → `symptomReports` for new entry
5. Verify data is pseudonymized (no `fullName`, has `pseudoId`)

---

## Step 5: Update Frontend Environment Variables

Update `.env` in `frontend/`:

```env
# Existing variables
REACT_APP_FIREBASE_API_KEY=your_key
REACT_APP_FIREBASE_AUTH_DOMAIN=mv-pollution-tracking-system.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=mv-pollution-tracking-system
REACT_APP_FIREBASE_STORAGE_BUCKET=mv-pollution-tracking-system.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_OWM_API_KEY=your_openweathermap_key
REACT_APP_PURPLEAIR_API_KEY=your_purpleair_key

# New: Cloud Functions URL (if different)
REACT_APP_FUNCTIONS_BASE_URL=https://us-central1-mv-pollution-tracking-system.cloudfunctions.net
```

---

## Step 6: Deploy Frontend

```bash
cd /Users/liberatex/pullution_tracker/The-Mon-Valley-Pollution-Tracking-System/frontend

# Install dependencies (if not done)
npm install

# Build production bundle
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

**Expected Output:**
```
✔  hosting: Deploy complete!
   https://mv-pollution-tracking-system.web.app
```

---

## Step 7: Monitoring and Validation

### Check Cloud Function Logs

```bash
firebase functions:log --only submitSymptomReport
firebase functions:log --only getTitleVFacilities
```

### Monitor Firestore Usage

1. Go to **Firestore** in Firebase Console
2. Check **Usage** tab
3. Verify reads/writes are within expected limits

### Check Health Endpoints

```bash
# Cloud Functions health
curl https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/healthCheck

# Expected: {"status":"healthy","services":{"ollama":"fully_operational",...}}
```

---

## Rollback Plan

If issues arise:

### Rollback Cloud Functions
```bash
firebase functions:delete submitSymptomReport
firebase functions:delete getTitleVFacilities
firebase functions:delete seedTitleVFacilities

# Re-deploy previous version (if saved)
git checkout <previous-commit>
cd functions && npm run build && firebase deploy --only functions
```

### Rollback Firestore Rules
```bash
# Edit firestore.rules to restore previous rules
git checkout HEAD~1 firestore.rules
firebase deploy --only firestore:rules
```

### Rollback Frontend
```bash
git checkout <previous-commit>
cd frontend && npm run build && firebase deploy --only hosting
```

---

## Post-Deployment Checklist

- [ ] All Cloud Functions deployed and responding
- [ ] Firestore rules deployed and tested
- [ ] Title V facilities seeded (3 facilities visible in Firestore)
- [ ] Symptom report submission works via Cloud Function
- [ ] Frontend deployed to hosting
- [ ] Rate limiting tested (10 submissions in 1 hour triggers 429 error)
- [ ] Pseudonymization verified (no PII in Firestore `symptomReports`)
- [ ] High-severity reports (severity ≥ 4) create `healthAlerts`
- [ ] Admin can read `symptomReports`, public cannot
- [ ] Title V facilities publicly readable
- [ ] Cloud Functions logs show no errors
- [ ] Frontend console shows no errors

---

## Troubleshooting

### Issue: Cloud Function CORS errors
**Solution**: Verify `corsHandler` is wrapping all endpoint logic in `functions/src/index.ts`

### Issue: Firestore permission denied
**Solution**: 
1. Check if rules were deployed: `firebase deploy --only firestore:rules`
2. Verify user authentication state (if required)
3. Check browser console for specific rule violation

### Issue: Rate limit not working
**Solution**: 
1. Verify `rateLimits` collection exists in Firestore
2. Check that Cloud Function has write access to `rateLimits`
3. Test by making 11 rapid submissions from same user ID

### Issue: Title V facilities not showing
**Solution**:
1. Verify seed endpoint was called successfully
2. Check Firestore Console → `titleVFacilities` collection
3. Test endpoint: `curl https://...cloudfunctions.net/getTitleVFacilities`

---

## Environment-Specific Notes

### Development
- Use Firebase emulators: `firebase emulators:start`
- Point frontend to local functions: `http://localhost:5001/PROJECT_ID/us-central1/submitSymptomReport`

### Staging
- Create separate Firebase project: `mv-pollution-tracking-staging`
- Deploy with: `firebase use staging && firebase deploy`

### Production
- Use: `firebase use production`
- Enable backup: Already configured in `scheduledFirestoreBackup` function
- Set up monitoring alerts in Cloud Console

---

## Security Best Practices

1. **Admin Secret**: Store `ADMIN_SECRET` in Firebase Functions config, not in code
   ```bash
   firebase functions:config:set admin.secret="your-secure-secret"
   ```

2. **Pseudonymization Salt**: Use environment-specific salts
   ```bash
   firebase functions:config:set crypto.salt="unique-salt-per-environment"
   ```

3. **API Keys**: Never commit API keys; use `.env` files (gitignored)

4. **Audit Logs**: Enable Firestore audit logs in Cloud Console

5. **Rate Limits**: Monitor `rateLimits` collection size; implement TTL or cleanup

---

## Support Contacts

- **Firebase Issues**: Firebase Console → Support
- **Code Issues**: GitHub Issues (repository)
- **Community**: Valley Clean Air Now (VCAN)
- **Technical**: Liberate X Team

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Next Update**: After Phase B deployment


