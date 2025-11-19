# Azure Setup Guide - Step by Step

## 🎯 **Goal**

Set up Azure deployment for Mon Valley Pollution Tracking System with HIPAA compliance.

---

## 📋 **Prerequisites Check**

### **1. Azure CLI**
```bash
# Check if installed
az --version

# If not installed, install it:
# macOS:
brew install azure-cli

# Or download from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
```

### **2. Azure Functions Core Tools**
```bash
# Check if installed
func --version

# If not installed, install it:
# macOS:
brew tap azure/functions
brew install azure-functions-core-tools@4

# Or use npm:
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

### **3. Azure Account**
- Azure account with active subscription
- Free tier available: https://azure.microsoft.com/free/

---

## 🚀 **Step 1: Run Azure Setup Script**

### **1.1 Login to Azure**
```bash
az login
```
This will open a browser for authentication.

### **1.2 Verify Subscription**
```bash
# List subscriptions
az account list --output table

# Set active subscription (if you have multiple)
az account set --subscription "Your-Subscription-Name"
```

### **1.3 Run Setup Script**
```bash
# Make sure you're in project root
cd /Users/liberatex/pullution_tracker/The-Mon-Valley-Pollution-Tracking-System

# Run the setup script
bash azure-setup.sh
```

**What the script does:**
- Creates resource group: `mv-pollution-rg`
- Creates Cosmos DB account: `mv-pollution-cosmos`
- Creates database: `mv-pollution-tracking`
- Creates containers: `titleVFacilities`, `symptomReports`, `processedSensorReadings`, `auditLogs`
- Creates storage account: `mvpollutionstorage`
- Creates Function App: `mv-pollution-functions`
- Sets up Application Insights: `mv-pollution-functions-insights`
- Configures all environment variables

**Expected time:** 5-10 minutes

**Cost:** ~$25-50/month (free tier covers some resources)

### **1.4 Save Connection String**
The script will output the Cosmos DB connection string. **SAVE THIS SECURELY!**

```bash
# You can also retrieve it later:
az cosmosdb keys list \
  --name mv-pollution-cosmos \
  --resource-group mv-pollution-rg \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" -o tsv
```

---

## 📦 **Step 2: Deploy Azure Functions**

### **2.1 Install Dependencies**
```bash
cd azure-functions
npm install
```

### **2.2 Build TypeScript**
```bash
npm run build
```

### **2.3 Deploy Functions**
```bash
# Login to Azure (if not already)
az login

# Deploy functions
func azure functionapp publish mv-pollution-functions
```

**Expected time:** 2-5 minutes

**What gets deployed:**
- `healthCheck` - Health monitoring
- `getTitleVFacilities` - Title V facilities endpoint
- `submitSymptomReport` - Secure symptom submission
- `getACHDAirQuality` - ACHD air quality data

### **2.4 Verify Deployment**
```bash
# Test health check
curl https://mv-pollution-functions.azurewebsites.net/api/healthCheck

# Test Title V facilities
curl https://mv-pollution-functions.azurewebsites.net/api/getTitleVFacilities
```

**Expected response:**
```json
{
  "status": "healthy",
  "service": "azure-functions",
  "timestamp": "2025-01-XX...",
  "services": {
    "cosmos_db": "operational",
    "functions": "operational"
  }
}
```

---

## 🔐 **Step 3: Sign Microsoft BAA (HIPAA Compliance)**

### **3.1 What is BAA?**
Business Associate Agreement (BAA) is required for HIPAA compliance when handling health data in the cloud.

### **3.2 How to Sign**

**Option A: Azure Portal** (Recommended)
1. Go to: https://portal.azure.com
2. Navigate to: **Subscriptions** → Your Subscription → **Compliance**
3. Click: **HIPAA Business Associate Agreement**
4. Review and accept the terms
5. Download confirmation

**Option B: Microsoft Trust Center**
1. Go to: https://www.microsoft.com/en-us/TrustCenter/Compliance/HIPAA
2. Click: **Request BAA**
3. Fill out the form
4. Microsoft will send you the agreement

**Option C: Contact Microsoft Support**
- Call: 1-800-865-9408
- Email: azurecompliance@microsoft.com
- Request: "HIPAA Business Associate Agreement"

### **3.3 Verify BAA Status**
```bash
# Check compliance status
az account show --query "compliance" -o table
```

### **3.4 Important Notes**
- ⚠️ **BAA is required** for production use with health data
- ⚠️ **Processing time:** 1-3 business days
- ⚠️ **Free tier:** BAA available for all Azure subscriptions
- ✅ **No cost** for BAA itself

---

## 🧪 **Step 4: Test Azure Provider**

### **4.1 Update Frontend Environment**

Edit `frontend/.env`:

```env
# Provider Selection
REACT_APP_PROVIDER=azure  # Switch from "firebase" to "azure"

# Azure Configuration
REACT_APP_AZURE_COSMOS_CONNECTION_STRING=AccountEndpoint=https://mv-pollution-cosmos.documents.azure.com:443/;AccountKey=YOUR_KEY;Database=mv-pollution-tracking
REACT_APP_AZURE_COSMOS_DATABASE_ID=mv-pollution-tracking
REACT_APP_AZURE_FUNCTIONS_URL=https://mv-pollution-functions.azurewebsites.net/api

