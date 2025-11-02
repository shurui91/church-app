#!/bin/bash
# Quick API test script
# Usage: ./test-api-quick.sh

BASE_URL="http://localhost:3000"
TEST_PHONE="+1234567890"

echo "=== Testing API Endpoints ===\n"

# 1. Health check
echo "1. Testing /health endpoint..."
curl -s "$BASE_URL/health" | python3 -m json.tool
echo "\n"

# 2. Server info
echo "2. Testing / endpoint..."
curl -s "$BASE_URL/" | python3 -m json.tool
echo "\n"

# 3. Send code (requires user exists in database)
echo "3. Testing /api/auth/send-code..."
echo "Note: Phone number must exist in database (whitelist)"
curl -s -X POST "$BASE_URL/api/auth/send-code" \
  -H "Content-Type: application/json" \
  -d "{\"phoneNumber\": \"$TEST_PHONE\"}" | python3 -m json.tool
echo "\n"

echo "=== Test completed ==="
echo "\nTo test full login flow:"
echo "1. Make sure phone number $TEST_PHONE exists in database"
echo "2. Run: node database/test-models.js (to create test user)"
echo "3. Then test send-code and verify-code endpoints"
