# Create Admin User Script
# This script creates a new admin user in the database

$baseUrl = "http://localhost:3000"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Create Admin User" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Admin credentials
$adminEmail = "admin@fieldbook.com"
$adminPassword = "Admin@123456"
$adminName = "System Admin"

Write-Host "Creating admin user with:" -ForegroundColor Yellow
Write-Host "Email: $adminEmail" -ForegroundColor White
Write-Host "Password: $adminPassword" -ForegroundColor White
Write-Host "Name: $adminName" -ForegroundColor White
Write-Host ""

# Step 1: Register the user
Write-Host "Step 1: Registering user..." -ForegroundColor Yellow
$registerBody = @{
    email = $adminEmail
    password = $adminPassword
    name = $adminName
    role = "ADMIN"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body $registerBody
    
    Write-Host "✓ User registered successfully!" -ForegroundColor Green
    $userId = $registerResponse.data.user.id
    Write-Host "User ID: $userId" -ForegroundColor White
    Write-Host ""
} catch {
    $errorMessage = $_.Exception.Message
    if ($errorMessage -like "*already exists*" -or $errorMessage -like "*duplicate*") {
        Write-Host "⚠ User already exists, trying to login..." -ForegroundColor Yellow
        Write-Host ""
    } else {
        Write-Host "✗ Registration failed: $errorMessage" -ForegroundColor Red
        Write-Host ""
        exit 1
    }
}

# Step 2: Login to get token
Write-Host "Step 2: Logging in..." -ForegroundColor Yellow
$loginBody = @{
    email = $adminEmail
    password = $adminPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body $loginBody
    
    Write-Host "✓ Login successful!" -ForegroundColor Green
    $accessToken = $loginResponse.data.accessToken
    $userId = $loginResponse.data.user.id
    Write-Host ""
} catch {
    Write-Host "✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Note: If the user needs email verification, check the console logs for the verification code" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Step 3: Verify the user has ADMIN role
Write-Host "Step 3: Verifying admin role..." -ForegroundColor Yellow

# Try to access an admin endpoint to verify
$headers = @{
    "Authorization" = "Bearer $accessToken"
}

try {
    $dashboardResponse = Invoke-RestMethod -Uri "$baseUrl/admin/dashboard" `
        -Method GET `
        -Headers $headers
    
    Write-Host "✓ Admin access confirmed!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "✗ Admin access denied!" -ForegroundColor Red
    Write-Host "The user was created but doesn't have ADMIN role." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You need to manually update the database:" -ForegroundColor Yellow
    Write-Host "UPDATE ""User"" SET role = 'ADMIN' WHERE email = '$adminEmail';" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Success!
Write-Host "================================" -ForegroundColor Green
Write-Host "✓ Admin User Created Successfully!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Login Credentials:" -ForegroundColor Cyan
Write-Host "Email: $adminEmail" -ForegroundColor White
Write-Host "Password: $adminPassword" -ForegroundColor White
Write-Host ""
Write-Host "Access Token (save this):" -ForegroundColor Cyan
Write-Host $accessToken -ForegroundColor Yellow
Write-Host ""
Write-Host "You can now use this token to access admin endpoints!" -ForegroundColor Green
Write-Host ""

# Save token to file for easy access
$accessToken | Out-File -FilePath "admin-token.txt" -Encoding UTF8
Write-Host "✓ Token saved to admin-token.txt" -ForegroundColor Green
Write-Host ""

# Test admin endpoints
Write-Host "Testing admin access..." -ForegroundColor Yellow
try {
    $dashboardData = Invoke-RestMethod -Uri "$baseUrl/admin/dashboard" `
        -Method GET `
        -Headers $headers
    
    Write-Host "✓ Dashboard access successful!" -ForegroundColor Green
    Write-Host "Total Users: $($dashboardData.data.totalUsers)" -ForegroundColor White
    Write-Host "Total Fields: $($dashboardData.data.totalFields)" -ForegroundColor White
    Write-Host "Total Bookings: $($dashboardData.data.totalBookings)" -ForegroundColor White
} catch {
    Write-Host "⚠ Could not access dashboard: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Use the token above in your API requests" -ForegroundColor White
Write-Host "2. Or run: .\test-admin-endpoints.ps1" -ForegroundColor White
Write-Host "================================" -ForegroundColor Cyan
