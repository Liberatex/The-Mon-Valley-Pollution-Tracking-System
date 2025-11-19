# Dual Deployment Setup Guide

## 🎯 **Goal**

Set up both Firebase AND Azure deployments running in parallel, switchable via environment variable.

---

## 📋 **Prerequisites**

### Firebase (Already Set Up ✅)
- Firebase project created
- Firestore database configured
- Cloud Functions deployed
- Frontend using Firebase

### Azure (To Set Up 🆕)
- Azure account (free tier available)
- Azure subscription
- Azure CLI installed

---

## 🔧 **Step 1: Set Up Azure Resources**

### 1.1 Create Azure Cosmos DB

```bash
# Login to Azure
az login

# Create resource group
az group create --name mv-pollution-rg --location eastus

# Create Cosmos DB account
az cosmosdb create \
  --name mv-pollution-cosmos \
  --resource-group mv-pollution-rg \
  --default-consistency-level Session

# Create database
az cosmosdb sql database create \
  --account-name mv-pollution-cosmos \
  --resource-group mv-pollution-rg \
  --name mv-pollution-tracking

# Create containers (collections)
az cosmosdb sql container create \
  --account-name mv-pollution-cosmos \
  --resource-group mv-pollution-rg \
  --database-name mv-pollution-tracking \
  --name titleVFacilities \
  --partition-key-path "/id"

az cosmosdb sql container create \
  --account-name mv-pollution-cosmos \
  --resource-group mv-pollution-rg \
  --database-name mv-pollution-tracking \
  --name symptomReports \
  --partition-key-path "/id"

az cosmosdb sql container create \
  --account-name mv-pollution-cosmos \
  --resource-group mv-pollution-rg \
  --database-name mv-pollution-tracking \
  --name processedSensorReadings \
  --partition-key-path "/id"
```

### 1.2 Get Cosmos DB Connection String

```bash
az cosmosdb keys list \
  --name mv-pollution-cosmos \
  --resource-group mv-pollution-rg \
  --type connection-strings
```

Copy the `PRIMARY CONNECTION STRING`.

### 1.3 Create Azure AD B2C (Optional - for auth)

```bash
# Create B2C tenant (via Azure Portal)
# Go to: https://portal.azure.com
# Create new Azure AD B2C tenant
# Register application
# Get Client ID and Authority URL
```

### 1.4 Create Azure Functions App

```bash
# Create storage account (required for Functions)
az storage account create \
  --name mvpollutionstorage \
  --resource-group mv-pollution-rg \
  --location eastus \
  --sku Standard_LRS

# Create Functions app
az functionapp create \
  --name mv-pollution-functions \
  --resource-group mv-pollution-rg \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --storage-account mvpollutionstorage
```

---

## 📦 **Step 2: Install Dependencies**

### 2.1 Frontend Azure Dependencies

```bash
cd frontend
npm install @azure/cosmos @azure/msal-browser
```

### 2.2 Azure Functions Dependencies

```bash
cd azure-functions
npm install
```

---

## 🔐 **Step 3: Environment Variables**

### 3.1 Frontend `.env` (Add Azure Config)

```env
# Existing Firebase config (KEEP)
REACT_APP_FIREBASE_API_KEY=your_firebase_key
REACT_APP_FIREBASE_AUTH_DOMAIN=...
REACT_APP_FIREBASE_PROJECT_ID=...

# NEW: Provider Selection
REACT_APP_PROVIDER=firebase  # or "azure"

# NEW: Azure Configuration (only needed if REACT_APP_PROVIDER=azure)
REACT_APP_AZURE_COSMOS_CONNECTION_STRING=AccountEndpoint=https://...
REACT_APP_AZURE_COSMOS_DATABASE_ID=mv-pollution-tracking
REACT_APP_AZURE_CLIENT_ID=your-azure-b2c-client-id
REACT_APP_AZURE_AUTHORITY=https://your-tenant.b2clogin.com/...
REACT_APP_AZURE_REDIRECT_URI=http://localhost:3000
REACT_APP_AZURE_FUNCTIONS_URL=https://mv-pollution-functions.azurewebsites.net/api
```

### 3.2 Azure Functions `.env`

```env
# Cosmos DB
AZURE_COSMOS_CONNECTION_STRING=AccountEndpoint=https://...
AZURE_COSMOS_DATABASE_ID=mv-pollution-tracking

# External APIs (same as Firebase)
EPA_AQS_EMAIL=bjyusuph@gmail.com
EPA_AQS_KEY=indigoosprey88
OPENAQ_API_KEY=5724d18070a5d68251feba85b1d12b58
ADMIN_SECRET=test-admin-secret
```

### 3.3 Set Azure Functions Environment Variables

