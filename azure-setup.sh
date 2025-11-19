#!/bin/bash

# Azure Setup Script for Mon Valley Pollution Tracking System
# This script sets up all Azure resources needed for dual deployment
# Run: bash azure-setup.sh

set -e  # Exit on error

echo "🚀 Starting Azure Setup for Mon Valley Pollution Tracking System"
echo "================================================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
RESOURCE_GROUP="mv-pollution-rg"
LOCATION="eastus"
COSMOS_ACCOUNT="mv-pollution-cosmos"
DATABASE_NAME="mv-pollution-tracking"
FUNCTION_APP="mv-pollution-functions"
STORAGE_ACCOUNT="mvpollutionstorage"
KEY_VAULT="mv-pollution-kv"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in
echo -e "${YELLOW}📋 Checking Azure login status...${NC}"
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in. Please log in to Azure...${NC}"
    az login
fi

# Get subscription
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo -e "${GREEN}✅ Using subscription: ${SUBSCRIPTION_ID}${NC}"

# Step 1: Create Resource Group
echo -e "\n${YELLOW}📦 Step 1: Creating Resource Group...${NC}"
if az group show --name $RESOURCE_GROUP &> /dev/null; then
    echo -e "${GREEN}✅ Resource group already exists${NC}"
else
    az group create --name $RESOURCE_GROUP --location $LOCATION
    echo -e "${GREEN}✅ Resource group created${NC}"
fi

# Step 2: Create Storage Account (required for Functions)
echo -e "\n${YELLOW}💾 Step 2: Creating Storage Account...${NC}"
if az storage account show --name $STORAGE_ACCOUNT --resource-group $RESOURCE_GROUP &> /dev/null; then
    echo -e "${GREEN}✅ Storage account already exists${NC}"
else
    az storage account create \
        --name $STORAGE_ACCOUNT \
        --resource-group $RESOURCE_GROUP \
        --location $LOCATION \
        --sku Standard_LRS
    echo -e "${GREEN}✅ Storage account created${NC}"
fi

# Step 3: Create Cosmos DB Account
echo -e "\n${YELLOW}🗄️  Step 3: Creating Cosmos DB Account...${NC}"
if az cosmosdb show --name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP &> /dev/null; then
    echo -e "${GREEN}✅ Cosmos DB account already exists${NC}"
else
    az cosmosdb create \
        --name $COSMOS_ACCOUNT \
        --resource-group $RESOURCE_GROUP \
        --default-consistency-level Session \
        --enable-automatic-failover true \
        --locations regionName=$LOCATION failoverPriority=0
    echo -e "${GREEN}✅ Cosmos DB account created${NC}"
fi

# Step 4: Create Cosmos DB Database
echo -e "\n${YELLOW}📊 Step 4: Creating Cosmos DB Database...${NC}"
if az cosmosdb sql database show \
    --account-name $COSMOS_ACCOUNT \
    --resource-group $RESOURCE_GROUP \
    --db-name $DATABASE_NAME &> /dev/null; then
    echo -e "${GREEN}✅ Database already exists${NC}"
else
    az cosmosdb sql database create \
        --account-name $COSMOS_ACCOUNT \
        --resource-group $RESOURCE_GROUP \
        --name $DATABASE_NAME
    echo -e "${GREEN}✅ Database created${NC}"
fi

# Step 5: Create Cosmos DB Containers (Collections)
echo -e "\n${YELLOW}📁 Step 5: Creating Cosmos DB Containers...${NC}"

# Container: titleVFacilities (Public regulatory data)
if az cosmosdb sql container show \
    --account-name $COSMOS_ACCOUNT \
    --resource-group $RESOURCE_GROUP \
    --database-name $DATABASE_NAME \
    --name titleVFacilities &> /dev/null; then
    echo -e "${GREEN}✅ Container 'titleVFacilities' already exists${NC}"
