#!/bin/bash

# Test Auth Endpoints Script
# This script tests the auth endpoints directly

echo "========================================="
echo "🧪 Testing Auth Endpoints"
echo "========================================="
echo ""

# Get Railway URL from environment or use default
RAILWAY_URL="${RAILWAY_URL:-https://your-app.railway.app}"
BASE_URL="${RAILWAY_URL}/api/v1"

echo "📍 Base URL: $BASE_URL"
echo ""

# Test 1: Register with PLAYER role
echo "========================================="
echo "Test 1: Register PLAYER"
echo "========================================="
curl -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: en" \
  -d '{
    "email": "testplayer@example.com",
    "password": "Password123!",
    "role": "PLAYER"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -v
echo ""
echo ""

# Test 2: Register with FIELD_OWNER role
echo "========================================="
echo "Test 2: Register FIELD_OWNER"
echo "========================================="
curl -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: en" \
  -d '{
    "email": "testowner@example.com",
    "password": "Password123!",
    "role": "FIELD_OWNER"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -v
echo ""
echo ""

# Test 3: Login
echo "========================================="
echo "Test 3: Login"
echo "========================================="
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: en" \
  -d '{
    "email": "testplayer@example.com",
    "password": "Password123!"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -v
echo ""
echo ""

# Test 4: Register without role (should default to PLAYER)
echo "========================================="
echo "Test 4: Register without role"
echo "========================================="
curl -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: en" \
  -d '{
    "email": "testdefault@example.com",
    "password": "Password123!"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -v
echo ""
echo ""

echo "========================================="
echo "✅ Tests Complete"
echo "========================================="