```bash
az functionapp config appsettings set \
  --name mv-pollution-functions \
  --resource-group mv-pollution-rg \
  --settings \
    AZURE_COSMOS_CONNECTION_STRING="your-connection-string" \
    AZURE_COSMOS_DATABASE_ID="mv-pollution-tracking" \
    EPA_AQS_EMAIL="bjyusuph@gmail.com" \
    EPA_AQS_KEY="indigoosprey88"
```

---

## 🚀 **Step 4: Deploy Azure Functions**

```bash
cd azure-functions
npm run build
func azure functionapp publish mv-pollution-functions
```

---

## 🔄 **Step 5: Update Frontend to Use Abstraction**

### Option A: Gradual Migration (Recommended)

Keep existing Firebase imports, add abstraction for new code:

```typescript
// Old components still work:
import { db } from '../firebase';  // ✅ Still works

// New components use abstraction:
import { db } from '../providers';  // 🆕 Works with both
```

### Option B: Full Migration

Update all imports to use abstraction:

```typescript
// Before:
import { db, auth } from '../firebase';

// After:
import { db, auth } from '../providers';
```

**Files to update:**
- `frontend/src/components/Dashboard.tsx`
- `frontend/src/components/SymptomReportForm.tsx`
- `frontend/src/components/EvidenceReport.tsx`
- `frontend/src/components/AdminDashboard.tsx`
- `frontend/src/services/feedbackService.ts`

---

## 🔄 **Step 6: Data Sync (Optional)**

To keep both databases in sync, create a sync function:

```typescript
// functions/src/syncToAzure.ts (Firebase Function)
// Runs periodically to sync Firestore → Cosmos DB

export const syncToAzure = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    // Read from Firestore
    // Write to Cosmos DB
  });
```

Or create Azure Function to sync Cosmos DB → Firestore.

---

## 🧪 **Step 7: Testing**

### Test Firebase (Default)

```bash
# frontend/.env
REACT_APP_PROVIDER=firebase

cd frontend
npm start
# Visit http://localhost:3000
# Should work exactly as before
```

### Test Azure

```bash
# frontend/.env
REACT_APP_PROVIDER=azure

cd frontend
npm start
# Visit http://localhost:3000
# Should work with Azure backend
```

---

## 📊 **Step 8: Verify Both Work**

### Firebase Endpoints
- Functions: `https://us-central1-...cloudfunctions.net/...`
- Firestore: Direct connection
- Auth: Firebase Auth

### Azure Endpoints
- Functions: `https://mv-pollution-functions.azurewebsites.net/api/...`
- Cosmos DB: Direct connection
- Auth: Azure AD B2C

---

## 🎯 **Switching Providers**

### Method 1: Environment Variable (Build Time)

```bash
# Use Firebase
REACT_APP_PROVIDER=firebase npm run build

# Use Azure
REACT_APP_PROVIDER=azure npm run build
```

### Method 2: Runtime Switch (Advanced)

Add UI toggle to switch providers at runtime (requires state management).

---

## ✅ **Verification Checklist**

- [ ] Azure Cosmos DB created and accessible
- [ ] Azure Functions deployed and responding
- [ ] Frontend abstraction layer working
- [ ] Can switch between Firebase and Azure
- [ ] Both databases have same data structure
- [ ] Both function endpoints return same format
- [ ] Authentication works with both providers

---

## 🆘 **Troubleshooting**

### Issue: Azure Functions not responding
- Check function app is running: `az functionapp list`
- Check logs: `az functionapp log tail --name mv-pollution-functions`

### Issue: Cosmos DB connection fails
- Verify connection string is correct
- Check firewall rules allow your IP
- Verify database and containers exist

### Issue: Frontend can't switch providers
- Verify `REACT_APP_PROVIDER` is set correctly
- Clear browser cache
- Restart dev server

---

## 📈 **Next Steps**

1. **Deploy both to production**
2. **Set up data sync** (if needed)
3. **Monitor both systems**
4. **Gradually migrate users** (if desired)
5. **Keep both running** for redundancy

---

## 💰 **Cost Comparison**

### Firebase (Current)
- Firestore: ~$0-25/month
- Functions: ~$0-10/month
- Hosting: Free
- **Total: ~$0-35/month**

### Azure (Parallel)
- Cosmos DB: ~$25-50/month
- Functions: ~$0-20/month
- Static Web Apps: Free
- **Total: ~$25-70/month**

**Running both: ~$25-105/month** (redundancy cost)

---

## 🎉 **Success!**

You now have:
- ✅ Firebase deployment (unchanged)
- ✅ Azure deployment (parallel)
- ✅ Ability to switch between them
- ✅ Both systems running simultaneously
- ✅ Zero downtime migration path

