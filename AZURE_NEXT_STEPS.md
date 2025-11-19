# Azure Setup - Next Steps ✅

## ✅ **Completed**

1. ✅ **Prerequisites Installed**
   - Azure CLI: `az --version` ✅
   - Azure Functions Core Tools: `func --version` ✅

## 🚀 **Next Steps (In Order)**

### **Step 1: Login to Azure** 🔐

```bash
az login
```

This will:
- Open your browser
- Ask you to sign in to Azure
- Authenticate your CLI session

**After login, verify:**
```bash
az account show
```

---

### **Step 2: Run Azure Setup Script** 📦

```bash
bash azure-setup.sh
```

**What it does:**
- Creates resource group: `mv-pollution-rg`
- Creates Cosmos DB account + database + 4 containers
- Creates storage account
- Creates Function App
- Sets up Application Insights
- Configures all environment variables

**Time:** 5-10 minutes  
**Cost:** ~$25-50/month

**Important:** Save the Cosmos DB connection string from the output!

---

### **Step 3: Deploy Azure Functions** ⚡

```bash
cd azure-functions
npm install
npm run build
func azure functionapp publish mv-pollution-functions
```

**Time:** 2-5 minutes

**Verify deployment:**
```bash
curl https://mv-pollution-functions.azurewebsites.net/api/healthCheck
```

---

### **Step 4: Sign Microsoft BAA** 🔒

1. Go to: https://portal.azure.com
2. Navigate: **Subscriptions** → Your Subscription → **Compliance**
3. Click: **HIPAA Business Associate Agreement**
4. Accept terms

**Time:** 5 minutes (processing: 1-3 business days)

---

### **Step 5: Test Azure Provider** 🧪

```bash
# Install frontend dependencies
cd frontend
npm install @azure/cosmos @azure/msal-browser

# Update .env (add Azure config)
# Set REACT_APP_PROVIDER=azure

# Start frontend
npm start
```

---

## 📋 **Quick Reference**

### **Check Prerequisites**
```bash
az --version
func --version
```

### **Login to Azure**
```bash
az login
az account show
```

### **Run Setup**
```bash
bash azure-setup.sh
```

### **Deploy Functions**
```bash
cd azure-functions
npm install && npm run build
func azure functionapp publish mv-pollution-functions
```

### **Test Functions**
```bash
curl https://mv-pollution-functions.azurewebsites.net/api/healthCheck
```

---

## 📚 **Documentation**

- **Detailed Guide**: `AZURE_SETUP_GUIDE.md`
- **Checklist**: `AZURE_SETUP_CHECKLIST.md`
- **Quick Start**: `QUICK_START_AZURE.md`

---

## 🆘 **Need Help?**

See troubleshooting section in `AZURE_SETUP_GUIDE.md`

---

**Ready to proceed!** Start with `az login` 🚀

