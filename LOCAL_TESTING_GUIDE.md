# Local Testing Guide - Firebase Emulators

## Quick Start

### 1. Start Firebase Emulators

```bash
cd /Users/liberatex/pullution_tracker/The-Mon-Valley-Pollution-Tracking-System

# Start Functions + Firestore emulators
firebase emulators:start --only functions,firestore

# OR start all emulators
firebase emulators:start
```

**Emulator URLs:**
- **Functions**: http://localhost:5001/mv-pollution-tracking-system/us-central1/
- **Firestore**: http://localhost:8080
- **Emulator UI**: http://localhost:4000

---

## 2. Test Cloud Functions Locally

### Test submitSymptomReport

```bash
# Terminal 1 (keep emulators running)
firebase emulators:start --only functions,firestore

# Terminal 2 (run tests)
curl -X POST \
  http://localhost:5001/mv-pollution-tracking-system/us-central1/submitSymptomReport \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_local_001",
    "fullName": "Test User",
    "age": "35",
    "symptoms": ["cough", "headache", "chest tightness"],
    "severity": 4,
    "osac": {
      "onset": "Sudden",
      "severity": 4,
      "aggravatingFactors": ["Outdoor Exposure", "Industrial Smell"],
      "course": "Worsening"
    },
    "submittedAt": "2024-12-08T10:00:00Z",
    "consent": true,
    "location": {
      "lat": 40.2925,
      "lng": -79.8814
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "reportId": "ABC123...",
  "message": "Symptom report submitted successfully"
}
```

### Test Rate Limiting

```bash
# Submit 11 reports rapidly (should get rate limited on 11th)
for i in {1..11}; do
  echo "Submission $i:"
  curl -X POST \
    http://localhost:5001/mv-pollution-tracking-system/us-central1/submitSymptomReport \
    -H "Content-Type: application/json" \
    -d "{
      \"userId\": \"rate_test_user\",
      \"symptoms\": [\"test\"],
      \"severity\": 2,
      \"osac\": {
        \"onset\": \"Gradual\",
        \"severity\": 2,
        \"aggravatingFactors\": [],
        \"course\": \"Stable\"
      },
      \"submittedAt\": \"2024-12-08T10:00:00Z\",
      \"consent\": true
    }"
  echo ""
  sleep 0.5
done
```

**Expected**: First 10 succeed, 11th returns `429 Rate limit exceeded`

### Seed Title V Facilities (Local)

```bash
curl -X POST \
  http://localhost:5001/mv-pollution-tracking-system/us-central1/seedTitleVFacilities \
  -H "Authorization: Bearer test-admin-secret" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Successfully seeded 3 Title V facilities",
  "facilityIds": ["PA-CLAIRTON-001", "PA-BRADDOCK-001", "PA-DRAVOSBURG-001"]
}
```

### Get All Facilities

```bash
curl http://localhost:5001/mv-pollution-tracking-system/us-central1/getTitleVFacilities
```

**Expected**: JSON array with 3 facilities

### Get Single Facility

```bash
curl "http://localhost:5001/mv-pollution-tracking-system/us-central1/getTitleVFacilityById?id=PA-CLAIRTON-001"
```

**Expected**: JSON object for Clairton Coke Works

### Test AI Chat

```bash
curl -X POST \
  http://localhost:5001/mv-pollution-tracking-system/us-central1/llama3Chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the health effects of PM2.5?"
  }'
```

---

## 3. View Data in Firestore Emulator UI

1. Open browser: **http://localhost:4000**
2. Click **Firestore** tab
3. View collections:
   - `symptomReports` - Check for pseudonymization (pseudoId, no fullName)
   - `healthAlerts` - Should have entries for severity ≥ 4
   - `rateLimits` - Check rate limiting state
   - `titleVFacilities` - View seeded facilities

---

## 4. Test Frontend with Local Emulators

### Update Frontend to Use Local Endpoints

Create `.env.local` in `frontend/`:

