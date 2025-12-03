# Smell PGH API Integration Setup

## ✅ **IMPLEMENTATION COMPLETE**

The Smell PGH API has been fully integrated into the system. This document explains how it works and how to configure it.

---

## 📡 **API ENDPOINTS**

### Backend Cloud Function
- **Endpoint**: `fetchSmellPGHReports`
- **URL**: 
  - Development: `http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1/fetchSmellPGHReports`
  - Production: `https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/fetchSmellPGHReports`

### Smell PGH Public API
- **Base URL**: `https://api.smellpittsburgh.org/api/v2/smell_reports`
- **Documentation**: 
  - [How to use the API](https://github.com/CMU-CREATE-Lab/smell-pittsburgh-rails/wiki/How-to-use-the-API)
  - [API Reference](https://github.com/CMU-CREATE-Lab/smell-pittsburgh-rails/wiki/Smell-PGH-API)

---

## 🔧 **HOW IT WORKS**

### Architecture
1. **Frontend** calls our backend Cloud Function
2. **Backend Function** calls Smell PGH API (avoids CORS, handles rate limiting)
3. **Data Processing**: Reports are filtered, mapped, and clustered
4. **Visualization**: Clusters displayed on map as colored circles

### Data Flow
```
Frontend (SensorMapMapbox)
  ↓
Backend Cloud Function (fetchSmellPGHReports)
  ↓
Smell PGH API (https://api.smellpittsburgh.org/api/v2/smell_reports)
  ↓
Data Processing (filtering, mapping, clustering)
  ↓
Map Visualization (colored clusters)
```

---

## ⚙️ **CONFIGURATION**

### Environment Variables

**No environment variables required for GET requests!**

The Smell PGH API is **publicly accessible** for reading reports. No authentication needed.

**Optional (for future POST requests):**
If you want to submit smell reports via API in the future, you'll need:
- `SMELL_PGH_CLIENT_TOKEN` - Client token from CMU Create Lab

**Where to add (if needed for POST):**
- **Backend**: `functions/.env` (for Cloud Functions)
- **Frontend**: `frontend/.env` (not needed for GET requests)

---

## 📊 **API PARAMETERS**

### Query Parameters Supported

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `smell_value` | string | Comma-separated values (1-5) | `"3,4,5"` (noticeable or worse) |
| `start_time` | number | Unix timestamp | 7 days ago |
| `end_time` | number | Unix timestamp | Now |
| `region_ids` | string | Region ID (Allegheny County = 1) | `"1"` |
| `north` | number | Bounding box north | Mon Valley area |
| `south` | number | Bounding box south | Mon Valley area |
| `east` | number | Bounding box east | Mon Valley area |
| `west` | number | Bounding box west | Mon Valley area |

### Smell Value Scale
- **1**: Just fine!
- **2**: Barely noticeable
- **3**: Definitely noticeable
- **4**: It's getting pretty bad
- **5**: About as bad as it gets!

---

## 🗺️ **MAP INTEGRATION**

### Visual Display
- **Clusters** shown as colored circles on map
- **Color coding**:
  - Light green: Low smell (1-2)
  - Gold: Moderate smell (2-3)
  - Dark orange: High smell (3-4)
  - Crimson: Very high smell (4-5)
- **Size** based on cluster size (more reports = larger circle)
- **Toggle** available in map controls

### Clustering Algorithm
- Groups nearby reports into "Odor Events"
- Default: Reports within ~1km form clusters
- Minimum 3 reports per cluster
- Calculates average smell value and odor weight

---

## 🔄 **REAL-TIME UPDATES**

- **Polling Interval**: Every 5 minutes (300 seconds)
- **Default Time Range**: Last 7 days
- **Default Filter**: Smell value 3+ (noticeable or worse)

---

## 📝 **USAGE EXAMPLES**

### Frontend Service
```typescript
import { fetchSmellPGHReports } from '../services/smellPGHService';

// Fetch last 7 days, smell value 3+
const reports = await fetchSmellPGHReports(
  { north: 40.5, south: 40.0, east: -79.6, west: -80.3 },
  7,  // days
  3   // min smell value
);
```

### Backend Function
```bash
# Get reports from last 7 days
curl "https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/fetchSmellPGHReports?smell_value=3,4,5&region_ids=1"

# Get reports from specific date range
curl "https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/fetchSmellPGHReports?start_time=1704067200&end_time=1704672000"
```

---

## ✅ **TESTING**

### Test the Integration

1. **Start emulators**:
   ```bash
   firebase emulators:start --only functions
   ```

2. **Test backend function**:
   ```bash
   curl "http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1/fetchSmellPGHReports?region_ids=1&smell_value=4,5"
   ```

3. **Check frontend**:
   - Open Sensor Map
   - Enable "Smell Reports" toggle
   - Should see colored clusters if reports exist

---

## 🎯 **VCAN REQUIREMENT COMPLIANCE**

✅ **Fully Compliant**:
- ✅ API integration complete
- ✅ Real-time polling (5-minute intervals)
- ✅ Clustering algorithm implemented
- ✅ Map visualization working
- ✅ Odor weight calculation for risk algorithm
- ✅ Integration with weighted risk calculation

---

## 📚 **REFERENCES**

- [Smell PGH API Documentation](https://github.com/CMU-CREATE-Lab/smell-pittsburgh-rails/wiki/Smell-PGH-API)
- [How to Use the API](https://github.com/CMU-CREATE-Lab/smell-pittsburgh-rails/wiki/How-to-use-the-API)
- [Smell PGH Website](https://smellpgh.org)

---

## 🚀 **STATUS**

**✅ READY FOR PRODUCTION**

The Smell PGH integration is complete and working. No additional setup required - the API is publicly accessible for reading reports.


