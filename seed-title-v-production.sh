#!/bin/bash
# Script to seed Title V facilities in production Firestore

set -e

echo "🌱 Seeding Title V Facilities in Production..."

# Check if ADMIN_SECRET is set
if [ -z "$ADMIN_SECRET" ]; then
  echo "⚠️  ADMIN_SECRET environment variable is not set."
  echo ""
  echo "To set it up:"
  echo "1. Go to Firebase Console -> Functions -> Configuration"
  echo "2. Add environment variable: ADMIN_SECRET"
  echo "3. Set a secure random value"
  echo ""
  echo "Then run:"
  echo "  export ADMIN_SECRET='your-secret-here'"
  echo "  ./seed-title-v-production.sh"
  echo ""
  exit 1
fi

ENDPOINT="https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/seedTitleVFacilities"

echo "📡 Calling seed endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "✅ Success! Title V facilities seeded."
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo "❌ Error seeding facilities (HTTP $HTTP_CODE)"
  echo "$BODY"
  exit 1
fi

echo ""
echo "🔍 Verifying facilities were seeded..."
VERIFY_RESPONSE=$(curl -s "https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/getTitleVFacilities")
FACILITY_COUNT=$(echo "$VERIFY_RESPONSE" | jq '.facilities | length' 2>/dev/null || echo "0")

if [ "$FACILITY_COUNT" -gt 0 ]; then
  echo "✅ Verified: $FACILITY_COUNT facilities found in production"
  echo "🎉 Title V facilities are now available on the Sensor Map!"
else
  echo "⚠️  Warning: Could not verify facilities. Please check manually."
fi

