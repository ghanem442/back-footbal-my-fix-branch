# Test Field Details Endpoint
# GET /fields/{id}

$baseUrl = "http://localhost:3000"

Write-Host "=== Testing Field Details Endpoint ===" -ForegroundColor Cyan
Write-Host ""

# First, let's get the list of fields to find a valid field ID
Write-Host "Step 1: Getting list of fields to find a valid ID..." -ForegroundColor Yellow
try {
    $fieldsResponse = Invoke-RestMethod -Uri "$baseUrl/fields" -Method Get -ContentType "application/json"
    
    if ($fieldsResponse.data -and $fieldsResponse.data.Count -gt 0) {
        $firstField = $fieldsResponse.data[0]
        $fieldId = $firstField.id
        Write-Host "Found field ID: $fieldId" -ForegroundColor Green
        Write-Host "Field Name: $($firstField.name)" -ForegroundColor Green
    } else {
        Write-Host "No fields found in the system. Please create a field first." -ForegroundColor Red
        exit
    }
} catch {
    Write-Host "Error getting fields list: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure the server is running on $baseUrl" -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "Step 2: Getting field details for ID: $fieldId" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/fields/$fieldId" -Method Get -ContentType "application/json"
    
    Write-Host "✓ Success!" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Field Details ===" -ForegroundColor Cyan
    Write-Host ""
    
    $field = $response.data
    
    Write-Host "ID: $($field.id)" -ForegroundColor White
    Write-Host "Name: $($field.name)" -ForegroundColor White
    if ($field.nameAr) {
        Write-Host "Name (Arabic): $($field.nameAr)" -ForegroundColor White
    }
    Write-Host ""
    
    Write-Host "Address: $($field.address)" -ForegroundColor White
    if ($field.addressAr) {
        Write-Host "Address (Arabic): $($field.addressAr)" -ForegroundColor White
    }
    Write-Host ""
    
    if ($field.latitude -and $field.longitude) {
        Write-Host "Location: Lat $($field.latitude), Lng $($field.longitude)" -ForegroundColor White
    }
    Write-Host ""
    
    if ($field.averageRating) {
        Write-Host "Rating: $($field.averageRating) ⭐" -ForegroundColor Yellow
        Write-Host "Total Reviews: $($field.totalReviews)" -ForegroundColor White
    } else {
        Write-Host "Rating: No reviews yet" -ForegroundColor Gray
    }
    Write-Host ""
    
    if ($field.description) {
        Write-Host "Description: $($field.description)" -ForegroundColor White
    }
    if ($field.descriptionAr) {
        Write-Host "Description (Arabic): $($field.descriptionAr)" -ForegroundColor White
    }
    Write-Host ""
    
    if ($field.commissionRate) {
        Write-Host "Commission Rate: $($field.commissionRate)%" -ForegroundColor White
    }
    Write-Host ""
    
    # Owner Information
    if ($field.owner) {
        Write-Host "=== Owner Information ===" -ForegroundColor Cyan
        Write-Host "Owner ID: $($field.owner.id)" -ForegroundColor White
        Write-Host "Email: $($field.owner.email)" -ForegroundColor White
        if ($field.owner.phoneNumber) {
            Write-Host "Phone: $($field.owner.phoneNumber)" -ForegroundColor White
        }
        Write-Host ""
    }
    
    # Images
    if ($field.images -and $field.images.Count -gt 0) {
        Write-Host "=== Images ($($field.images.Count)) ===" -ForegroundColor Cyan
        foreach ($image in $field.images) {
            $primaryTag = if ($image.isPrimary) { " [PRIMARY]" } else { "" }
            Write-Host "  - $($image.url)$primaryTag" -ForegroundColor White
        }
        Write-Host ""
    }
    
    Write-Host "Created At: $($field.createdAt)" -ForegroundColor Gray
    Write-Host "Updated At: $($field.updatedAt)" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "=== Full JSON Response ===" -ForegroundColor Cyan
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor Gray
    
} catch {
    Write-Host "✗ Error!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Response Body:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=== Test with Specific Field ID ===" -ForegroundColor Cyan
Write-Host "To test with a specific field ID, run:" -ForegroundColor Yellow
Write-Host "Invoke-RestMethod -Uri '$baseUrl/fields/YOUR_FIELD_ID' -Method Get" -ForegroundColor White