```bash
cd /Users/liberatex/pullution_tracker/The-Mon-Valley-Pollution-Tracking-System/frontend

cat > .env.local << 'EOF'
# Firebase Emulator Configuration
REACT_APP_USE_EMULATOR=true
REACT_APP_FUNCTIONS_EMULATOR_URL=http://localhost:5001/mv-pollution-tracking-system/us-central1
REACT_APP_FIRESTORE_EMULATOR_HOST=localhost:8080

# Keep existing keys for other services
REACT_APP_OWM_API_KEY=your_key_here
REACT_APP_PURPLEAIR_API_KEY=your_key_here
EOF
```

### Update Firebase Config for Emulators

Add to `frontend/src/firebase.ts` (after Firebase initialization):

```typescript
// Connect to emulators in development
if (process.env.REACT_APP_USE_EMULATOR === 'true') {
  const { connectFirestoreEmulator } = await import('firebase/firestore');
  const { connectAuthEmulator } = await import('firebase/auth');
  
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
  
  console.log('🔧 Connected to Firebase Emulators');
}
```

### Update SymptomReportForm for Local Testing

In `SymptomReportForm.tsx`, update the function URL:

```typescript
// Use Cloud Function endpoint (local or production)
const functionUrl = process.env.REACT_APP_USE_EMULATOR === 'true'
  ? 'http://localhost:5001/mv-pollution-tracking-system/us-central1/submitSymptomReport'
  : 'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/submitSymptomReport';
```

### Start Frontend

```bash
cd /Users/liberatex/pullution_tracker/The-Mon-Valley-Pollution-Tracking-System/frontend

npm start
```

**Open**: http://localhost:3000