else
    az cosmosdb sql container create \
        --account-name $COSMOS_ACCOUNT \
        --resource-group $RESOURCE_GROUP \
        --database-name $DATABASE_NAME \
        --name titleVFacilities \
        --partition-key-path "/facilityId" \
        --throughput 400
    echo -e "${GREEN}✅ Container 'titleVFacilities' created${NC}"
fi

# Container: symptomReports (HIPAA-protected health data)
if az cosmosdb sql container show \
    --account-name $COSMOS_ACCOUNT \
    --resource-group $RESOURCE_GROUP \
    --database-name $DATABASE_NAME \
    --name symptomReports &> /dev/null; then
    echo -e "${GREEN}✅ Container 'symptomReports' already exists${NC}"
else
    az cosmosdb sql container create \
        --account-name $COSMOS_ACCOUNT \
        --resource-group $RESOURCE_GROUP \
        --database-name $DATABASE_NAME \
        --name symptomReports \
        --partition-key-path "/userId" \
        --throughput 400
    echo -e "${GREEN}✅ Container 'symptomReports' created (HIPAA-protected)${NC}"
fi

# Container: processedSensorReadings (Public environmental data)
if az cosmosdb sql container show \
    --account-name $COSMOS_ACCOUNT \
    --resource-group $RESOURCE_GROUP \
    --database-name $DATABASE_NAME \
    --name processedSensorReadings &> /dev/null; then
    echo -e "${GREEN}✅ Container 'processedSensorReadings' already exists${NC}"
else
    az cosmosdb sql container create \
        --account-name $COSMOS_ACCOUNT \
        --resource-group $RESOURCE_GROUP \
        --database-name $DATABASE_NAME \
        --name processedSensorReadings \
        --partition-key-path "/sensorId" \
        --throughput 400
    echo -e "${GREEN}✅ Container 'processedSensorReadings' created${NC}"
fi

# Container: auditLogs (HIPAA audit trail)
if az cosmosdb sql container show \
    --account-name $COSMOS_ACCOUNT \
    --resource-group $RESOURCE_GROUP \
    --database-name $DATABASE_NAME \
    --name auditLogs &> /dev/null; then
    echo -e "${GREEN}✅ Container 'auditLogs' already exists${NC}"
else
    az cosmosdb sql container create \
        --account-name $COSMOS_ACCOUNT \
        --resource-group $RESOURCE_GROUP \
        --database-name $DATABASE_NAME \
        --name auditLogs \
        --partition-key-path "/timestamp" \
        --throughput 400
    echo -e "${GREEN}✅ Container 'auditLogs' created (HIPAA audit trail)${NC}"
fi

# Step 6: Get Cosmos DB Connection String
echo -e "\n${YELLOW}🔑 Step 6: Getting Cosmos DB Connection String...${NC}"
COSMOS_CONNECTION_STRING=$(az cosmosdb keys list \
    --name $COSMOS_ACCOUNT \
    --resource-group $RESOURCE_GROUP \
    --type connection-strings \
    --query "connectionStrings[0].connectionString" -o tsv)

echo -e "${GREEN}✅ Connection string retrieved${NC}"
echo -e "${YELLOW}⚠️  Save this connection string securely!${NC}"

# Step 7: Create Azure Functions App
echo -e "\n${YELLOW}⚡ Step 7: Creating Azure Functions App...${NC}"
STORAGE_CONNECTION=$(az storage account show-connection-string \
    --name $STORAGE_ACCOUNT \
    --resource-group $RESOURCE_GROUP \
    --query connectionString -o tsv)

if az functionapp show --name $FUNCTION_APP --resource-group $RESOURCE_GROUP &> /dev/null; then
    echo -e "${GREEN}✅ Function app already exists${NC}"
else
    az functionapp create \
        --name $FUNCTION_APP \
        --resource-group $RESOURCE_GROUP \
        --consumption-plan-location $LOCATION \
        --runtime node \
        --runtime-version 18 \
        --functions-version 4 \
        --storage-account $STORAGE_ACCOUNT \
        --os-type Linux
    echo -e "${GREEN}✅ Function app created${NC}"
fi

