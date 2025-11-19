# Quick Start: Azure Setup

## ⚡ **Fast Track Setup**

Follow these steps in order to set up Azure deployment.

---

## 📋 **Step 0: Install Prerequisites**

### **Install Azure CLI**
```bash
# macOS (using Homebrew)
brew install azure-cli

# Or download installer
# https://docs.microsoft.com/en-us/cli/azure/install-azure-cli-macos
```

### **Install Azure Functions Core Tools**
```bash
# macOS (using Homebrew)
brew tap azure/functions
brew install azure-functions-core-tools@4

# Or using npm
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

### **Verify Installation**
```bash
az --version
func --version
```

---

## 🚀 **Step 1: Run Azure Setup**

### **1.1 Login to Azure**
```bash
az login
```
Opens browser for authentication.

### **1.2 Run Setup Script**
```bash
bash azure-setup.sh
```

**This creates:**
- Resource group
- Cosmos DB (database + 4 containers)
- Storage account
- Function App
- Application Insights

**Time:** 5-10 minutes  
**Cost:** ~$25-50/month

---

## 📦 **Step 2: Deploy Functions**

```bash
cd azure-functions
npm install
npm run build
func azure functionapp publish mv-pollution-functions
```

**Time:** 2-5 minutes

---

## 🔐 **Step 3: Sign Microsoft BAA**

1. Go to: https://portal.azure.com
2. Navigate: **Subscriptions** → Your Subscription → **Compliance**
3. Click: **HIPAA Business Associate Agreement**
4. Accept terms

**Time:** 5 minutes (processing: 1-3 business days)

---

## 🧪 **Step 4: Test Azure**

### **4.1 Update Frontend**
```bash
cd frontend
npm install @azure/cosmos @azure/msal-browser
```

### **4.2 Update .env**
```env
REACT_APP_PROVIDER=azure
REACT_APP_AZURE_COSMOS_CONNECTION_STRING=AccountEndpoint=...
REACT_APP_AZURE_COSMOS_DATABASE_ID=mv-pollution-tracking
REACT_APP_AZURE_FUNCTIONS_URL=https://mv-pollution-functions.azurewebsites.net/api
```

### **4.3 Test**
```bash
npm start
# Visit http://localhost:3000
# Check console: "✅ Azure providers initialized"
```

---

## ✅ **Done!**

See `AZURE_SETUP_GUIDE.md` for detailed instructions.

