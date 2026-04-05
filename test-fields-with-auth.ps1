# Test Fields Endpoint WITH Authentication
# This will login first, then call GET /fields with token

$baseUrl = "http://localhost:3000"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing GET /fields WITH Authentication" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login to get token
Write-Host "Step 1: Logging in to get access token..." -ForegroundColor Yellow
Write-Host ""

# You need to change these credentials to match your test user
$email = Read-Host "Enter email (or press Enter for default: test@example.com)"
if ([string]::IsNullOrWhiteSpace($email)) {
    $email = "test@example.com"
}

$password = Read-Host "Enter password (or press Enter for default: password123)" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
if ([string]::IsNullOrWhiteSpace($passwordPlain)) {
    $passwordPlain = "password123"
}

Write-Host ""
Write-Host "Attempting login with: $email" -ForegroundColor Gray

try {
    $loginBody = @{
        email = $email
        password = $passwordPlain
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    
    $token = $loginResponse.data.accessToken
    Write-Host "✓ Login successful!" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host "✗ Login failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Please make sure:" -ForegroundColor Yellow
    Write-Host "1. Server is running on $baseUrl" -ForegroundColor White
    Write-Host "2. User exists with correct credentials" -ForegroundColor White
    Write-Host "3. User email is verified (if required)" -ForegroundColor White
    exit
}

# Step 2: Call GET /fields with token
Write-Host "Step 2: Calling GET /fields with authentication..." -ForegroundColor Yellow
Write-Host ""

try {
    $headers = @{
        Authorization = "Bearer $token"
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/fields" -Method Get -Headers $headers -ContentType "application/json"
    
    Write-Host "✓ SUCCESS (200 OK)" -ForegroundColor Green
    Write-Host ""
    
    # Show full response
    Write-Host "=== FULL JSON RESPONSE ===" -ForegroundColor Cyan
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor White
    Write-Host ""
    
    # Analyze response
    Write-Host "=== RESPONSE SUMMARY ===" -ForegroundColor Cyan
    Write-Host "Success: $($response.success)" -ForegroundColor White
    Write-Host "Total Fields in DB: $($response.meta.total)" -ForegroundColor White
    Write-Host "Fields in Current Page: $($response.data.Count)" -ForegroundColor White
    Write-Host "Current Page: $($response.meta.page)" -ForegroundColor White
    Write-Host "Limit per Page: $($response.meta.limit)" -ForegroundColor White
    Write-Host "Total Pages: $($response.meta.totalPages)" -ForegroundColor White
    Write-Host ""
    
    if ($response.data.Count -eq 0) {
        Write-Host "⚠ WARNING: No fields found (data: [])" -ForegroundColor Red
        Write-Host ""
        Write-Host "Possible reasons:" -ForegroundColor Yellow
        Write-Host "1. No fields created yet in the database" -ForegroundColor White
        Write-Host "2. All fields are soft-deleted (deletedAt is not null)" -ForegroundColor White
        Write-Host "3. If using myFields=true, this user has no fields" -ForegroundColor White
        Write-Host ""
        Write-Host "To create a field, use POST /fields endpoint (requires FIELD_OWNER role)" -ForegroundColor Cyan
    } else {
        Write-Host "✓ Found $($response.data.Count) field(s)" -ForegroundColor Green
        Write-Host ""
        
        # Show first field details
        Write-Host "=== FIRST FIELD DETAILS ===" -ForegroundColor Cyan
        $field = $response.data[0]
        
        Write-Host ""
        Write-Host "Basic Info:" -ForegroundColor Yellow
        Write-Host "  ID: $($field.id)" -ForegroundColor White
        Write-Host "  Name: $($field.name)" -ForegroundColor White
        if ($field.nameAr) {
            Write-Host "  Name (AR): $($field.nameAr)" -ForegroundColor White
        }
        Write-Host "  Address: $($field.address)" -ForegroundColor White
        if ($field.addressAr) {
            Write-Host "  Address (AR): $($field.addressAr)" -ForegroundColor White
        }
        
        Write-Host ""
        Write-Host "Location:" -ForegroundColor Yellow
        if ($field.latitude -and $field.longitude) {
            Write-Host "  Latitude: $($field.latitude)" -ForegroundColor White
            Write-Host "  Longitude: $($field.longitude)" -ForegroundColor White
        } else {
            Write-Host "  No coordinates" -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "Rating:" -ForegroundColor Yellow
        if ($field.averageRating) {
            Write-Host "  Average: $($field.averageRating) ⭐" -ForegroundColor White
        } else {
            Write-Host "  Average: Not rated yet" -ForegroundColor Gray
        }
        Write-Host "  Total Reviews: $($field.totalReviews)" -ForegroundColor White
        
        Write-Host ""
        Write-Host "Images:" -ForegroundColor Yellow
        if ($field.images -and $field.images.Count -gt 0) {
            Write-Host "  Count: $($field.images.Count)" -ForegroundColor White
            foreach ($img in $field.images) {
                $primary = if ($img.isPrimary) { " [PRIMARY]" } else { "" }
                Write-Host "  - $($img.url)$primary" -ForegroundColor White
            }
        } else {
            Write-Host "  No images" -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "Owner:" -ForegroundColor Yellow
        if ($field.owner) {
            Write-Host "  ID: $($field.owner.id)" -ForegroundColor White
            Write-Host "  Email: $($field.owner.email)" -ForegroundColor White
            if ($field.owner.phoneNumber) {
                Write-Host "  Phone: $($field.owner.phoneNumber)" -ForegroundColor White
            }
        }
        
        Write-Host ""
        Write-Host "=== IMPORTANT NOTES ===" -ForegroundColor Cyan
        Write-Host "1. There is NO 'price_per_hour' or 'basePrice' field" -ForegroundColor Yellow
        Write-Host "   Prices are in TimeSlot table, not Field table" -ForegroundColor White
        Write-Host ""
        Write-Host "2. To get field with price, you need to:" -ForegroundColor Yellow
        Write-Host "   - Query TimeSlots for this field" -ForegroundColor White
        Write-Host "   - Or use GET /fields/:id endpoint (includes more details)" -ForegroundColor White
        Write-Host ""
        Write-Host "3. Field structure includes:" -ForegroundColor Yellow
        Write-Host "   ✓ id, name, nameAr" -ForegroundColor White
        Write-Host "   ✓ address, addressAr" -ForegroundColor White
        Write-Host "   ✓ latitude, longitude" -ForegroundColor White
        Write-Host "   ✓ averageRating, totalReviews" -ForegroundColor White
        Write-Host "   ✓ images[] (with url, isPrimary)" -ForegroundColor White
        Write-Host "   ✓ owner (id, email, phoneNumber)" -ForegroundColor White
        Write-Host "   ✓ commissionRate" -ForegroundColor White
        Write-Host "   ✗ NO price field (prices in TimeSlot)" -ForegroundColor Red
    }
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "✗ ERROR ($statusCode)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Response:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
