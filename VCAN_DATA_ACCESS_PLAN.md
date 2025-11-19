# VCAN Data Access Plan
## How VCAN Will Access Health Data (HIPAA-Compliant)

---

## 🎯 **THE PROBLEM**

**VCAN needs to:**
- View aggregated health data (symptoms, trends, patterns)
- Generate evidence reports for regulators
- Analyze correlations (health vs. pollution)
- Export data for research/advocacy

**But they CAN'T:**
- See individual names or personal info (HIPAA)
- Access raw, unaggregated data (privacy)
- Export without audit logging (compliance)

---

## ✅ **THE SOLUTION: Three-Tier Architecture**

### **Tier 1: Raw Data Storage** (VCAN Does NOT Access)
```
Firestore/Cosmos DB: symptomReports
- Pseudonymized user IDs
- Individual reports
- Admin-only access
- Purpose: Data collection only
```

### **Tier 2: Analytics Warehouse** (VCAN Accesses Aggregated Data)
```
BigQuery (Firebase) / Synapse (Azure)
- Daily/weekly/monthly aggregates
- Symptom counts by type
- Severity distributions
- Geographic patterns (aggregated)
- No individual identifiers
- Purpose: Analytics & reporting
```

### **Tier 3: Visualization Dashboard** (VCAN Uses Daily)
```
Data Studio (Firebase) / Power BI (Azure)
- Real-time dashboards
- Charts & graphs
- Export capabilities
- Shareable reports
- Purpose: VCAN's daily tool
```

---

## 📊 **WHAT VCAN WILL SEE**

### **Dashboard View:**
- ✅ Total symptom reports (count)
- ✅ Reports by date (line chart)
- ✅ Symptom types (pie chart: cough, wheezing, etc.)
- ✅ Severity distribution (bar chart)
- ✅ Geographic heat map (aggregated by zip code)
- ✅ Correlation: Health events vs. air quality spikes
- ✅ Facility proximity analysis (aggregated)

### **What VCAN WON'T See:**
- ❌ Individual names
- ❌ Exact addresses
- ❌ Individual user IDs
- ❌ Raw location coordinates
- ❌ Any personally identifiable information

---

## 🔐 **ACCESS CONTROL**

### **VCAN User Roles:**

1. **VCAN Analyst** (Read-Only)
   - View dashboards
   - Export aggregated data
   - Generate reports
   - **Cannot**: Access raw data

2. **VCAN Admin** (Enhanced Access)
   - All Analyst permissions
   - Access audit logs
   - Manage exports
   - **Cannot**: Access individual reports

3. **System Admin** (Full Access)
   - Access raw data (for debugging)
   - Manage users
   - Configure system
   - **Audited**: All access logged

---

## 🛠️ **IMPLEMENTATION: What Needs to Be Built**

### **1. Aggregation Pipeline** (Cloud Function)

**Purpose**: Convert raw reports → aggregated data

**Function**: `aggregateHealthData`
- Runs daily at midnight
- Aggregates previous day's reports
- Stores in `symptomReportAggregates` collection
- **Output**: Daily/weekly/monthly aggregates

**Data Structure:**
```typescript
{
  date: '2024-12-16',
  totalReports: 45,
  symptoms: {
    'cough': 23,
    'wheezing': 12,
    'shortness_of_breath': 10
  },
  severity: {
    'mild': 20,
    'moderate': 15,
    'severe': 8,
    'very_severe': 2
  },
  geographic: {
    '15227': 15, // zip code counts
    '15210': 20,
    '15025': 10
  },
  avgPM25: 45.2,
  correlationScore: 0.78
}
```

### **2. BigQuery Export** (Cloud Function)

**Purpose**: Export aggregates to BigQuery for analytics

**Function**: `exportToBigQuery`
- Runs after aggregation
- Exports to BigQuery dataset
- **Purpose**: Enable Data Studio connection

### **3. Data Studio Dashboard**

**Purpose**: VCAN's visualization tool

