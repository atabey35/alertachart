#!/bin/bash

# 🧪 Alerta Chart - API Test Commands
# Backend test etmek için hazır komutlar

echo "🧪 ALERTA CHART - API TEST COMMANDS"
echo "========================================"
echo ""

# Backend URL
BASE_URL="http://localhost:3000"
API_URL="$BASE_URL/api"

# Test device ID
DEVICE_ID="test-device-$(date +%s)"

echo "📝 Device ID: $DEVICE_ID"
echo ""

# 1. Health Check
echo "1️⃣  Health Check"
curl -s $BASE_URL | head -5
echo "✅ Done"
echo ""

# 2. Register Device
echo "2️⃣  Register Device"
curl -X POST "$API_URL/push/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"deviceId\": \"$DEVICE_ID\",
    \"expoPushToken\": \"ExponentPushToken[test-$(date +%s)]\",
    \"platform\": \"ios\",
    \"appVersion\": \"1.0.0\"
  }" | jq '.'
echo "✅ Done"
echo ""

# 3. Create Price Alert
echo "3️⃣  Create Price Alert (BTCUSDT 106,000)"
curl -X POST "$API_URL/alerts/price" \
  -H "Content-Type: application/json" \
  -d "{
    \"deviceId\": \"$DEVICE_ID\",
    \"symbol\": \"BTCUSDT\",
    \"targetPrice\": 106000,
    \"proximityDelta\": 500,
    \"direction\": \"up\"
  }" | jq '.'
echo "✅ Done"
echo ""

# 4. Get Price Alerts
echo "4️⃣  Get All Price Alerts"
curl -s "$API_URL/alerts/price?deviceId=$DEVICE_ID" | jq '.alerts'
echo "✅ Done"
echo ""

# 5. Start Price Service
echo "5️⃣  Start Price Proximity Service"
curl -X POST "$API_URL/push/service/start" | jq '.'
echo "✅ Done"
echo ""

# 6. Check Service Status
echo "6️⃣  Check Service Status"
curl -s "$API_URL/push/service/start" | jq '.'
echo "✅ Done"
echo ""

# 7. Test Push Notification
echo "7️⃣  Send Test Push Notification"
curl -X POST "$API_URL/push/test" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\": \"$DEVICE_ID\"}" | jq '.'
echo "✅ Done"
echo ""

echo "========================================"
echo "🎉 All tests completed!"
echo "Device ID: $DEVICE_ID"
echo ""
echo "📱 Next: Test with mobile app using this device ID"
echo "========================================"
