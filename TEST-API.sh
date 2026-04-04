#!/bin/bash

echo "=== API TESTING SCRIPT ==="

echo "1. Testing Campaigns List..."
curl -s http://localhost:3000/api/campaigns | jq '.' || echo "ERROR: Campaigns API failed"

echo -e "\n2. Testing Create Campaign..."
curl -s -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{"name":"API Test Campaign","description":"API test","status":"active","budget":2000}' | jq '.' || echo "ERROR: Create Campaign failed"

echo -e "\n3. Testing Security Test..."
curl -s http://localhost:3000/api/security-test | jq '.' || echo "ERROR: Security Test failed"

echo -e "\n4. Testing E2E Test..."
curl -s http://localhost:3000/api/e2e-test | jq '.' || echo "ERROR: E2E Test failed"

echo -e "\n=== API TESTING COMPLETE ==="
