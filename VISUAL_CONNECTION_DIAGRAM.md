# Visual Connection Diagram

## 🎯 **THE THREE ENVIRONMENTS**

```
┌─────────────────────────────────────────────────────────────┐
│                  YOUR COMPUTER                              │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │ LOCAL DEVELOPMENT (you are here now)              │   │
│  │                                                     │   │
│  │  Files on your computer:                           │   │
│  │  ├── frontend/src/components/ExposureModel.tsx    │   │
│  │  ├── frontend/src/components/EvidenceReport.tsx   │   │
│  │  ├── frontend/src/App.tsx (updated)              │   │
│  │  └── functions/src/index.ts (updated)            │   │
│  │                                                     │   │
│  │  When you run: npm start (or react-scripts)       │   │
│  │  Opens at: http://localhost:3000                 │   │
│  │                                                     │   │
│  │  When you run: firebase emulators:start           │   │
│  │  Opens at: http://127.0.0.1:4000 (this UI)       │   │
│  │                                                     │   │
│  │  Status: ⚠️ Only visible to YOU                    │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                        ↓
                   YOU DEPLOY
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                   FIREBASE CLOUD                            │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │ PRODUCTION SITE (public sees this)                │   │
│  │                                                     │   │
│  │  URL: https://mv-pollution-tracking-system.web.app│   │
│  │                                                     │   │
│  │  Hosted on: Firebase Hosting                       │   │
│  │  Database: Firestore (production)                  │   │
│  │  Backend: Cloud Functions (production)             │   │
│  │                                                     │   │
│  │  Status: ✅ VISIBLE TO EVERYONE                      │   │
│  │                                                     │   │
│  │  Currently shows: OLD code                         │   │
│  │  Will show: NEW code (after deploy)               │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 **THE DEPLOYMENT FLOW**

```
┌──────────────────────────────────────────────────────┐
│  STEP 1: You have new code locally                 │
│                                                     │
│  📁 /frontend/src/components/                      │
│     - ExposureModel.tsx      ← NEW!                 │
│     - EvidenceReport.tsx     ← NEW!                 │
│                                                      │
│  📁 /functions/src/index.ts                       │
│     - submitSymptomReport    ← ENHANCED!           │
│     - getTitleVFacilities    ← NEW!                 │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│  STEP 2: You build                                  │
│                                                     │
│  $ cd frontend && npm run build                    │
│                                                     │
│  Creates: /frontend/build/index.html              │
│         + bundled JS files                          │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│  STEP 3: You deploy                                 │
│                                                     │
│  $ firebase deploy                                 │
│                                                     │
│  Firebase uploads:                                  │
│  - Frontend → Firebase Hosting                    │
│  - Functions → Cloud Functions                     │
│  - Rules → Firestore                               │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│  STEP 4: Public sees updated site!                 │
│                                                     │
│  🌐 https://mv-pollution-tracking-system.web.app   │
│                                                     │
│  Now shows:                                         │
│  ✅ New features                                    │
│  ✅ Improved UI                                     │
│  ✅ Exposure Model                                  │
│  ✅ Evidence Reports                                │
└──────────────────────────────────────────────────────┘
```

---

## 🖥️ **WHAT YOU SEE AT 127.0.0.1:4000**

```
┌──────────────────────────────────────────────────────┐
│         Firebase Emulator UI Dashboard              │
│  http://127.0.0.1:4000                               │
│                                                     │
│  ┌────────────────────────────────────────────────┐ │
│  │  Functions   │  Firestore  │  Logs              │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  [Functions]                                        │
│  ├── testTogetherAI                    ✓ Running   │
│  ├── llama3Chat                        ✓ Running   │
│  ├── submitSymptomReport                ✓ Running   │
│  ├── getTitleVFacilities                ✓ Running   │
│  └── ... (10 functions total)                     │
│                                                     │
│  [Firestore]                                        │
│  ├── symptomReports                                 │
│  ├── titleVFacilities                               │
│  ├── healthAlerts                                   │
│  └── ...                                            │
│                                                     │
│  This is a CONTROL PANEL                            │
│  Not your actual website!                           │
└──────────────────────────────────────────────────────┘
```

---

## 🌐 **WHAT PUBLIC SEES AT PRODUCTION URL**

```
BEFORE DEPLOY (Current - shows OLD code):

https://mv-pollution-tracking-system.web.app

┌──────────────────────────────────────────────┐
│  Mon Valley Pollution Tracking System       │
│                                              │
│  [Dashboard][Map][Symptoms][AI]             │
│                                              │
│  ❌ Missing: Exposure Risk                   │
│  ❌ Missing: Evidence Reports               │
│  ❌ Missing: Title V facilities on map      │
└──────────────────────────────────────────────┘


AFTER DEPLOY (Will show NEW code):

https://mv-pollution-tracking-system.web.app

┌──────────────────────────────────────────────┐
│  🚀 Project Lumna: PHPA Platform            │
│                                              │
│  [Dashboard][Map][Symptoms][AI]              │
│  [🔬 Exposure Risk][📄 Evidence Reports]     │
│                                              │
│  ✅ New: Exposure Risk Model                 │
│  ✅ New: Evidence Reports                     │
│  ✅ New: Title V facilities on map          │
│  ✅ Enhanced: Professional UI                 │
└──────────────────────────────────────────────┘
```

---

## 💡 **KEY INSIGHTS**

### **What 127.0.0.1:4000 IS:**
- ✅ Emulator UI (control panel)
- ✅ Testing environment
- ✅ Safe sandbox
- ❌ NOT your website
- ❌ NOT accessible to public

### **What 127.0.0.1:4000 is NOT:**
- ❌ Your React app (that runs on port 3000)
- ❌ The public website
- ❌ Production data

### **What https://mv-pollution-tracking-system.web.app IS:**
- ✅ Your live, public website
- ✅ Firebase Hosting
- ✅ Currently shows OLD code
- ✅ Will show NEW code after deploy

### **What https://mv-pollution-tracking-system.web.app needs:**
- 📤 To be updated with `firebase deploy`
- 📤 To receive your new components
- 📤 To show Exposure Risk & Evidence Reports

---

## 🚀 **CONNECT THEM NOW:**

```bash
# This connects local → production

cd frontend && npm run build && cd ..
firebase deploy

# Now visit:
open https://mv-pollution-tracking-system.web.app

# You'll see your improvements! 🎉
```


