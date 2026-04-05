# Admin Endpoints Testing Script
# Make sure to replace YOUR_ADMIN_TOKEN with actual admin JWT token

$baseUrl = "http://localhost:3000"
$token = "YOUR_ADMIN_TOKEN"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Admin Endpoints Testing" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Get Bookings List
Write-Host "1. Testing GET /admin/bookings..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/bookings?page=1&limit=5" `
        -Method GET -Headers $headers
    Write-Host "✓ Success!" -ForegroundColor Green
    Write-Host "Total Bookings: $($response.data.pagination.total)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 2: Get Bookings with Filters
Write-Host "2. Testing GET /admin/bookings with status filter..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/bookings?status=CONFIRMED&limit=3" `
        -Method GET -Headers $headers
    Write-Host "✓ Success!" -ForegroundColor Green
    Write-Host "Confirmed Bookings: $($response.data.pagination.total)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 3: Get Fields List
Write-Host "3. Testing GET /admin/fields..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/fields?page=1&limit=5" `
        -Method GET -Headers $headers
    Write-Host "✓ Success!" -ForegroundColor Green
    Write-Host "Total Fields: $($response.data.pagination.total)" -ForegroundColor White
    if ($response.data.fields.Count -gt 0) {
        Write-Host "First Field: $($response.data.fields[0].name)" -ForegroundColor White
    }
    Write-Host ""
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 4: Get Users with Filters
Write-Host "4. Testing GET /admin/users with filters..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/users?page=1&limit=5&role=PLAYER" `
        -Method GET -Headers $headers
    Write-Host "✓ Success!" -ForegroundColor Green
    Write-Host "Total Players: $($response.data.pagination.total)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 5: Get System Settings
Write-Host "5. Testing GET /admin/system-settings..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/system-settings" `
        -Method GET -Headers $headers
    Write-Host "✓ Success!" -ForegroundColor Green
    Write-Host "Global Commission: $($response.data.globalCommissionPercentage)%" -ForegroundColor White
    Write-Host "Deposit Percentage: $($response.data.depositPercentage)%" -ForegroundColor White
    Write-Host "Cancellation Window: $($response.data.cancellationRefundWindowHours) hours" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 6: Get Wallet Transactions
Write-Host "6. Testing GET /admin/wallet/transactions..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/wallet/transactions?page=1&limit=5" `
        -Method GET -Headers $headers
    Write-Host "✓ Success!" -ForegroundColor Green
    Write-Host "Total Transactions: $($response.data.pagination.total)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 7: Get Dashboard Metrics
Write-Host "7. Testing GET /admin/dashboard..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/dashboard" `
        -Method GET -Headers $headers
    Write-Host "✓ Success!" -ForegroundColor Green
    Write-Host "Active Bookings: $($response.data.activeBookings)" -ForegroundColor White
    Write-Host "Total Users: $($response.data.totalUsers)" -ForegroundColor White
    Write-Host "Total Fields: $($response.data.totalFields)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Testing Complete!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: To test CREATE, UPDATE, DELETE operations, uncomment the sections below" -ForegroundColor Yellow
Write-Host ""

# Uncomment to test CREATE Field
<#
Write-Host "Testing POST /admin/fields..." -ForegroundColor Yellow
$createFieldBody = @{
    ownerId = "REPLACE_WITH_OWNER_UUID"
    name = "Test Stadium"
    nameAr = "ملعب تجريبي"
    address = "Cairo, Egypt"
    addressAr = "القاهرة، مصر"
    latitude = 30.0444
    longitude = 31.2357
    basePrice = 1000
    commissionRate = 10
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/fields" `
        -Method POST -Headers $headers -Body $createFieldBody
    Write-Host "✓ Field Created!" -ForegroundColor Green
    Write-Host "Field ID: $($response.data.id)" -ForegroundColor White
    $createdFieldId = $response.data.id
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
#>

# Uncomment to test UPDATE Field
<#
Write-Host "Testing PATCH /admin/fields/:fieldId..." -ForegroundColor Yellow
$updateFieldBody = @{
    name = "Updated Stadium Name"
    basePrice = 1200
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/fields/$createdFieldId" `
        -Method PATCH -Headers $headers -Body $updateFieldBody
    Write-Host "✓ Field Updated!" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
#>

# Uncomment to test UPDATE System Settings
<#
Write-Host "Testing PATCH /admin/system-settings..." -ForegroundColor Yellow
$updateSettingsBody = @{
    globalCommissionPercentage = 12
    depositPercentage = 25
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/system-settings" `
        -Method PATCH -Headers $headers -Body $updateSettingsBody
    Write-Host "✓ Settings Updated!" -ForegroundColor Green
    Write-Host "New Commission: $($response.data.globalCommissionPercentage)%" -ForegroundColor White
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
#>

# Uncomment to test DELETE Field
<#
Write-Host "Testing DELETE /admin/fields/:fieldId..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/fields/$createdFieldId" `
        -Method DELETE -Headers $headers
    Write-Host "✓ Field Deleted!" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
#>
