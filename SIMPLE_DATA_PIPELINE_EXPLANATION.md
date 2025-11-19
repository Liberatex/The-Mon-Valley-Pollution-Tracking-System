# Simple Explanation: Title V Integration & Data Pipeline

## 🏭 How Title V Integration Works (Super Simple)

### What is Title V?
Title V facilities are **big industrial polluters** that need special permits. In Mon Valley, we have 3 major steel facilities:
1. **U.S. Steel Clairton Coke Works** (Clairton)
2. **Edgar Thomson Steel Works** (Braddock)  
3. **Irvin Plant** (West Mifflin)

### How We Integrated It (3 Steps):

#### Step 1: We Created the Data Structure
We manually created a list of 3 facilities with their information:
- Location (latitude/longitude)
- Permit numbers
- What pollutants they're allowed to emit (PM2.5, SO2, NOx, etc.)
- How much they actually emitted (from public records)

**Location**: `functions/src/index.ts` - Look for `MON_VALLEY_FACILITIES` array (around line 423)

#### Step 2: We Store It in Firestore Database
We created a Cloud Function called `seedTitleVFacilities` that:
- Takes our facility list
- Saves it to Firestore database in a collection called `titleVFacilities`
- This is a ONE-TIME setup (like planting seeds in a garden)

**How to run it**: Call the function once to populate the database

#### Step 3: We Display It on the Map
The frontend (`SensorMap.tsx`) calls `getTitleVFacilities` Cloud Function:
- Fetches all facilities from Firestore
- Shows them as **red markers** on the map
- When you click a marker, shows permit info, emissions, etc.

**Flow**:
```
Hardcoded Facility List → Cloud Function → Firestore Database → Map Display
```

### Why This Approach?
- **Simple**: No complex API scraping needed
- **Reliable**: Data doesn't change often (permits are annual)
- **Fast**: Data is stored locally, loads instantly
- **Accurate**: We manually verified the permit data

---

## 📊 How Our Data Pipeline Works (Super Simple)

Think of it like a **water pipeline** - data flows from sources → processing → display

### The 3 Main Data Sources:

#### 1. **PurpleAir Sensors** (Community Sensors)
**Source**: PurpleAir API (community volunteers' sensors)
**Flow**:
```
PurpleAir API → Frontend Direct Call → Map Display
```

**How it works**:
- Frontend (`SensorMap.tsx`) directly calls PurpleAir API
- Gets ~238 sensors in Mon Valley area
- Shows them as blue markers on map
- Updates every time you load the map

**Current Status**: 
- ✅ Works if you have `REACT_APP_PURPLEAIR_API_KEY` in `frontend/.env`
- ⚠️ Falls back to 3 mock sensors if no API key

#### 2. **ACHD Official Data** (Government Monitors)
**Source**: WPRDC (Western PA Regional Data Center) → EPA AQS
**Flow**:
```
ACHD Monitors → EPA AQS → WPRDC → Our Cloud Function → Dashboard
```

**How it works**:
- ACHD reports to EPA's Air Quality System (AQS)
- WPRDC publishes this data via CKAN API (free, no key needed!)
- Our Cloud Function `getACHDAirQuality` fetches it
- Dashboard displays it

**Data Sources (in priority order)**:
1. **WPRDC** (first choice - official ACHD data)
2. **OpenAQ** (fallback - aggregates EPA AirNow data)
3. **Fallback value** (45.2 μg/m³ - realistic Mon Valley average)

**Files**:
- `functions/src/wprdcService.ts` - Fetches from WPRDC
- `functions/src/acqdDataService.ts` - Main service with fallbacks
- `functions/src/index.ts` - `getACHDAirQuality` Cloud Function

#### 3. **Title V Facilities** (Industrial Polluters)
**Source**: Manually entered permit data
**Flow**:
```
Hardcoded List → Firestore Database → Cloud Function → Map Display
```

**How it works**:
- We manually entered 3 facilities' permit data
- Stored in Firestore `titleVFacilities` collection
- `getTitleVFacilities` Cloud Function reads from database
- Map displays as red markers

---

## 🔄 Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA SOURCES                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. PurpleAir API                                           │
│     └─> Frontend (SensorMap.tsx)                            │
│         └─> Direct API call                                  │
│         └─> Shows on map as blue markers                     │
│                                                              │
│  2. ACHD Official Data                                       │
│     └─> WPRDC (data.wprdc.org)                              │
│         └─> Cloud Function: getACHDAirQuality               │
│             └─> Dashboard displays PM2.5, AQI                │
│                                                              │
│  3. Title V Facilities                                       │
│     └─> Hardcoded in functions/src/index.ts                 │
│         └─> Cloud Function: seedTitleVFacilities (one-time)│
│             └─> Firestore: titleVFacilities collection      │
│                 └─> Cloud Function: getTitleVFacilities     │
│                     └─> Map displays as red markers         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Files to Understand

### Title V Integration:
- **`functions/src/index.ts`** (line ~423): `MON_VALLEY_FACILITIES` array - the data
- **`functions/src/index.ts`** (line ~600): `seedTitleVFacilities` - saves to database
- **`functions/src/index.ts`** (line ~650): `getTitleVFacilities` - reads from database
- **`frontend/src/components/SensorMap.tsx`** (line ~183): Fetches and displays facilities

### Data Pipeline:
- **`functions/src/wprdcService.ts`**: Fetches ACHD data from WPRDC
- **`functions/src/acqdDataService.ts`**: Main service with fallback logic
- **`functions/src/index.ts`** (line ~949): `getACHDAirQuality` Cloud Function
- **`frontend/src/components/Dashboard.tsx`**: Displays ACHD data
- **`frontend/src/components/SensorMap.tsx`** (line ~58): Fetches PurpleAir sensors

---

## 💡 Simple Summary

**Title V**: 
- We manually entered 3 steel facilities' permit data
- Stored in Firestore database
- Displayed on map as red markers

**Data Pipeline**:
- **PurpleAir**: Frontend → API → Map (direct)
- **ACHD**: WPRDC → Cloud Function → Dashboard (via backend)
- **Title V**: Hardcoded → Firestore → Cloud Function → Map (stored data)

**Why Different Approaches?**
- PurpleAir: Changes constantly, so we fetch fresh each time
- ACHD: Official data, needs processing, so we use Cloud Function
- Title V: Changes rarely (annual permits), so we store it once

---

## 🔧 Current Status

✅ **Working**:
- Title V facilities display on map
- ACHD data shows on dashboard (with fallbacks)
- PurpleAir sensors work (if API key configured)

⚠️ **Needs Setup**:
- PurpleAir API key in `frontend/.env` for real sensor data
- Title V data seeded once (run `seedTitleVFacilities` function)

📝 **Future Improvements**:
- Automate Title V data updates (scrape permit websites)
- Add scheduled data fetching (cron jobs)
- Store historical data in Firestore

---

## 🤖 Python Scripts (Separate - For AI Knowledge Base)

**Note**: There are Python scripts in `rag_ingest/` folder, but these are **NOT part of the real-time data pipeline**.

**What they do**:
- Download documents, reports, regulations for the AI assistant
- Store in `rag_data/` folder
- Used to train the AI (BreatheAI) to answer questions about air quality

**They are separate because**:
- Real-time monitoring = Cloud Functions (TypeScript) → Fast, always running
- AI knowledge base = Python scripts → Run once to download documents

**Current Status**: 
- Scripts exist but are **not connected** to the main pipeline
- They're for future AI enhancement, not current monitoring

