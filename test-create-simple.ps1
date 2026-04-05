# Simple test for POST /fields

# Step 1: Login
Write-Host "Logging in..." -ForegroundColor Yellow
$login = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" `
    -Method Post `
    -Body (@{email="owner@test.com"; password="Test@123"} | ConvertTo-Json) `
    -ContentType "application/json"

$token = $login.data.accessToken
$userId = $login.data.user.id
Write-Host "Logged in as: $userId" -ForegroundColor Green
Write-Host ""

# Step 2: Create field
Write-Host "Creating field..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$body = @{
    name = "Test Field $(Get-Date -Format 'HHmmss')"
    description = "Test field description"
    address = "123 Test Street, Cairo"
    latitude = 30.0444
    longitude = 31.2357
    basePrice = 450
} | ConvertTo-Json

Write-Host "Request body:" -ForegroundColor Cyan
Write-Host $body
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/fields" `
        -Method Post `
        -Headers $headers `
        -Body $body `
        -ContentType "application/json"
    
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host "  success: $($response.success)"
    Write-Host "  Field ID: $($response.data.id)"
    Write-Host "  Owner ID: $($response.data.ownerId)"
    Write-Host "  Name: $($response.data.name)"
    Write-Host "  Base Price: $($response.data.basePrice)"
    Write-Host ""
    
    if ($response.data.ownerId -eq $userId) {
        Write-Host "✅ Owner ID matches!" -ForegroundColor Green
    } else {
        Write-Host "❌ Owner ID mismatch!" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Full response:" -ForegroundColor Cyan
    Write-Host ($response | ConvertTo-Json -Depth 3)
    
} catch {
    Write-Host "ERROR!" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    }
}