**Features:**
- Real-time charts
- Date range filters
- Export to PDF/CSV
- Shareable links

**Access**: VCAN team members (Google account required)

### **4. Export API** (Cloud Function)

**Purpose**: Programmatic data access for VCAN

**Function**: `getHealthAggregates`
- REST API endpoint
- Returns aggregated data (JSON)
- Supports filters (date range, location)
- **Audit**: All API calls logged

**Function**: `exportHealthData`
- Generates CSV/JSON export
- Admin-only access
- **Audit**: All exports logged

---

## 📋 **STEP-BY-STEP: VCAN Access Workflow**

### **Daily Workflow:**

1. **VCAN Analyst logs into Data Studio**
   - Authenticates with Google account
   - Views dashboard (auto-refreshes)

2. **Views aggregated data**
   - Sees trends, patterns
   - No individual data visible

3. **Generates report**
   - Clicks "Export Report"
   - Gets PDF with aggregated data
   - **Audit**: Export logged

4. **Exports data (if needed)**
   - Uses `exportHealthData` API
   - Gets CSV with aggregated data
   - **Audit**: Export logged

### **Weekly Workflow:**

1. **VCAN Admin reviews audit logs**
   - Checks who accessed what
   - Verifies compliance
   - **Location**: AdminDashboard → Audit Logs

2. **Generates compliance report**
   - For regulators/board
   - Shows data access compliance
   - **Location**: EvidenceReport component

---

## 🔒 **SECURITY & COMPLIANCE**

### **Data Protection:**
- ✅ Aggregated data only (no PHI)
- ✅ Access controls (role-based)
- ✅ Audit logging (all access tracked)
- ✅ Encryption (at rest & in transit)
- ✅ BAA signed (HIPAA compliance)

### **Audit Trail:**
Every VCAN access is logged:
```typescript
{
  timestamp: '2024-12-16T10:30:00Z',
  userId: 'vcan-analyst-001',
  action: 'view_dashboard',
  resource: 'health_aggregates',
  filters: { dateRange: '2024-12-01 to 2024-12-16' },
  ipAddress: 'hashed',
  purpose: 'analytics'
}
```

---

## 💰 **COST ESTIMATE**

### **Firebase Stack:**
- Firestore: ~$5-10/month (health data)
- BigQuery: ~$10-20/month (analytics)
- Data Studio: **FREE**
- **Total**: ~$15-30/month

### **Azure Stack:**
- Cosmos DB: ~$25/month
- Synapse: ~$10-20/month
- Power BI: $10/user/month
- **Total**: ~$45-55/month + licenses

---

## ✅ **IMPLEMENTATION CHECKLIST**

### **Phase 1: Analytics Infrastructure**
- [ ] Create `symptomReportAggregates` collection
- [ ] Build `aggregateHealthData` function
- [ ] Set up BigQuery dataset
- [ ] Build `exportToBigQuery` function
- [ ] Test aggregation pipeline

### **Phase 2: Dashboard**
- [ ] Create Data Studio dashboard
- [ ] Connect to BigQuery
- [ ] Build charts & visualizations
- [ ] Set up access controls
- [ ] Test with VCAN team

### **Phase 3: Export API**
- [ ] Build `getHealthAggregates` function
- [ ] Build `exportHealthData` function
- [ ] Implement audit logging
- [ ] Create API documentation
- [ ] Test API endpoints

### **Phase 4: Compliance**
- [ ] Sign Google Cloud BAA
- [ ] Sign Azure BAA
- [ ] Implement audit logging
- [ ] Create retention policy
- [ ] Document compliance procedures

---

## 🎯 **NEXT STEPS**

1. **Immediate**: Sign BAAs (1-3 business days)
2. **Week 1**: Build aggregation pipeline
3. **Week 2**: Set up BigQuery + Data Studio
4. **Week 3**: Build export API
5. **Week 4**: Test with VCAN team

**Ready to start implementation?** 🚀