**Test Flow:**
1. Navigate to Symptom Report Form
2. Fill out and submit
3. Check Emulator UI (http://localhost:4000) for new entry in `symptomReports`
4. Verify pseudonymization worked

---

## 5. Test Firestore Security Rules

### Test Public Read (Should Work)

```javascript
// In browser console at localhost:3000
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// Should succeed
const facilities = await getDocs(collection(db, 'titleVFacilities'));
console.log('Facilities:', facilities.docs.length);

// Should succeed
const sensorReadings = await getDocs(collection(db, 'processedSensorReadings'));
console.log('Sensor readings:', sensorReadings.docs.length);
```

### Test Protected Write (Should Fail)

```javascript
// In browser console
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

// Should FAIL with permission denied
try {
  await addDoc(collection(db, 'symptomReports'), {
    userId: 'hacker',
    symptoms: ['test']
  });
  console.error('❌ Security breach! Direct write should have failed!');
} catch (error) {
  console.log('✅ Security working - Direct write blocked:', error.message);
}
```

---

## 6. Debug Functions Locally

### View Function Logs

Emulators show logs in the terminal where you started them. Look for:

```
[functions] Symbol report submitted: {reportId: "...", severity: 4, ...}
[functions] Health alert created for high-severity report: ABC123
```

### Inspect Function with Debugger

1. Stop emulators (Ctrl+C)
2. Start with inspect flag:

```bash
firebase emulators:start --only functions --inspect-functions
```

3. Open Chrome: `chrome://inspect`
4. Click "Open dedicated DevTools for Node"
5. Set breakpoints in `functions/lib/index.js`

---

## 7. Test Complete User Journey

### Scenario 1: Normal Symptom Report

1. Start emulators
2. Open frontend: http://localhost:3000
3. Go to Symptom Report Form
4. Fill out:
   - User ID: auto-populated
   - Symptoms: "cough", "shortness of breath"
   - Severity: 3 (Moderate)
   - OSAC data
5. Submit
6. Check Emulator UI:
   - `symptomReports` has new entry
   - `pseudoId` exists, no `fullName`
   - Location rounded to ~1km
   - No `healthAlerts` created (severity < 4)

### Scenario 2: High-Severity Report (Triggers Alert)

1. Fill out form with severity: 5 (Extreme)
2. Submit
3. Check Emulator UI:
   - `symptomReports` has entry
   - `healthAlerts` has NEW entry with matching reportId
   - Alert status: "pending"

### Scenario 3: Rate Limiting

1. Submit 10 reports rapidly
2. Try 11th submission
3. Should see error: "Rate limit exceeded. Maximum 10 reports per hour."
4. Check `rateLimits` collection in Emulator UI

---

## 8. Import/Export Test Data

### Export Data from Emulators

```bash
# While emulators are running
firebase emulators:export ./emulator-data

# Creates backup in ./emulator-data/
```

### Import Data on Next Run

```bash
firebase emulators:start --import=./emulator-data
```

### Seed Test Data

Create `test-seed-data.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:5001/mv-pollution-tracking-system/us-central1"

# Seed facilities
curl -X POST "$BASE_URL/seedTitleVFacilities" \
  -H "Authorization: Bearer test-admin-secret"

# Add 5 test symptom reports
for i in {1..5}; do
  curl -X POST "$BASE_URL/submitSymptomReport" \
    -H "Content-Type: application/json" \
    -d "{
      \"userId\": \"test_user_$i\",
      \"symptoms\": [\"cough\", \"headache\"],
      \"severity\": $((2 + $i % 3)),
      \"osac\": {
        \"onset\": \"Gradual\",
        \"severity\": $((2 + $i % 3)),
        \"aggravatingFactors\": [\"Outdoor Exposure\"],
        \"course\": \"Stable\"
      },
      \"submittedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
      \"consent\": true
    }"
  sleep 0.5
done

echo "Test data seeded!"
```

Run: `chmod +x test-seed-data.sh && ./test-seed-data.sh`

---

## 9. Performance Testing

### Load Test Symptom Submission

```bash
# Install Apache Bench (if not installed)
# brew install apache2

# Run 100 requests with 10 concurrent
ab -n 100 -c 10 -T 'application/json' -p symptom-payload.json \
  http://localhost:5001/mv-pollution-tracking-system/us-central1/submitSymptomReport
```

Create `symptom-payload.json`:
```json
{
  "userId": "load_test_user",
  "symptoms": ["test"],
  "severity": 2,
  "osac": {
    "onset": "Gradual",
    "severity": 2,
    "aggravatingFactors": [],
    "course": "Stable"
  },
  "submittedAt": "2024-12-08T10:00:00Z",
  "consent": true
}
```

---

## 10. Common Issues

### Issue: Emulators won't start

**Error**: `Port 5001 already in use`

**Solution**:
```bash
# Find process using port
lsof -ti:5001 | xargs kill -9

# Or use different ports
firebase emulators:start --only functions --port=5002
```

### Issue: Functions not updating

**Solution**: Rebuild before starting emulators
```bash
cd functions
npm run build
cd ..
firebase emulators:start
```

### Issue: Firestore rules not applied

**Solution**: Rules are applied automatically, but check `firestore.rules` is in project root

### Issue: Frontend can't connect to emulators

**Solution**: Check CORS - emulators auto-allow localhost, but verify in browser console

---

## 11. Pre-Production Checklist

Before deploying to production, verify all tests pass locally:

- [ ] `submitSymptomReport` creates entry in Firestore
- [ ] Data is pseudonymized (no `fullName`, has `pseudoId`)
- [ ] Location is rounded to ~1km precision
- [ ] Rate limiting works (11th request fails)
- [ ] High-severity reports (≥4) create `healthAlerts`
- [ ] Title V facilities can be seeded
- [ ] `getTitleVFacilities` returns all facilities
- [ ] `getTitleVFacilityById` returns single facility
- [ ] AI chat responds (if Together AI key configured)
- [ ] Firestore rules block direct client writes to `symptomReports`
- [ ] Firestore rules allow public read of `titleVFacilities`
- [ ] Frontend form submits successfully to local emulator
- [ ] Emulator UI shows data correctly
- [ ] No errors in function logs

---

## 12. Next Steps

Once local testing is complete:

1. **Export test data**: `firebase emulators:export ./test-data-backup`
2. **Review deployment guide**: `DEPLOYMENT_GUIDE.md`
3. **Deploy to staging** (if available)
4. **Deploy to production**: `firebase deploy`

---

**Happy Testing! 🧪**


