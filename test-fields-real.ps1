# Test Real Fields Endpoint Response
# This script will call GET /fields and show the actual JSON response

$baseUrl = "http://localhost:3000"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing GET /fields Endpoint" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if endpoint requires authentication
Write-Host "Note: This endpoint requires JWT authentication" -ForegroundColor Yellow
Write-Host "If you get 401, you need to login first" -ForegroundColor Yellow
Write-Host ""

# Test 1: Without Authentication
Write-Host "Test 1: Calling GET /fields WITHOUT token..." -ForegroundColor Yellow
Write-Host "URL: $baseUrl/fields" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/fields" -Method Get -ContentType "application/json"
    
    Write-Host "✓ SUCCESS (200 OK)" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== FULL JSON RESPONSE ===" -ForegroundColor Cyan
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor White
    Write-Host ""
    
    # Analyze the response
    Write-Host "=== RESPONSE ANALYSIS ===" -ForegroundColor Cyan
    Write-Host "Success: $($response.success)" -ForegroundColor White
    Write-Host "Total Fields: $($response.data.Count)" -ForegroundColor White
    Write-Host "Current Page: $($response.meta.page)" -ForegroundColor White
    Write-Host "Total Pages: $($response.meta.totalPages)" -ForegroundColor White
    Write-Host "Total Records: $($response.meta.total)" -ForegroundColor White
    Write-Host ""
    
    if ($response.data.Count -eq 0) {
        Write-Host "⚠ WARNING: data array is EMPTY []" -ForegroundColor Red
        Write-Host "No fields found in database. You need to create fields first." -ForegroundColor Yellow
    } else {
        Write-Host "✓ Found $($response.data.Count) field(s)" -ForegroundColor Green
        Write-Host ""
        Write-Host "=== FIRST FIELD OBJECT ===" -ForegroundColor Cyan
        $firstField = $response.data[0]
        Write-Host ($firstField | ConvertTo-Json -Depth 10) -ForegroundColor White
        Write-Host ""
        
        Write-Host "=== FIELD STRUCTURE ===" -ForegroundColor Cyan
        Write-Host "ID: $($firstField.id)" -ForegroundColor White
        Write-Host "Name: $($firstField.name)" -ForegroundColor White
        if ($firstField.nameAr) {
            Write-Host "Name (Arabic): $($firstField.nameAr)" -ForegroundColor White
        }
        Write-Host "Address: $($firstField.address)" -ForegroundColor White
        if ($firstField.addressAr) {
            Write-Host "Address (Arabic): $($firstField.addressAr)" -ForegroundColor White
        }
        
        if ($firstField.latitude -and $firstField.longitude) {
            Write-Host "Latitude: $($firstField.latitude)" -ForegroundColor White
            Write-Host "Longitude: $($firstField.longitude)" -ForegroundColor White
        }
        
        if ($firstField.averageRating) {
            Write-Host "Average Rating: $($firstField.averageRating)" -ForegroundColor White
        }
        Write-Host "Total Reviews: $($firstField.totalReviews)" -ForegroundColor White
        
        if ($firstField.commissionRate) {
            Write-Host "Commission Rate: $($firstField.commissionRate)%" -ForegroundColor White
        }
        
        Write-Host ""
        Write-Host "=== IMAGES ===" -ForegroundColor Cyan
        if ($firstField.images -and $firstField.images.Count -gt 0) {
            Write-Host "Images Count: $($firstField.images.Count)" -ForegroundColor White
            foreach ($img in $firstField.images) {
                Write-Host "  - URL: $($img.url)" -ForegroundColor White
                Write-Host "    Primary: $($img.isPrimary)" -ForegroundColor Gray
            }
        } else {
            Write-Host "No images" -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "=== OWNER INFO ===" -ForegroundColor Cyan
        if ($firstField.owner) {
            Write-Host "Owner ID: $($firstField.owner.id)" -ForegroundColor White
            Write-Host "Owner Email: $($firstField.owner.email)" -ForegroundColor White
            if ($firstField.owner.phoneNumber) {
                Write-Host "Owner Phone: $($firstField.owner.phoneNumber)" -ForegroundColor White
            }
        }
        
        Write-Host ""
        Write-Host "=== PRICE INFORMATION ===" -ForegroundColor Cyan
        Write-Host "⚠ Note: There is NO 'price_per_hour' or 'basePrice' field in Field model" -ForegroundColor Yellow
        Write-Host "Prices are stored in TimeSlot model (separate table)" -ForegroundColor Yellow
        Write-Host "To get prices, you need to query TimeSlots for this field" -ForegroundColor Yellow
    }
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "✗ ERROR ($statusCode)" -ForegroundColor Red
    Write-Host ""
    
    if ($statusCode -eq 401) {
        Write-Host "=== AUTHENTICATION REQUIRED ===" -ForegroundColor Yellow
        Write-Host "This endpoint requires a valid JWT token" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To test with authentication:" -ForegroundColor Cyan
        Write-Host "1. Login first to get a token:" -ForegroundColor White
        Write-Host '   $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method Post -Body (@{email="user@example.com"; password="password"} | ConvertTo-Json) -ContentType "application/json"' -ForegroundColor Gray
        Write-Host '   $token = $loginResponse.data.accessToken' -ForegroundColor Gray
        Write-Host ""
        Write-Host "2. Then call fields endpoint with token:" -ForegroundColor White
        Write-Host '   $headers = @{Authorization = "Bearer $token"}' -ForegroundColor Gray
        Write-Host '   Invoke-RestMethod -Uri "http://localhost:3000/fields" -Method Get -Headers $headers' -ForegroundColor Gray
    } else {
        Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host ""
            Write-Host "Response Body:" -ForegroundColor Yellow
            Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
