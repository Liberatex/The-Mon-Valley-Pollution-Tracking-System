# Testing Guide
## How to Test All New Functions

---

## 🧪 **TESTING CHECKLIST**

### **1. Aggregation Pipeline Tests**

#### **Test Daily Aggregation:**
```bash
# Using Firebase emulator
cd functions
npm run build
firebase emulators:start --only functions

# In another terminal, trigger manual aggregation
curl -X POST http://localhost:5001/mv-pollution-tracking-system/us-central1/aggregateHealthDataManual \
  -H "Content-Type: application/json" \
  -d '{"type": "daily", "date": "2024-12-16"}'
```

**Expected Result:**
- ✅ Function executes without errors
- ✅ Aggregate created in Firestore: `symptomReportAggregates/daily_2024-12-16`
- ✅ Aggregate contains: date, totalReports, symptoms, severity, geographic

#### **Test Weekly Aggregation:**
```bash
curl -X POST http://localhost:5001/mv-pollution-tracking-system/us-central1/aggregateHealthDataManual \
  -H "Content-Type: application/json" \
  -d '{"type": "weekly", "date": "2024-12-09"}'
```

**Expected Result:**
- ✅ Aggregate created: `symptomReportAggregates/weekly_2024-12-09`
- ✅ Contains weekStart, weekEnd, avgDailyReports

#### **Test Monthly Aggregation:**
```bash
curl -X POST http://localhost:5001/mv-pollution-tracking-system/us-central1/aggregateHealthDataManual \
  -H "Content-Type: application/json" \
  -d '{"type": "monthly", "date": "2024-12"}'
```

**Expected Result:**
- ✅ Aggregate created: `symptomReportAggregates/monthly_2024-12`
- ✅ Contains trends (reportGrowth, symptomTrends)

---

### **2. Audit Logging Tests**

#### **Test Audit Log Creation:**
```bash
# Submit a symptom report (triggers audit log)
curl -X POST http://localhost:5001/mv-pollution-tracking-system/us-central1/submitSymptomReport \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "symptoms": ["cough", "wheezing"],
    "severity": 3,
    "osac": {
      "onset": "sudden",
      "severity": 3,
      "aggravatingFactors": ["outdoor"],
      "course": "worsening"
    },
    "consent": true
  }'
```

**Expected Result:**
- ✅ Symptom report created
- ✅ Audit log created in `auditLogs` collection
- ✅ Log contains: timestamp, userId (hashed), action, resource, purpose

#### **Test Audit Log Retrieval:**
```bash
curl -X GET "http://localhost:5001/mv-pollution-tracking-system/us-central1/getAuditLogsAPI?limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

**Expected Result:**
- ✅ Returns audit logs
- ✅ Logs are properly formatted
- ✅ No PHI in logs

---

### **3. BigQuery Export Tests**

#### **Test BigQuery Export:**
```bash
# First, create an aggregate
curl -X POST http://localhost:5001/mv-pollution-tracking-system/us-central1/aggregateHealthDataManual \
  -H "Content-Type: application/json" \
  -d '{"type": "daily", "date": "2024-12-16"}'

# Then export to BigQuery
curl -X POST http://localhost:5001/mv-pollution-tracking-system/us-central1/exportToBigQueryManual \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"type": "daily", "date": "2024-12-16"}'
```

**Expected Result:**
- ✅ Function executes
- ✅ Row inserted into BigQuery (check BigQuery console)
- ✅ Audit log created for export

**Note**: Requires BigQuery setup and credentials

---

### **4. Data Lake Archive Tests**

#### **Test Data Lake Archive:**
```bash
curl -X POST http://localhost:5001/mv-pollution-tracking-system/us-central1/archiveToDataLakeManual \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"type": "monthly", "date": "2024-12"}'
```

**Expected Result:**
- ✅ Function executes
- ✅ Archive path created (logs show path)
- ✅ Audit log created

**Note**: Requires Azure Storage connection string

---

### **5. Regulatory Reporting Tests**

#### **Test Regulatory Report Generation:**
```bash
curl -X POST http://localhost:5001/mv-pollution-tracking-system/us-central1/generateRegulatoryReportManual \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "agency": "ACHD",
    "startDate": "2024-12-01",
    "endDate": "2024-12-31"
  }'
```

**Expected Result:**
- ✅ Report generated
- ✅ Stored in `regulatoryReports` collection
- ✅ Report contains: summary, facilities, recommendations
- ✅ Audit log created

---

## ✅ **INTEGRATION TESTS**

### **End-to-End Test:**
1. **Submit Symptom Report** → Creates report + audit log
2. **Run Daily Aggregation** → Creates aggregate
3. **Export to BigQuery** → Exports aggregate
4. **Generate Regulatory Report** → Creates report
5. **Archive to Data Lake** → Archives data

**Expected Result:**
- ✅ All steps complete without errors
- ✅ All audit logs created
- ✅ Data flows correctly through pipeline

---

## 🐛 **TROUBLESHOOTING**

### **Common Issues:**

1. **"Aggregate not found"**
   - **Fix**: Run aggregation first before export

2. **"Unauthorized"**
   - **Fix**: Check ADMIN_SECRET in environment variables

3. **"BigQuery not configured"**
   - **Fix**: Set GCP_PROJECT_ID and BigQuery credentials

4. **"Data Lake not configured"**
   - **Fix**: Set AZURE_STORAGE_CONNECTION_STRING

5. **"Audit log not created"**
   - **Fix**: Check Firestore rules allow backend writes

---

## 📋 **TEST RESULTS TEMPLATE**

```
Date: ___________
Tester: ___________

Aggregation Pipeline:
- [ ] Daily aggregation: PASS / FAIL
- [ ] Weekly aggregation: PASS / FAIL
- [ ] Monthly aggregation: PASS / FAIL

Audit Logging:
- [ ] Log creation: PASS / FAIL
- [ ] Log retrieval: PASS / FAIL

BigQuery Export:
- [ ] Export function: PASS / FAIL
- [ ] Data in BigQuery: PASS / FAIL

Data Lake Archive:
- [ ] Archive function: PASS / FAIL

Regulatory Reporting:
- [ ] Report generation: PASS / FAIL
- [ ] Report storage: PASS / FAIL

Integration:
- [ ] End-to-end flow: PASS / FAIL

Issues Found:
1. ___________
2. ___________

Overall Status: ✅ PASS / ❌ FAIL
```

---

**Run all tests before deployment!** ✅

