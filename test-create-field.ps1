# Test POST /fields endpoint

$baseUrl = "http://localhost:3000/api/v1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test POST /fields (Create Field)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login as field owner
Write-Host "Step 1: Login as field owner..." -ForegroundColor Yellow

$loginBody = @{
    email = "owner@test.com"
    password = "Test@123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.accessToken
    $userId = $loginResponse.data.user.id
    $userRole = $loginResponse.data.user.role
    
    Write-Host "✓ Login successful!" -ForegroundColor Green
    Write-Host "User ID: $userId" -ForegroundColor Gray
    Write-Host "User Role: $userRole" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host "✗ Login failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Step 2: Create a new field
Write-Host "Step 2: Creating new field..." -ForegroundColor Yellow
Write-Host ""

$headers = @{
    Authorization = "Bearer $token"
}

$timestamp = Get-Date -Format "HHmmss"
$fieldData = @{
    name = "Test Field $timestamp"
    description = "Test field created via API to verify POST /fields endpoint"
    address = "123 Test Street, Cairo, Egypt"
    latitude = 30.0444
    longitude = 31.2357
    basePrice = 450
    commissionRate = 10
} | ConvertTo-Json

Write-Host "Request Body:" -ForegroundColor Cyan
Write-Host $fieldData -ForegroundColor Gray
Write-Host ""

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/fields" -Method Post -Headers $headers -Body $fieldData -ContentType "application/json"
    
    Write-Host "✓ Field created successfully!" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "=== CREATE FIELD RESPONSE ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Success: $($createResponse.success)" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Field Data:" -ForegroundColor Yellow
    Write-Host "  ID: $($createResponse.data.id)" -ForegroundColor White
    Write-Host "  Owner ID: $($createResponse.data.ownerId)" -ForegroundColor White
    Write-Host "  Name: $($createResponse.data.name)" -ForegroundColor White
    Write-Host "  Address: $($createResponse.data.address)" -ForegroundColor White
    Write-Host "  Base Price: $($createResponse.data.basePrice)" -ForegroundColor White
    Write-Host "  Commission Rate: $($createResponse.data.commissionRate)" -ForegroundColor White
    Write-Host "  Latitude: $($createResponse.data.latitude)" -ForegroundColor White
    Write-Host "  Longitude: $($createResponse.data.longitude)" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Message:" -ForegroundColor Yellow
    Write-Host "  EN: $($createResponse.message.en)" -ForegroundColor White
    Write-Host "  AR: $($createResponse.message.ar)" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Timestamp: $($createResponse.timestamp)" -ForegroundColor Gray
    Write-Host ""
    
    # Verify ownerId
    Write-Host "=== VERIFICATION ===" -ForegroundColor Cyan
    if ($createResponse.data.ownerId -eq $userId) {
        Write-Host "✅ ownerId matches logged-in user!" -ForegroundColor Green
        Write-Host "   Logged-in User: $userId" -ForegroundColor Gray
        Write-Host "   Field Owner:    $($createResponse.data.ownerId)" -ForegroundColor Gray
    } else {
        Write-Host "❌ ownerId MISMATCH!" -ForegroundColor Red
        Write-Host "   Expected (from JWT): $userId" -ForegroundColor Yellow
        Write-Host "   Got (in response):   $($createResponse.data.ownerId)" -ForegroundColor Yellow
    }
    Write-Host ""
    
    # Verify basePrice
    if ($createResponse.data.basePrice) {
        Write-Host "✅ basePrice is saved: $($createResponse.data.basePrice)" -ForegroundColor Green
    } else {
        Write-Host "❌ basePrice is NULL!" -ForegroundColor Red
    }
    Write-Host ""
    
    Write-Host "=== FULL JSON RESPONSE ===" -ForegroundColor Cyan
    Write-Host ($createResponse | ConvertTo-Json -Depth 5)
    Write-Host ""
    
    # Step 3: Verify field appears in owner's fields
    Write-Host "Step 3: Verifying field appears in owner's fields..." -ForegroundColor Yellow
    Write-Host ""
    
    $myFieldsResponse = Invoke-RestMethod -Uri "$baseUrl/fields?myFields=true" -Method Get -Headers $headers
    
    $newField = $myFieldsResponse.data | Where-Object { $_.id -eq $createResponse.data.id }
    
    if ($newField) {
        Write-Host "✅ Field found in GET /fields?myFields=true" -ForegroundColor Green
        Write-Host "   Total my fields: $($myFieldsResponse.data.Count)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Field NOT found in owner's fields!" -ForegroundColor Red
        Write-Host "   This means ownerId was not saved correctly" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "✗ Error creating field!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Response Body:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
