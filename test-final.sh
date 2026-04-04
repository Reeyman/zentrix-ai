#!/bin/bash
echo "=== TESTARE FINALĂ ==="

# Testează API routes
echo "Test hello2:"
curl -s http://localhost:3000/api/hello2 | jq .

echo "Test ping2:"
curl -s http://localhost:3000/api/ping2 | jq .

echo "Test test2:"
curl -s http://localhost:3000/api/test2 | jq .

echo "Test health:"
curl -s http://localhost:3000/api/health | jq .

echo "Test frontend:"
curl -s http://localhost:3000/ | head -10
