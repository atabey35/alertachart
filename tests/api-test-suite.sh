#!/bin/bash

# Premium System API Test Suite
# Tests all premium-related API endpoints

BASE_URL="${BASE_URL:-http://localhost:3000}"
TEST_EMAIL="test@example.com"
TEST_DEVICE_ID="test-device-$(date +%s)"
TEST_PLATFORM="web"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Premium System API Test Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Base URL: $BASE_URL"
echo "Test Device ID: $TEST_DEVICE_ID"
echo ""

# Check if server is running
if ! curl -s --head "$BASE_URL" > /dev/null 2>&1; then
    echo "⚠️  WARNING: Server is not running at $BASE_URL"
    echo "   Please start the development server first:"
    echo "   npm run dev"
    echo ""
    echo "   Then run this test suite again."
    echo ""
    exit 1
fi

echo "✅ Server is running"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Test: $name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} - Status: $http_code"
        echo "Response: $body"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} - Expected: $expected_status, Got: $http_code"
        echo "Response: $body"
        ((FAILED++))
        return 1
    fi
}

# Test 1: User Plan API (Unauthenticated)
echo ""
test_endpoint \
    "User Plan API (Unauthenticated)" \
    "GET" \
    "/api/user/plan" \
    "" \
    "200"

# Test 2: Trial Status API (Unauthenticated - No Device ID)
echo ""
test_endpoint \
    "Trial Status API (No Device ID)" \
    "GET" \
    "/api/subscription/trial-status" \
    "" \
    "400"

# Test 3: Start Trial API (Unauthenticated)
echo ""
test_endpoint \
    "Start Trial API (Unauthenticated)" \
    "POST" \
    "/api/subscription/start-trial" \
    "{\"deviceId\":\"$TEST_DEVICE_ID\",\"platform\":\"$TEST_PLATFORM\"}" \
    "401"

# Test 4: Subscription Webhook (GET - Verification)
echo ""
test_endpoint \
    "Subscription Webhook Verification" \
    "GET" \
    "/api/subscription/webhook" \
    "" \
    "200"

# Test 5: Subscription Webhook (POST - Invalid)
echo ""
test_endpoint \
    "Subscription Webhook (Invalid Payload)" \
    "POST" \
    "/api/subscription/webhook" \
    "{\"invalid\":\"data\"}" \
    "400"

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

