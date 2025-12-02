#!/bin/bash

# API Keys Verification Script
# This script checks if all required API keys are configured

echo "🔍 Verifying API Keys Configuration..."
echo ""

ERRORS=0
WARNINGS=0

# Check frontend/.env
echo "📁 Frontend Configuration (frontend/.env):"
if [ -f "frontend/.env" ]; then
    echo "  ✅ File exists"
    
    # Check Mapbox token
    MAPBOX=$(grep "^VITE_MAPBOX_ACCESS_TOKEN=" frontend/.env | cut -d'=' -f2 | tr -d ' ')
    if [ -n "$MAPBOX" ] && [ "$MAPBOX" != "" ]; then
        if [[ "$MAPBOX" == pk.* ]]; then
            echo "  ✅ Mapbox token: Configured (starts with pk.)"
        else
            echo "  ⚠️  Mapbox token: Present but format may be incorrect (should start with pk.)"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo "  ❌ Mapbox token: MISSING"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check OpenWeatherMap key
    OWM_FRONTEND=$(grep "^VITE_OPENWEATHER_API_KEY=" frontend/.env | cut -d'=' -f2 | tr -d ' ')
    if [ -n "$OWM_FRONTEND" ] && [ "$OWM_FRONTEND" != "" ] && [ ${#OWM_FRONTEND} -gt 10 ]; then
        echo "  ✅ OpenWeatherMap key: Configured"
    else
        echo "  ❌ OpenWeatherMap key: MISSING or too short"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "  ❌ File does not exist"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "📁 Backend Configuration (functions/.env):"
if [ -f "functions/.env" ]; then
    echo "  ✅ File exists"
    
    # Check OpenWeatherMap key
    OWM_BACKEND=$(grep "^OPENWEATHER_API_KEY=" functions/.env | cut -d'=' -f2 | tr -d ' ')
    if [ -n "$OWM_BACKEND" ] && [ "$OWM_BACKEND" != "" ] && [ ${#OWM_BACKEND} -gt 10 ]; then
        echo "  ✅ OpenWeatherMap key: Configured"
    else
        echo "  ❌ OpenWeatherMap key: MISSING or too short"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check PurpleAir key
    PA=$(grep "^PURPLEAIR_API_KEY=" functions/.env | cut -d'=' -f2 | tr -d ' ')
    if [ -n "$PA" ] && [ "$PA" != "" ]; then
        echo "  ✅ PurpleAir key: Configured"
    else
        echo "  ⚠️  PurpleAir key: Missing (may already be configured elsewhere)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "  ❌ File does not exist"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary:"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "  ✅ All required API keys are configured!"
    echo "  🚀 You're ready to go!"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "  ✅ All required API keys are configured"
    echo "  ⚠️  $WARNINGS warning(s) - check above"
    exit 0
else
    echo "  ❌ $ERRORS error(s) found"
    echo "  ⚠️  $WARNINGS warning(s)"
    echo ""
    echo "  Please check the errors above and add missing keys to .env files"
    exit 1
fi

