# Azure Setup Checklist ✅

## 📋 **Prerequisites Installation**

- [ ] **Install Azure CLI**
  ```bash
  bash install-azure-prerequisites.sh
  # Or manually: brew install azure-cli
  ```

- [ ] **Install Azure Functions Core Tools**
  ```bash
  # Already in install script, or manually:
  brew tap azure/functions
  brew install azure-functions-core-tools@4
  ```

- [ ] **Verify Installation**
  ```bash
  az --version
  func --version
  ```

- [ ] **Azure Account**
  - [ ] Have Azure account (create at https://azure.microsoft.com/free/)
  - [ ] Have active subscription

---

## 🚀 **Step 1: Run Azure Setup Script**

- [ ] **Login to Azure**
  ```bash
  az login
  ```

- [ ] **Verify Subscription**
  ```bash
  az account list --output table
  az account set --subscription "Your-Subscription-Name"  # If multiple
  ```

- [ ] **Run Setup Script**
  ```bash
  bash azure-setup.sh
  ```

- [ ] **Save Connection String**
  - [ ] Copy Cosmos DB connection string from output
  - [ ] Store securely (will need for frontend .env)

**Expected Output:**
```
✅ Resource group created
✅ Cosmos DB account created
✅ Database created
✅ Containers created (4 containers)
✅ Storage account created
✅ Function App created
✅ Application Insights configured
```

**Time:** 5-10 minutes  
**Cost:** ~$25-50/month

---

## 📦 **Step 2: Deploy Azure Functions**

- [ ] **Install Dependencies**
  ```bash
  cd azure-functions
  npm install
  ```

- [ ] **Build TypeScript**
  ```bash
  npm run build
  ```

- [ ] **Deploy Functions**
  ```bash
  func azure functionapp publish mv-pollution-functions
  ```

- [ ] **Verify Deployment**
  ```bash
  # Test health check
  curl https://mv-pollution-functions.azurewebsites.net/api/healthCheck
  
  # Test Title V facilities
  curl https://mv-pollution-functions.azurewebsites.net/api/getTitleVFacilities
  ```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "azure-functions",
  "services": {
    "cosmos_db": "operational",
    "functions": "operational"
  }
}
```

**Time:** 2-5 minutes

---

## 🔐 **Step 3: Sign Microsoft BAA (HIPAA)**

- [ ] **Access Azure Portal**
  - Go to: https://portal.azure.com
  - Navigate: **Subscriptions** → Your Subscription → **Compliance**

- [ ] **Sign BAA**
  - [ ] Click: **HIPAA Business Associate Agreement**
  - [ ] Review terms
  - [ ] Accept agreement
  - [ ] Download confirmation

**Alternative Methods:**
- [ ] Microsoft Trust Center: https://www.microsoft.com/en-us/TrustCenter/Compliance/HIPAA
- [ ] Contact: azurecompliance@microsoft.com

**Time:** 5 minutes (processing: 1-3 business days)

---

## 🧪 **Step 4: Test Azure Provider**

### **4.1 Frontend Setup**

- [ ] **Install Azure Dependencies**
  ```bash
  cd frontend
  npm install @azure/cosmos @azure/msal-browser
  ```

- [ ] **Update .env File**
  ```env
  # Provider Selection
  REACT_APP_PROVIDER=azure
  
  # Azure Configuration
  REACT_APP_AZURE_COSMOS_CONNECTION_STRING=AccountEndpoint=https://...
  REACT_APP_AZURE_COSMOS_DATABASE_ID=mv-pollution-tracking
  REACT_APP_AZURE_FUNCTIONS_URL=https://mv-pollution-functions.azurewebsites.net/api
  ```

- [ ] **Update Components** (Optional - for full abstraction)
  - [ ] Update `Dashboard.tsx` to use `import { db } from '../providers'`
  - [ ] Update `SymptomReportForm.tsx`
  - [ ] Update `EvidenceReport.tsx`
  - [ ] Update `AdminDashboard.tsx`

### **4.2 Test Features**

- [ ] **Start Frontend**
  ```bash
  cd frontend
  npm start
  ```

- [ ] **Test Dashboard**
  - [ ] Visit: http://localhost:3000
  - [ ] Check console: "✅ Azure providers initialized"
  - [ ] Verify air quality data loads

- [ ] **Test Sensor Map**
  - [ ] Navigate to Sensor Map
  - [ ] Verify Title V facilities load from Cosmos DB
  - [ ] Check network tab: requests to Azure Functions

- [ ] **Test Symptom Reporting**
  - [ ] Submit test report
  - [ ] Verify goes to Azure Functions
  - [ ] Check Cosmos DB: `symptomReports` container has data

- [ ] **Test Audit Logging**
  - [ ] Check browser console for "AUDIT_LOG" entries
  - [ ] Verify HIPAA compliance logging

---

## ✅ **Final Verification**

### **Azure Resources**
- [ ] Resource group exists: `mv-pollution-rg`
- [ ] Cosmos DB exists: `mv-pollution-cosmos`
- [ ] Database exists: `mv-pollution-tracking`
- [ ] Containers exist: `titleVFacilities`, `symptomReports`, `processedSensorReadings`, `auditLogs`
- [ ] Function App exists: `mv-pollution-functions`
- [ ] Application Insights configured

### **Functions Working**
- [ ] `healthCheck` endpoint responds
- [ ] `getTitleVFacilities` returns data
- [ ] `submitSymptomReport` accepts submissions
- [ ] `getACHDAirQuality` returns data

### **Frontend Integration**
- [ ] Provider abstraction working
- [ ] Can switch between Firebase and Azure
- [ ] All features work with Azure
- [ ] No console errors

### **HIPAA Compliance**
- [ ] Microsoft BAA signed
- [ ] Audit logging enabled
- [ ] Encryption at rest (Cosmos DB default)
- [ ] Pseudonymization working

---

## 🎯 **Next Steps**

- [ ] **Seed Title V Facilities** (when seed function implemented)
- [ ] **Set Up Power BI** (optional - for analytics)
- [ ] **Configure Long-term Storage** (optional - for 7-10 year retention)
- [ ] **Monitor Costs** in Azure Portal
- [ ] **Set Up Alerts** in Application Insights

---

## 🆘 **Troubleshooting**

See `AZURE_SETUP_GUIDE.md` for detailed troubleshooting.

---

**Status**: Ready to begin! Start with prerequisites installation. 🚀

