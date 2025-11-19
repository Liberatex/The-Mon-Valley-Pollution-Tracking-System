#!/bin/bash

# Install Azure Prerequisites
# Run: bash install-azure-prerequisites.sh

set -e

echo "🔧 Installing Azure Prerequisites"
echo "===================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check for Homebrew (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! command -v brew &> /dev/null; then
        echo -e "${RED}❌ Homebrew not found. Installing Homebrew...${NC}"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    echo -e "${YELLOW}📦 Installing Azure CLI...${NC}"
    if command -v az &> /dev/null; then
        echo -e "${GREEN}✅ Azure CLI already installed${NC}"
        az --version
    else
        brew install azure-cli
        echo -e "${GREEN}✅ Azure CLI installed${NC}"
    fi
    
    echo -e "${YELLOW}📦 Installing Azure Functions Core Tools...${NC}"
    if command -v func &> /dev/null; then
        echo -e "${GREEN}✅ Azure Functions Core Tools already installed${NC}"
        func --version
    else
        brew tap azure/functions
        brew install azure-functions-core-tools@4
        echo -e "${GREEN}✅ Azure Functions Core Tools installed${NC}"
    fi
    
    echo -e "\n${GREEN}✅ All prerequisites installed!${NC}"
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Run: az login"
    echo "  2. Run: bash azure-setup.sh"
    
else
    echo -e "${RED}❌ This script is for macOS.${NC}"
    echo "For other platforms, see:"
    echo "  Azure CLI: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    echo "  Functions Tools: https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local"
fi

