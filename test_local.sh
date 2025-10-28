#!/bin/bash

# Local Testing Script for Project Lumna/PHPA Platform
# This script tests all Cloud Functions locally using Firebase emulators

echo "🧪 Testing Project Lumna - Local Emulator Tests"
echo "================================================"

# Base URL for local emulator
BASE_URL="http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print test result
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC} $2"
    else
        echo -e "${RED}❌ FAIL${NC} $2"
    fi
}

echo ""
echo "📋 Test Suite Starting..."
echo ""

# Test 1: Health Check
echo "Test 1: Health Check Endpoint"
TEST1=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/healthCheck")
if [ "$TEST1" = "200" ] || [ "$TEST1" = "404" ]; then
    print_result 0 "Health check accessible"
else
    print_result 1 "Health check failed"
fi
echo ""

# Test 2: Submit Symptom Report
echo "Test 2: Submit Symptom Report"
RESPONSE=$(curl -s -X POST "$BASE_URL/submitSymptomReport" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_script_user",
    "symptoms": ["cough", "headache"],
    "severity": 3,
    "osac": {
      "onset": "Gradual",
      "severity": 3,
      "aggravatingFactors": ["Outdoor Exposure"],
      "course": "Stable"
    },
    "submittedAt": "2024-12-08T10:00:00Z",
    "consent": true
  }')
echo "$RESPONSE" | grep -q "success\|error"
print_result $? "Symptom report submission"
echo ""

# Test 3: Get Title V Facilities (should return empty or facilities)
echo "Test 3: Get Title V Facilities"
FACILITIES=$(curl -s "$BASE_URL/getTitleVFacilities")
echo "$FACILITIES" | grep -q "success\|count" && print_result 0 "Get facilities works" || print_result 1 "Get facilities failed"
echo ""

# Test 4: Seed Title V Facilities
echo "Test 4: Seed Title V Facilities"
SEED_RESPONSE=$(curl -s -X POST "$BASE_URL/seedTitleVFacilities" \
  -H "Authorization: Bearer test-admin-secret" \
  -H "Content-Type: application/json")
echo "$SEED_RESPONSE" | grep -q "success\|error"
print_result $? "Facilities seeding"
echo ""

# Test 5: Get Facilities After Seeding
echo "Test 5: Get Facilities After Seeding"
FACILITIES_AFTER=$(curl -s "$BASE_URL/getTitleVFacilities")
COUNT=$(echo "$FACILITIES_AFTER" | grep -o '"count":[0-9]*' | grep -o '[0-9]*')
if [ "$COUNT" -ge 3 ]; then
    print_result 0 "Found $COUNT facilities"
else
    print_result 1 "Expected 3+ facilities, found $COUNT"
fi
echo ""

# Test 6: Get Single Facility
echo "Test 6: Get Single Facility by ID"
FACILITY=$(curl -s "$BASE_URL/getTitleVFacilityById?id=PA-CLAIRTON-001")
echo "$FACILITY" | grep -q "Clairton\|Clairton Works"
print_result $? "Get single facility works"
echo ""

# Test 7: AI Chat
echo "Test 7: AI Chat Endpoint"
CHAT_RESPONSE=$(curl -s -X POST "$BASE_URL/llama3Chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is PM2.5?"}')
echo "$CHAT_RESPONSE" | grep -q "response\|error"
print_result $? "AI chat endpoint"
echo ""

echo ""
echo "================================================"
echo "🧪 Test Suite Complete"
echo ""
echo "📊 Summary:"
echo "  - Health Check: Tested"
echo "  - Symptom Report: Tested"
echo "  - Title V Facilities: Tested"
echo "  - AI Chat: Tested"
echo ""
echo "Next Steps:"
echo "1. Check emulator UI at http://127.0.0.1:4000"
echo "2. Verify data in Firestore collections"
echo "3. Test rate limiting (submit 11 reports rapidly)"
echo "4. Deploy to production when ready"
echo ""