# Keep Firebase config (for fallback)
REACT_APP_FIREBASE_API_KEY=your_firebase_key
REACT_APP_FIREBASE_AUTH_DOMAIN=...
```

### **4.2 Install Frontend Dependencies**
```bash
cd frontend
npm install @azure/cosmos @azure/msal-browser
```

### **4.3 Update Components to Use Abstraction**

**Before (Firebase direct):**
```typescript
import { db } from '../firebase';
```

**After (Provider abstraction):**
```typescript
import { db } from '../providers';
```

**Files to update:**
- `frontend/src/components/Dashboard.tsx`
- `frontend/src/components/SymptomReportForm.tsx`
- `frontend/src/components/EvidenceReport.tsx`
- `frontend/src/components/AdminDashboard.tsx`

### **4.4 Start Frontend**
```bash
cd frontend
npm start
```

### **4.5 Test Features**

1. **Dashboard**
   - Visit: http://localhost:3000
   - Should load air quality data from Azure Functions
   - Check browser console for provider: "✅ Azure providers initialized"

2. **Title V Facilities**
   - Go to Sensor Map
   - Should show facilities from Cosmos DB
   - Check network tab: requests to Azure Functions

3. **Symptom Reporting**
   - Submit a test report
   - Should go to Azure Functions
   - Check Cosmos DB: `symptomReports` container

4. **Health Check**
   - Check browser console for audit logs
   - Should see: "AUDIT_LOG" entries (HIPAA compliance)

---

## ✅ **Verification Checklist**

### **Azure Resources**
- [ ] Resource group created
- [ ] Cosmos DB account created
- [ ] Database created
- [ ] Containers created (4 containers)
- [ ] Storage account created
- [ ] Function App created
- [ ] Application Insights configured

### **Functions Deployed**
- [ ] Functions deployed successfully
- [ ] Health check endpoint working
- [ ] Title V facilities endpoint working
- [ ] Symptom report endpoint working
- [ ] ACHD air quality endpoint working

### **HIPAA Compliance**
- [ ] Microsoft BAA signed
- [ ] Audit logging enabled
- [ ] Encryption at rest (Cosmos DB default)
- [ ] Pseudonymization working
- [ ] Access controls configured

### **Frontend Integration**
- [ ] Provider abstraction installed
- [ ] Components updated to use abstraction
- [ ] Azure provider working
- [ ] Can switch between Firebase and Azure
- [ ] All features working with Azure

---

## 🆘 **Troubleshooting**

### **Issue: Azure CLI not found**
```bash
# Install Azure CLI
brew install azure-cli
# Or: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
```

### **Issue: Functions Core Tools not found**
```bash
# Install Functions Core Tools
brew tap azure/functions
brew install azure-functions-core-tools@4
```

### **Issue: Deployment fails**
```bash
# Check Function App exists
az functionapp show --name mv-pollution-functions --resource-group mv-pollution-rg

# Check logs
az functionapp log tail --name mv-pollution-functions --resource-group mv-pollution-rg
```

### **Issue: Cosmos DB connection fails**
```bash
# Verify connection string
az cosmosdb keys list \
  --name mv-pollution-cosmos \
  --resource-group mv-pollution-rg \
  --type connection-strings

# Check firewall rules
az cosmosdb update \
  --name mv-pollution-cosmos \
  --resource-group mv-pollution-rg \
  --ip-range-filter "0.0.0.0/0"  # Allow all (for testing)
```

### **Issue: Frontend can't connect**
- Check `REACT_APP_PROVIDER=azure` in `.env`
- Check connection string is correct
- Check Functions URL is correct
- Check browser console for errors

---

## 📊 **Cost Estimation**

### **Monthly Costs (Approximate)**
- Cosmos DB: $25-50/month (400 RU/s per container)
- Functions: $0-20/month (consumption plan)
- Storage: $0-5/month (minimal usage)
- Application Insights: $0-10/month (free tier: 5GB)
- **Total: ~$25-85/month**

### **Free Tier Available**
- Azure Functions: 1M free requests/month
- Application Insights: 5GB free data/month
- Cosmos DB: No free tier (but low cost)

---

## 🎯 **Next Steps After Setup**

1. **Seed Title V Facilities**
   ```bash
   # Call seed function (when implemented)
   curl -X POST https://mv-pollution-functions.azurewebsites.net/api/seedTitleVFacilities \
     -H "Authorization: Bearer YOUR_ADMIN_SECRET"
   ```

2. **Set Up Power BI** (Optional)
   - Connect Power BI to Cosmos DB
   - Create dashboards for analytics
   - Generate evidence reports

3. **Configure Long-term Storage** (Optional)
   - Set up Azure Blob Storage for archival
   - Configure data lifecycle policies
   - Archive old data (7-10 year retention)

4. **Monitor & Optimize**
   - Set up alerts in Application Insights
   - Monitor costs in Azure Portal
   - Optimize Cosmos DB throughput

---

## 📚 **Resources**

- **Azure Documentation**: https://docs.microsoft.com/azure
- **HIPAA Compliance**: https://www.microsoft.com/en-us/TrustCenter/Compliance/HIPAA
- **Cosmos DB Docs**: https://docs.microsoft.com/azure/cosmos-db
- **Functions Docs**: https://docs.microsoft.com/azure/azure-functions

---

**Status**: Ready to begin setup! 🚀

