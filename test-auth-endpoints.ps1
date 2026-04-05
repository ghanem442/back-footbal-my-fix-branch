# Test Auth Endpoints Script (PowerShell)
# This script tests the auth endpoints directly

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🧪 Testing Auth Endpoints" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Get Railway URL from environment or use default
$RAILWAY_URL = if ($env:RAILWAY_URL) { $env:RAILWAY_URL } else { "https://your-app.railway.app" }
$BASE_URL = "$RAILWAY_URL/api/v1"

Write-Host "📍 Base URL: $BASE_URL" -ForegroundColor Yellow
Write-Host ""

# Test 1: Register with PLAYER role
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Test 1: Register PLAYER" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

$body1 = @{
    email = "testplayer@example.com"
    password = "Password123!"
    role = "PLAYER"
} | ConvertTo-Json

try {
    $response1 = Invoke-WebRequest -Uri "$BASE_URL/auth/register" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "Accept-Language" = "en"
        } `
        -Body $body1 `
        -UseBasicParsing
    
    Write-Host "Status: $($response1.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Yellow
    $response1.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error:" -ForegroundColor Red
    $_.Exception.Message
    if ($_.ErrorDetails.Message) {
        $_.ErrorDetails.Message | ConvertFrom-Json | ConvertTo-Json -Depth 10
    }
}

Write-Host ""
Write-Host ""

# Test 2: Register with FIELD_OWNER role
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Test 2: Register FIELD_OWNER" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

$body2 = @{
    email = "testowner@example.com"
    password = "Password123!"
    role = "FIELD_OWNER"
} | ConvertTo-Json

try {
    $response2 = Invoke-WebRequest -Uri "$BASE_URL/auth/register" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "Accept-Language" = "en"
        } `
        -Body $body2 `
        -UseBasicParsing
    
    Write-Host "Status: $($response2.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Yellow
    $response2.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error:" -ForegroundColor Red
    $_.Exception.Message
    if ($_.ErrorDetails.Message) {
        $_.ErrorDetails.Message | ConvertFrom-Json | ConvertTo-Json -Depth 10
    }
}

Write-Host ""
Write-Host ""

# Test 3: Login
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Test 3: Login" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

$body3 = @{
    email = "testplayer@example.com"
    password = "Password123!"
} | ConvertTo-Json

try {
    $response3 = Invoke-WebRequest -Uri "$BASE_URL/auth/login" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "Accept-Language" = "en"
        } `
        -Body $body3 `
        -UseBasicParsing
    
    Write-Host "Status: $($response3.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Yellow
    $response3.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error:" -ForegroundColor Red
    $_.Exception.Message
    if ($_.ErrorDetails.Message) {
        $_.ErrorDetails.Message | ConvertFrom-Json | ConvertTo-Json -Depth 10
    }
}

Write-Host ""
Write-Host ""

# Test 4: Register without role (should default to PLAYER)
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Test 4: Register without role" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

$body4 = @{
    email = "testdefault@example.com"
    password = "Password123!"
} | ConvertTo-Json

try {
    $response4 = Invoke-WebRequest -Uri "$BASE_URL/auth/register" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "Accept-Language" = "en"
        } `
        -Body $body4 `
        -UseBasicParsing
    
    Write-Host "Status: $($response4.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Yellow
    $response4.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error:" -ForegroundColor Red
    $_.Exception.Message
    if ($_.ErrorDetails.Message) {
        $_.ErrorDetails.Message | ConvertFrom-Json | ConvertTo-Json -Depth 10
    }
}

Write-Host ""
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ Tests Complete" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
