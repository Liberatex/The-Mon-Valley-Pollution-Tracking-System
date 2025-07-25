# Mon Valley Pollution Tracking System - API Documentation

## 🔧 **Backend API (Firebase Cloud Functions)**

### **Core Functions**

#### 1. **processSensorData** - Firestore Trigger
**Purpose**: Processes incoming sensor data and updates analytics
```typescript
// Triggered on sensor data write to Firestore
export const processSensorData = onDocumentWritten(
  'sensors/{sensorId}/readings/{readingId}',
  async (event) => {
    // Processes PM2.5, VOCs, and other pollutant data
    // Updates real-time analytics and triggers alerts
  }
);
```

#### 2. **submitSymptomReport** - HTTPS Endpoint
**Purpose**: Handles symptom report submissions from residents
```typescript
// POST /submitSymptomReport
export const submitSymptomReport = onRequest(async (req, res) => {
  // Accepts OSAC framework data
  // Validates and stores symptom reports
  // Triggers health alerts if needed
});
```

#### 3. **scheduledFirestoreBackup** - Scheduled Function
**Purpose**: Daily automated backup of Firestore data
```typescript
// Runs daily at 2:00 AM
export const scheduledFirestoreBackup = onSchedule(
  '0 2 * * *',
  async (event) => {
    // Creates daily backup to Cloud Storage
    // Maintains 30-day retention policy
  }
);
```

### **External API Integrations**

#### 4. **fetchPurpleAirSensorData** - HTTPS Endpoint
**Purpose**: Fetches real-time data from PurpleAir sensors
```typescript
// GET /fetchPurpleAirSensorData
export const fetchPurpleAirSensorData = onRequest(async (req, res) => {
  // Fetches PM2.5 data from PurpleAir API
  // Processes and stores sensor readings
  // Returns formatted data for frontend
});
```

#### 5. **fetchNASASatelliteData** - HTTPS Endpoint
**Purpose**: Retrieves satellite data for air quality analysis
```typescript
// GET /fetchNASASatelliteData
export const fetchNASASatelliteData = onRequest(async (req, res) => {
  // Fetches NASA satellite data
  // Processes aerosol and pollution data
  // Correlates with ground sensor data
});
```

## 🎨 **Frontend Components API**

### **Core Components**

#### 1. **SensorMap Component**
```typescript
interface SensorMapProps {
  sensors?: Sensor[];
  onSensorSelect: (sensor: Sensor) => void;
}

interface Sensor {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  pm25: number;
  lastUpdated: Date;
}
```

**Features**:
- Interactive map with sensor markers
- Real-time PM2.5 data display
- Sensor selection and details
- Color-coded air quality indicators

#### 2. **SymptomReportForm Component**
```typescript
interface SymptomReportFormProps {
  onSuccess: (reportId: string) => void;
}

interface OSAC {
  onset: 'sudden' | 'gradual';
  severity: 1 | 2 | 3 | 4 | 5;
  course: 'improving' | 'stable' | 'worsening';
  associated: string[];
  context: string;
}
```

**Features**:
- OSAC framework implementation
- Multi-symptom tracking
- Form validation and error handling
- Accessibility compliance

#### 3. **Dashboard Component**
```typescript
interface DashboardStats {
  totalSensors: number;
  activeAlerts: number;
  averagePM25: number;
  recentReports: number;
  airQualityTrend: 'improving' | 'stable' | 'worsening';
}
```

**Features**:
- Real-time statistics display
- Air quality trends visualization
- Alert management interface
- Data export capabilities

## 🔐 **Authentication & Security**

### **Firebase Security Rules**
```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Sensor data - read-only for authenticated users
    match /sensors/{sensorId} {
      allow read: if request.auth != null;
      allow write: if false; // Only backend can write
    }
    
    // Symptom reports - users can only read their own
    match /symptomReports/{reportId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

### **API Rate Limiting**
- **Public endpoints**: 100 requests/minute
- **Authenticated endpoints**: 1000 requests/minute
- **Admin endpoints**: 5000 requests/minute

## 📊 **Data Models**

### **Sensor Data Model**
```typescript
interface SensorReading {
  id: string;
  sensorId: string;
  timestamp: Date;
  pm25: number;
  pm10?: number;
  temperature?: number;
  humidity?: number;
  location: {
    lat: number;
    lng: number;
  };
  quality: 'good' | 'moderate' | 'unhealthy' | 'very_unhealthy' | 'hazardous';
}
```

### **Symptom Report Model**
```typescript
interface SymptomReport {
  id: string;
  userId: string;
  timestamp: Date;
  symptoms: string[];
  osac: OSAC;
  location?: {
    lat: number;
    lng: number;
  };
  weather?: {
    temperature: number;
    humidity: number;
    windSpeed: number;
  };
  airQuality?: {
    pm25: number;
    quality: string;
  };
}
```

## 🚀 **Deployment Environments**

### **Staging Environment**
- **URL**: https://staging-mv-pollution.web.app
- **Functions**: https://us-central1-mv-pollution-tracking-staging.cloudfunctions.net
- **Database**: Firestore staging instance

### **Production Environment**
- **URL**: https://mv-pollution-tracking.web.app
- **Functions**: https://us-central1-mv-pollution-tracking-system.cloudfunctions.net
- **Database**: Firestore production instance

## 📈 **Performance Metrics**

### **API Response Times**
- **Sensor data**: < 200ms
- **Symptom submission**: < 500ms
- **Dashboard stats**: < 300ms
- **External API calls**: < 2s

### **Scalability Targets**
- **Concurrent users**: 10,000+
- **Daily sensor readings**: 1M+
- **Symptom reports**: 10,000/day
- **Data retention**: 5 years

## 🔧 **Error Handling**

### **Standard Error Responses**
```typescript
interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Common error codes
const ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  RATE_LIMITED: 'RATE_LIMITED',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR'
};
```

### **Frontend Error Handling**
- Network error retry logic
- User-friendly error messages
- Graceful degradation
- Offline support with PWA

## 📚 **Integration Examples**

### **Fetching Sensor Data**
```typescript
// Frontend example
const fetchSensorData = async () => {
  try {
    const response = await fetch('/api/sensors');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch sensor data:', error);
    throw error;
  }
};
```

### **Submitting Symptom Report**
```typescript
// Frontend example
const submitReport = async (reportData: SymptomReport) => {
  try {
    const response = await fetch('/api/submitSymptomReport', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData),
    });
    const result = await response.json();
    return result.reportId;
  } catch (error) {
    console.error('Failed to submit report:', error);
    throw error;
  }
};
```

## 🔄 **Webhook Integrations**

### **PurpleAir Webhook**
- **Endpoint**: `/webhooks/purpleair`
- **Purpose**: Real-time sensor data updates
- **Authentication**: API key validation
- **Rate**: Every 5 minutes

### **Health Alert Webhook**
- **Endpoint**: `/webhooks/healthAlerts`
- **Purpose**: Trigger health notifications
- **Authentication**: Firebase Auth
- **Rate**: On-demand

## 📋 **API Versioning**

### **Current Version**: v1.0
- **Base URL**: `/api/v1`
- **Deprecation Policy**: 6 months notice
- **Backward Compatibility**: Maintained for 1 year

### **Version History**
- **v1.0**: Initial release with core functionality
- **v1.1**: Added OSAC framework support
- **v1.2**: Enhanced error handling and validation

---

*This documentation is maintained as part of the Mon Valley Pollution Tracking System project. For questions or updates, please refer to the development team.* 