# Step 8: Configure Function App Settings
echo -e "\n${YELLOW}⚙️  Step 8: Configuring Function App Settings...${NC}"
az functionapp config appsettings set \
    --name $FUNCTION_APP \
    --resource-group $RESOURCE_GROUP \
    --settings \
        AZURE_COSMOS_CONNECTION_STRING="$COSMOS_CONNECTION_STRING" \
        AZURE_COSMOS_DATABASE_ID="$DATABASE_NAME" \
        EPA_AQS_EMAIL="bjyusuph@gmail.com" \
        EPA_AQS_KEY="indigoosprey88" \
        OPENAQ_API_KEY="5724d18070a5d68251feba85b1d12b58" \
        ADMIN_SECRET="$(openssl rand -hex 32)" \
        PSEUDONYMIZATION_SALT="$(openssl rand -hex 32)" \
        FUNCTIONS_WORKER_RUNTIME="node" \
        WEBSITE_NODE_DEFAULT_VERSION="~18"

echo -e "${GREEN}✅ Function app settings configured${NC}"

# Step 9: Enable Application Insights (for HIPAA audit logging)
echo -e "\n${YELLOW}📊 Step 9: Setting up Application Insights...${NC}"
APP_INSIGHTS_NAME="${FUNCTION_APP}-insights"

if az monitor app-insights component show \
    --app $APP_INSIGHTS_NAME \
    --resource-group $RESOURCE_GROUP &> /dev/null; then
    echo -e "${GREEN}✅ Application Insights already exists${NC}"
else
    az monitor app-insights component create \
        --app $APP_INSIGHTS_NAME \
        --location $LOCATION \
        --resource-group $RESOURCE_GROUP \
        --application-type web
    echo -e "${GREEN}✅ Application Insights created${NC}"
fi

APP_INSIGHTS_KEY=$(az monitor app-insights component show \
    --app $APP_INSIGHTS_NAME \
    --resource-group $RESOURCE_GROUP \
    --query instrumentationKey -o tsv)

APP_INSIGHTS_CONNECTION=$(az monitor app-insights component show \
    --app $APP_INSIGHTS_NAME \
    --resource-group $RESOURCE_GROUP \
    --query connectionString -o tsv)

az functionapp config appsettings set \
    --name $FUNCTION_APP \
    --resource-group $RESOURCE_GROUP \
    --settings \
        APPINSIGHTS_INSTRUMENTATIONKEY="$APP_INSIGHTS_KEY" \
        APPLICATIONINSIGHTS_CONNECTION_STRING="$APP_INSIGHTS_CONNECTION"

echo -e "${GREEN}✅ Application Insights configured (HIPAA audit logging enabled)${NC}"

# Step 10: Summary
echo -e "\n${GREEN}================================================================"
echo "✅ Azure Setup Complete!"
echo "================================================================"
echo ""
echo "📋 Resource Summary:"
echo "  Resource Group:     $RESOURCE_GROUP"
echo "  Location:           $LOCATION"
echo "  Cosmos DB:          $COSMOS_ACCOUNT"
echo "  Database:           $DATABASE_NAME"
echo "  Function App:       $FUNCTION_APP"
echo "  Storage Account:    $STORAGE_ACCOUNT"
echo "  App Insights:       $APP_INSIGHTS_NAME"
echo ""
echo "🔗 Next Steps:"
echo "  1. Save the Cosmos DB connection string securely"
echo "  2. Deploy Azure Functions: cd azure-functions && func azure functionapp publish $FUNCTION_APP"
echo "  3. Update frontend/.env with Azure configuration"
echo "  4. Sign Microsoft BAA for HIPAA compliance"
echo ""
echo "📚 Documentation:"
echo "  - See DUAL_DEPLOYMENT_SETUP.md for detailed instructions"
echo "  - See STRATEGIC_ANALYSIS_AND_AZURE_ALIGNMENT.md for compliance info"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Sign Microsoft BAA for HIPAA compliance!${NC}"
echo -e "${YELLOW}   Visit: https://www.microsoft.com/en-us/TrustCenter/Compliance/HIPAA${NC}"
echo ""

