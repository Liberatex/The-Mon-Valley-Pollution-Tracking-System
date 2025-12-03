# Local Deployment Guide

## 🚀 **Quick Start**

### Prerequisites
- Node.js (v18+)
- Firebase CLI installed (`firebase --version`)
- npm or yarn

---

## 📋 **Step-by-Step Deployment**

### 1. Start Firebase Emulators

```bash
# From project root
firebase emulators:start --only functions,firestore
```

**Emulator URLs:**
- Functions: `http://127.0.0.1:5001`
- Firestore: `http://127.0.0.1:8080`
- Emulator UI: `http://127.0.0.1:4000`

### 2. Start Frontend Development Server

```bash
# In a new terminal, from project root
cd frontend
npm install  # If not already done
npm run dev  # or npm start
```

**Frontend URL:**
- Application: `http://localhost:5173` (Vite default) or `http://localhost:3000`

---

## 🔧 **Environment Setup**

### Frontend Environment Variables

Create `frontend/.env`:
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=mv-pollution-tracking-system.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mv-pollution-tracking-system
VITE_FIREBASE_STORAGE_BUCKET=mv-pollution-tracking-system.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id

# Use emulators in development
VITE_USE_EMULATOR=true

# External API Keys
VITE_MAPBOX_ACCESS_TOKEN=your-mapbox-token
VITE_OPENWEATHER_API_KEY=your-openweather-key
VITE_PURPLEAIR_API_KEY=your-purpleair-key
```

### Backend Environment Variables

Create `functions/.env`:
```env
# EPA AQS Credentials
EPA_AQS_EMAIL=your-email
EPA_AQS_KEY=your-key

# OpenAQ API Key
OPENAQ_API_KEY=your-key

# OpenWeatherMap API Key
OPENWEATHER_API_KEY=your-key

# Admin Secret
ADMIN_SECRET=test-admin-secret
```

---

## ✅ **Verification Checklist**

### 1. Check Emulators
- [ ] Functions emulator running on port 5001
- [ ] Firestore emulator running on port 8080
- [ ] Emulator UI accessible at http://127.0.0.1:4000

### 2. Check Frontend
- [ ] Frontend server running
- [ ] No console errors
- [ ] Map loads correctly
- [ ] API calls work (check Network tab)

### 3. Test Features
- [ ] **Sensor Map**: Displays sensors and facilities
- [ ] **Smell PGH**: Fetches reports (check console)
- [ ] **BreatheAI**: Can submit symptom reports
- [ ] **Evidence Reports**: Can generate reports
- [ ] **Compliance Cards**: Click facilities to see compliance data

---

## 🧪 **Testing Endpoints**

### Test Cloud Functions

```bash
# Test Smell PGH API
curl "http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1/fetchSmellPGHReports?region_ids=1&smell_value=4,5"

# Test Title V Facilities
curl "http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1/getTitleVFacilities"

# Test Facility Compliance
curl "http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1/getFacilityCompliance?facilityId=clairton-works"
```

---

## 🐛 **Troubleshooting**

### Emulators Not Starting
```bash
# Check if ports are in use
lsof -i :5001
lsof -i :8080
lsof -i :4000

# Kill processes if needed
kill -9 <PID>
```

### Frontend Not Connecting to Emulators
- Check `VITE_USE_EMULATOR=true` in `.env`
- Verify emulators are running
- Check browser console for errors

### Map Not Loading
- Verify `VITE_MAPBOX_ACCESS_TOKEN` is set
- Check browser console for Mapbox errors
- Ensure token has correct permissions

### API Calls Failing
- Check Network tab in browser DevTools
- Verify emulator URLs are correct
- Check CORS settings in functions

---

## 📊 **Access Points**

Once running:

1. **Frontend Application**: http://localhost:5173
2. **Emulator UI**: http://127.0.0.1:4000
3. **Functions**: http://127.0.0.1:5001
4. **Firestore**: http://127.0.0.1:8080

---

## 🎯 **Quick Test Commands**

```bash
# Start everything (in separate terminals)
# Terminal 1:
firebase emulators:start --only functions,firestore

# Terminal 2:
cd frontend && npm run dev

# Test in browser:
open http://localhost:5173
```

---

## 📝 **Notes**

- Emulators use in-memory storage (data resets on restart)
- Frontend hot-reloads on code changes
- Check browser console for detailed error messages
- Network tab shows all API calls

---

**Ready for Testing!** 🚀


